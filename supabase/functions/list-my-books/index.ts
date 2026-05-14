import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUser } from "../_shared/resolve-user.ts";

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

    const { id: userId, email: userEmail, source } = await resolveUser(authHeader);

    if (!userId && !userEmail) {
      console.warn("[list-my-books] identity resolution failed for token");
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[list-my-books] Resolved userId:", userId, "email:", userEmail, "via:", source);

    // CRITICAL: books.author_id is a FK to author_profiles.id, NOT auth.users.id.
    // Resolve the profile id so we don't depend solely on owner_email matching.
    let authorProfileId: string | null = null;
    if (userId) {
      const { data: prof } = await cloudAdmin
        .from("author_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      authorProfileId = (prof as any)?.id ?? null;
    }
    if (!authorProfileId && userEmail) {
      // Last-resort: a session whose auth uid doesn't match any profile but
      // whose email does (e.g. cross-system migration).
      const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
      const localMatch = users?.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase());
      if (localMatch) {
        const { data: prof2 } = await cloudAdmin
          .from("author_profiles")
          .select("id")
          .eq("user_id", localMatch.id)
          .maybeSingle();
        authorProfileId = (prof2 as any)?.id ?? null;
      }
    }
    console.log("[list-my-books] authorProfileId:", authorProfileId);

    // Build ownership filter: author_id (profile OR auth uid for legacy rows) OR owner_email.
    const filterParts: string[] = [];
    if (authorProfileId) filterParts.push(`author_id.eq.${authorProfileId}`);
    if (userId) filterParts.push(`author_id.eq.${userId}`);
    if (userEmail) filterParts.push(`owner_email.eq.${userEmail}`);
    const ownershipFilter = filterParts.join(",");

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
        amazonUrl: "amazon_url", amazonKindleUrl: "amazon_kindle_url", coverImageUrl: "cover_image_url",
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

    // Handle delete action
    if (action === "delete" && bookId) {
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

      // Delete related generated_assets first
      await cloudAdmin
        .from("generated_assets")
        .delete()
        .eq("book_id", bookId);

      // Delete the book
      const { error: deleteError } = await cloudAdmin
        .from("books")
        .delete()
        .eq("id", bookId);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
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
      .select("id, title, subtitle, slug, cover_image_url, published_at, entry_mode, genre, rating, badges, created_at, owner_email, approval_status, rejection_note")
      .or(ownershipFilter)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(JSON.stringify({ error: "Failed to load books. Please try again." }), {
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

    // ---------------------------------------------------------------
    // Count products per book — canonical source is `author_nodes`.
    // Each of the 28 builders writes to author_nodes (status: live |
    // content_ready). The legacy generated_assets "builder_content_*"
    // prefix and the per-product tables (courses, audiobooks, etc.)
    // are kept as a fallback for very old accounts.
    // ---------------------------------------------------------------
    const productCounts: Record<string, number> = {};
    const categoryCounts: Record<string, { brand: number; build: number; yield: number }> = {};
    const liveMicrositeCounts: Record<string, number> = {};
    // Live nodes payload — used by BP-04 "Your Pages" and other surfaces
    // that need a per-book list of live products with microsite URLs.
    const liveNodesByBook: Record<string, { node_id: string; node_name: string | null; microsite_url: string | null; delivery_url: string | null; status: string }[]> = {};

    if (bookIds.length > 0) {
      const { data: nodeRows } = await cloudAdmin
        .from("author_nodes")
        .select("book_id, node_id, node_name, status, microsite_url, delivery_url")
        .in("book_id", bookIds)
        .in("status", ["live", "content_ready"]);

      for (const r of nodeRows || []) {
        if (!r.book_id || !r.node_id) continue;
        productCounts[r.book_id] = (productCounts[r.book_id] || 0) + 1;
        if (!categoryCounts[r.book_id]) categoryCounts[r.book_id] = { brand: 0, build: 0, yield: 0 };
        const prefix = String(r.node_id).slice(0, 2);
        if (prefix === "BP") categoryCounts[r.book_id].brand++;
        else if (prefix === "BA") categoryCounts[r.book_id].build++;
        else if (prefix === "YR") categoryCounts[r.book_id].yield++;

        if (r.status === "live" && r.microsite_url) {
          liveMicrositeCounts[r.book_id] = (liveMicrositeCounts[r.book_id] || 0) + 1;
        }
        if (r.status === "live") {
          if (!liveNodesByBook[r.book_id]) liveNodesByBook[r.book_id] = [];
          liveNodesByBook[r.book_id].push({
            node_id: r.node_id,
            node_name: r.node_name ?? null,
            microsite_url: r.microsite_url ?? null,
            delivery_url: r.delivery_url ?? null,
            status: r.status,
          });
        }
      }

      // ---------- Legacy fallback (generated_assets builder_content_*) ----------
      // Only used when author_nodes returned nothing for a given book.
      const booksWithoutNodes = bookIds.filter(id => !productCounts[id]);
      if (booksWithoutNodes.length > 0) {
        const brandBuilders = new Set([
          "workbook", "social-media", "email-flows", "home-study-course", "book-sales",
          "special-editions", "lead-magnet", "webinar", "website",
        ]);
        const buildAuthorityBuilders = new Set([
          "online-course", "audiobook", "podcast", "membership",
          "group-coaching", "affiliate", "upsell-downsell", "revenue-sharing",
          "media-outreach",
        ]);
        const { data: builderAssets } = await cloudAdmin
          .from("generated_assets")
          .select("book_id, asset_type")
          .in("book_id", booksWithoutNodes)
          .like("asset_type", "builder_content_%");
        for (const a of builderAssets || []) {
          const builderId = a.asset_type.replace("builder_content_", "");
          productCounts[a.book_id] = (productCounts[a.book_id] || 0) + 1;
          if (!categoryCounts[a.book_id]) categoryCounts[a.book_id] = { brand: 0, build: 0, yield: 0 };
          if (brandBuilders.has(builderId)) categoryCounts[a.book_id].brand++;
          else if (buildAuthorityBuilders.has(builderId)) categoryCounts[a.book_id].build++;
          else categoryCounts[a.book_id].yield++;
        }
      }
    }

    return new Response(
      JSON.stringify({ books: uniqueBooks, analyzedBookIds, manuscriptBookIds, productCounts, categoryCounts, liveMicrositeCounts, liveNodesByBook }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
