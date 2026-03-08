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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve user ID and email
    let userId: string;
    let userEmail: string | null = null;

    // Try Cloud auth first
    const { data: { user: cloudUser } } = await cloudAdmin.auth.getUser(token);
    if (cloudUser) {
      userId = cloudUser.id;
      userEmail = cloudUser.email ?? null;
    } else {
      // Fallback: try shared backend (for SSO sessions)
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (!sharedUser) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = sharedUser.id;
      userEmail = sharedUser.email ?? null;

      // For shared backend users, find their Cloud user ID by email
      if (sharedUser.email) {
        const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
        const localMatch = users?.find(
          (u: any) => u.email?.toLowerCase() === sharedUser.email?.toLowerCase()
        );
        if (localMatch) userId = localMatch.id;
      }
    }

    console.log("[list-my-books] Resolved userId:", userId, "email:", userEmail);

    // Build ownership filter: author_id matches OR owner_email matches
    const ownershipFilter = userEmail
      ? `author_id.eq.${userId},owner_email.eq.${userEmail}`
      : `author_id.eq.${userId}`;

    // Parse request body for action
    let action = "list";
    let bookId: string | null = null;
    let bodyData: any = {};
    try {
      bodyData = await req.json();
      action = bodyData.action || "list";
      bookId = bodyData.bookId || null;
    } catch {
      // No body or invalid JSON — default to list
    }

    // Handle get single book (for editing)
    if (action === "get" && bookId) {
      const { data: book, error: getError } = await cloudAdmin
        .from("books")
        .select("*")
        .eq("id", bookId)
        .or(ownershipFilter)
        .single();

      if (getError || !book) {
        return new Response(JSON.stringify({ error: "Book not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ book }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle update action
    if (action === "update" && bookId) {
      // First verify ownership
      const { data: owned } = await cloudAdmin
        .from("books")
        .select("id")
        .eq("id", bookId)
        .or(ownershipFilter)
        .maybeSingle();

      if (!owned) {
        return new Response(JSON.stringify({ error: "Book not found or not owned" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, any> = {};
      const fieldMap: Record<string, string> = {
        title: "title", subtitle: "subtitle", description: "description",
        pages: "pages", rating: "rating", genre: "genre", badges: "badges",
        price: "price", currency: "currency",
        kindlePrice: "kindle_price", paperbackPrice: "paperback_price",
        amazonUrl: "amazon_url", coverImageUrl: "cover_image_url",
        bestsellerProofUrl: "bestseller_proof_url",
      };

      for (const [clientKey, dbKey] of Object.entries(fieldMap)) {
        if (bodyData[clientKey] !== undefined) {
          updateData[dbKey] = bodyData[clientKey];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: "No fields to update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await cloudAdmin
        .from("books")
        .update(updateData)
        .eq("id", bookId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle submit-for-review action (author submits book for admin approval)
    if (action === "submit-for-review" && bookId) {
      const { data: owned } = await cloudAdmin
        .from("books")
        .select("id")
        .eq("id", bookId)
        .or(ownershipFilter)
        .maybeSingle();

      if (!owned) {
        return new Response(JSON.stringify({ error: "Book not found or not owned" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as submitted for review (published_at stays null; admin will set it)
      // We use updated_at as the submission timestamp
      const { error: submitError } = await cloudAdmin
        .from("books")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", bookId);

      if (submitError) {
        return new Response(JSON.stringify({ error: submitError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: list books
    const { data: books, error: queryError } = await cloudAdmin
      .from("books")
      .select("id, title, subtitle, slug, cover_image_url, published_at, entry_mode, genre, rating, badges, created_at, owner_email")
      .or(ownershipFilter)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate (a book could match both author_id and owner_email)
    const seen = new Set<string>();
    const uniqueBooks = (books || []).filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    return new Response(
      JSON.stringify({ books: uniqueBooks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
