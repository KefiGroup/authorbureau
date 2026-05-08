import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { resolveAuthorId } from "../_shared/resolve-author-id.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all newsletter signups for this author's books
    const { data: books } = await supabase
      .from("books")
      .select("id, title")
      .eq("author_id", authorId);

    if (!books || books.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "No books found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bookIds = books.map((b: any) => b.id);
    const bookTitleMap: Record<string, string> = {};
    books.forEach((b: any) => { bookTitleMap[b.id] = b.title; });

    const { data: signups } = await supabase
      .from("newsletter_signups")
      .select("email, book_id, created_at")
      .in("book_id", bookIds)
      .order("created_at", { ascending: true });

    if (!signups || signups.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "No newsletter signups to sync" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let synced = 0;
    let skipped = 0;

    for (const signup of signups) {
      const bookTitle = bookTitleMap[signup.book_id] || "Unknown Book";

      const { error } = await supabase
        .from("author_subscribers")
        .upsert(
          {
            author_id: authorId,
            email: signup.email.toLowerCase().trim(),
            source: "newsletter",
            source_detail: bookTitle,
            subscribed_at: signup.created_at,
          },
          { onConflict: "author_id,email" }
        );

      if (error) {
        console.error(`Failed to sync ${signup.email}:`, error.message);
        skipped++;
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, skipped, total: signups.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sync-subscribers error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
