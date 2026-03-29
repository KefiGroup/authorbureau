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

    // Self-healing: backfill owner_email on books that match by author_id but lack it
    if (userEmail) {
      const missingEmail = uniqueBooks.filter(b => !b.owner_email);
      if (missingEmail.length > 0) {
        const missingIds = missingEmail.map(b => b.id);
        await cloudAdmin
          .from("books")
          .update({ owner_email: userEmail })
          .in("id", missingIds)
          .is("owner_email", null);
        console.log("[list-my-books] Backfilled owner_email on", missingIds.length, "books");
      }
    }

    const bookIds = uniqueBooks.map(b => b.id);

    // Fetch generated_assets for these books (business plans + manuscripts)
    const analyzedBookIds: string[] = [];
    const manuscriptBookIds: string[] = [];
    if (bookIds.length > 0) {
      const { data: assets } = await cloudAdmin
        .from("generated_assets")
        .select("book_id, asset_type")
        .in("book_id", bookIds)
        .in("asset_type", ["business_plan", "source_material"]);

      for (const a of assets || []) {
        if (a.asset_type === "business_plan" && !analyzedBookIds.includes(a.book_id)) {
          analyzedBookIds.push(a.book_id);
        }
        if (a.asset_type === "source_material" && !manuscriptBookIds.includes(a.book_id)) {
          manuscriptBookIds.push(a.book_id);
        }
      }
    }

    // Count products per book — use generated_assets with builder_content_* prefix
    // This is the canonical source since useBuilderGeneration saves here on completion
    const brandBuilders = new Set([
      "workbook", "social-media", "email-flows", "home-study-course", "book-sales",
      "special-editions", "lead-magnet", "webinar", "website",
    ]);
    const buildAuthorityBuilders = new Set([
      "online-course", "audiobook", "podcast", "membership",
      "group-coaching", "affiliate", "upsell-downsell", "revenue-sharing",
      "media-outreach",
    ]);
    // Everything else is yield

    const productCounts: Record<string, number> = {};
    const categoryCounts: Record<string, { brand: number; build: number; yield: number }> = {};

    if (bookIds.length > 0) {
      const { data: builderAssets } = await cloudAdmin
        .from("generated_assets")
        .select("book_id, asset_type")
        .in("book_id", bookIds)
        .like("asset_type", "builder_content_%");

      for (const a of builderAssets || []) {
        const builderId = a.asset_type.replace("builder_content_", "");
        productCounts[a.book_id] = (productCounts[a.book_id] || 0) + 1;

        if (!categoryCounts[a.book_id]) {
          categoryCounts[a.book_id] = { brand: 0, build: 0, yield: 0 };
        }
        if (brandBuilders.has(builderId)) {
          categoryCounts[a.book_id].brand++;
        } else if (buildAuthorityBuilders.has(builderId)) {
          categoryCounts[a.book_id].build++;
        } else {
          categoryCounts[a.book_id].yield++;
        }
      }

      // Also count from dedicated product tables for products that may not have builder_content_ assets
      for (const table of ["courses", "audiobooks", "home_study_courses", "coaching_packages", "podcasts"]) {
        const category = ["coaching_packages"].includes(table) ? "yield" : "brand";
        const { data: rows } = await cloudAdmin
          .from(table)
          .select("book_id")
          .in("book_id", bookIds);
        for (const row of rows || []) {
          if (!row.book_id) continue;
          if (!categoryCounts[row.book_id]) {
            categoryCounts[row.book_id] = { brand: 0, build: 0, yield: 0 };
          }
          const currentTotal = productCounts[row.book_id] || 0;
          const catTotal = categoryCounts[row.book_id].brand + categoryCounts[row.book_id].build + categoryCounts[row.book_id].yield;
          if (currentTotal <= catTotal) {
            // Already counted via generated_assets — skip
          } else {
            categoryCounts[row.book_id][category as "brand" | "yield"]++;
            productCounts[row.book_id] = (productCounts[row.book_id] || 0) + 1;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ books: uniqueBooks, analyzedBookIds, manuscriptBookIds, productCounts, categoryCounts }),
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
