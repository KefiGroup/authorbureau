import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveUser(token: string): Promise<{ id: string; email: string } | null> {
  // 1. Try JWT decode FIRST — fastest, works for both backends since both issue Supabase JWTs
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub) {
      const email = payload.email || payload.user_metadata?.email || "";
      console.log("[get-manuscript-source] Resolved via JWT decode:", { sub: payload.sub, email });
      if (email) return { id: payload.sub, email };
    }
  } catch (e) {
    console.log("[get-manuscript-source] JWT decode failed:", e);
  }

  // 2. Try project-local auth
  try {
    const local = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: localUser, error } = await local.auth.getUser(token);
    if (localUser?.user?.id) {
      console.log("[get-manuscript-source] Resolved via local auth:", localUser.user.id);
      return { id: localUser.user.id, email: localUser.user.email ?? "" };
    }
    if (error) console.log("[get-manuscript-source] Local auth error:", error.message);
  } catch (e) {
    console.log("[get-manuscript-source] Local auth threw:", e);
  }

  // 3. Try shared backend with anon key (NOT service role — anon is correct for getUser)
  try {
    const sharedAnon = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    if (sharedAnon) {
      const shared = createClient(SHARED_BACKEND_URL, sharedAnon, { auth: { persistSession: false } });
      const { data: sharedUser, error } = await shared.auth.getUser(token);
      if (sharedUser?.user?.id) {
        console.log("[get-manuscript-source] Resolved via shared backend:", sharedUser.user.id);
        return { id: sharedUser.user.id, email: sharedUser.user.email ?? "" };
      }
      if (error) console.log("[get-manuscript-source] Shared auth error:", error.message);
    }
  } catch (e) {
    console.log("[get-manuscript-source] Shared auth threw:", e);
  }

  console.log("[get-manuscript-source] All resolution methods failed");
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ success: false, error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const user = await resolveUser(token);
    if (!user) return ok({ success: false, error: "Unauthorized" });

    const { bookId } = await req.json();
    if (!bookId) return ok({ success: false, error: "Missing bookId" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Build candidate author_id set: userId + all author_profiles.id where user_id = userId
    const candidates = new Set<string>([user.id]);
    const { data: profiles } = await supabase
      .from("author_profiles")
      .select("id")
      .eq("user_id", user.id);
    (profiles ?? []).forEach((p: any) => candidates.add(p.id));
    const candidateArr = Array.from(candidates);

    // Verify ownership of the book (author_id in candidates OR owner_email matches)
    const { data: book } = await supabase
      .from("books")
      .select("id, author_id, owner_email, title")
      .eq("id", bookId)
      .maybeSingle();

    if (!book) return ok({ success: false, error: "Book not found." });

    const ownsByAuthor = book.author_id && candidateArr.includes(book.author_id);
    const ownsByEmail = book.owner_email && book.owner_email.toLowerCase() === user.email.toLowerCase();
    if (!ownsByAuthor && !ownsByEmail) {
      return ok({ success: false, error: "Not authorized for this book." });
    }

    // Find a source_material asset for this book under any candidate author_id
    const { data: assets } = await supabase
      .from("generated_assets")
      .select("content, author_id, created_at")
      .eq("book_id", bookId)
      .eq("asset_type", "source_material")
      .order("created_at", { ascending: false });

    const match = (assets ?? []).find((a: any) => {
      const c = (a?.content ?? "").trim();
      return c.length > 0 && (candidateArr.includes(a.author_id) || ownsByEmail);
    });

    if (!match) {
      return ok({
        success: false,
        error: "No manuscript found. Please upload it in the Book Hub.",
      });
    }

    const content = (match.content as string).trim();
    return ok({ success: true, content, characterCount: content.length });
  } catch (e) {
    console.error("get-manuscript-source error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return ok({ success: false, error: msg });
  }
});
