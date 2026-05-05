import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await resolveUser(req.headers.get("Authorization"));
    if (!user.id && !user.email) {
      console.log("[get-manuscript-source] resolveUser failed entirely");
      return ok({ success: false, error: "Unauthorized — please sign in again." }, 401);
    }
    console.log("[get-manuscript-source] resolved:", user);

    const { bookId } = await req.json();
    if (!bookId) return ok({ success: false, error: "Missing bookId" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Build candidate author_id set: userId + all author_profiles.id where user_id = userId
    const candidates = new Set<string>();
    if (user.id) candidates.add(user.id);
    if (user.id) {
      const { data: profiles } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id);
      (profiles ?? []).forEach((p: any) => candidates.add(p.id));
    }
    const candidateArr = Array.from(candidates);

    // Verify ownership of the book (author_id in candidates OR owner_email matches)
    const { data: book } = await supabase
      .from("books")
      .select("id, author_id, owner_email, title")
      .eq("id", bookId)
      .maybeSingle();

    if (!book) return ok({ success: false, error: "Book not found." }, 404);

    const ownsByAuthor = !!book.author_id && candidateArr.includes(book.author_id);
    const ownsByEmail =
      !!user.email && !!book.owner_email && book.owner_email.toLowerCase() === user.email.toLowerCase();
    console.log("[get-manuscript-source] Ownership:", { bookId, ownsByAuthor, ownsByEmail });
    if (!ownsByAuthor && !ownsByEmail) {
      return ok({ success: false, error: "Not authorized for this book." }, 403);
    }

    // Find a source_material asset for this book
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
        error: "MANUSCRIPT_MISSING: No manuscript found. Please upload it in your Library before splitting chapters.",
      });
    }

    const content = (match.content as string).trim();
    return ok({ success: true, content, characterCount: content.length });
  } catch (e) {
    console.error("get-manuscript-source error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return ok({ success: false, error: msg }, 500);
  }
});
