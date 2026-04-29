import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { book_id } = await req.json().catch(() => ({}));
    if (!book_id) {
      return new Response(JSON.stringify({ error: "Missing book_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Dual-token resolve (Cloud first, then shared backend)
    let userId: string | null = null;
    let userEmail: string | null = null;

    const { data: { user: cloudUser } } = await cloudAdmin.auth.getUser(token);
    if (cloudUser) {
      userId = cloudUser.id;
      userEmail = cloudUser.email ?? null;
    } else {
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (!sharedUser) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userEmail = sharedUser.email ?? null;
      userId = sharedUser.id;
      if (sharedUser.email) {
        const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
        const localMatch = users?.find(
          (u: any) => u.email?.toLowerCase() === sharedUser.email?.toLowerCase()
        );
        if (localMatch) userId = localMatch.id;
      }
    }

    // Verify ownership of book
    const { data: book } = await cloudAdmin
      .from("books")
      .select("id, author_id, owner_email")
      .eq("id", book_id)
      .maybeSingle();

    if (!book) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownsBook =
      book.author_id === userId ||
      (userEmail && book.owner_email && book.owner_email.toLowerCase() === userEmail.toLowerCase());

    if (!ownsBook) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role read of latest source_material
    const { data: asset } = await cloudAdmin
      .from("generated_assets")
      .select("content, updated_at")
      .eq("book_id", book_id)
      .eq("asset_type", "source_material")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({ content: asset?.content ?? null, updated_at: asset?.updated_at ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("get-book-manuscript error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
