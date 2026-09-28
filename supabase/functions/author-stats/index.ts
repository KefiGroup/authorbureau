import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasRequiredAssets } from "../_shared/node-readiness.ts";
import { resolveUser } from "../_shared/resolve-user.ts";
import { countBuiltNodesByBook } from "../_shared/node-counting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product tables and their status field conventions
const PRODUCT_TABLES = [
  "courses",
  "home_study_courses",
  "audiobooks",
  "podcasts",
  "workbooks",
  "coaching_packages",
  "email_flows",
  "social_media_content",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const { id: userId, email: resolvedEmail, source } = await resolveUser(authHeader);
    const userEmail = resolvedEmail || "";

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[author-stats] resolved userId=${userId} email=${userEmail} via=${source}`);

    const admin = cloudAdmin;

    // Resolve all author IDs for this person
    const { data: profile } = await admin
      .from("author_profiles")
      .select("pen_name, stripe_onboarding_complete, author_slug, id")
      .eq("user_id", userId)
      .maybeSingle();

    const allUserIds: string[] = [userId];
    const allAuthorIds: string[] = [];
    if ((profile as any)?.id) allAuthorIds.push((profile as any).id);
    if (profile?.pen_name) {
      const { data: siblings } = await admin
        .from("author_profiles")
        .select("id, user_id")
        .eq("pen_name", profile.pen_name)
        .neq("user_id", userId);
      if (siblings) {
        for (const s of siblings as any[]) {
          if (s.user_id) allUserIds.push(s.user_id);
          if (s.id) allAuthorIds.push(s.id);
        }
      }
    }
    // CRITICAL: books.author_id FKs to author_profiles.id (NOT auth.users.id).
    // Query against the union so legacy rows stamped with auth uids and modern
    // rows stamped with profile ids both resolve.
    const allAuthorRefs = Array.from(new Set([...allUserIds, ...allAuthorIds]));

    // Count books (also fetch created_at to attribute author_nodes to the oldest book)
    const { data: booksByAuthor } = await admin
      .from("books")
      .select("id, published_at, created_at")
      .in("author_id", allAuthorRefs);

    const { data: booksByEmail } = userEmail
      ? await admin.from("books").select("id, published_at, created_at").eq("owner_email", userEmail)
      : { data: [] };

    const { data: booksByName } = profile?.pen_name
      ? await admin.from("books").select("id, published_at, created_at").eq("author_name", profile.pen_name)
      : { data: [] };

    const booksMap = new Map<string, { id: string; published_at: string | null; created_at: string | null }>();
    for (const b of [...(booksByAuthor || []), ...(booksByEmail || []), ...(booksByName || [])]) {
      booksMap.set(b.id, b);
    }
    const allBooks = Array.from(booksMap.values());
    const bookCount = allBooks.length;
    const liveMicrosites = allBooks.filter(b => !!b.published_at).length;
    console.log(`[author-stats] userId=${userId} email=${userEmail} bookCount=${bookCount} (byAuthor=${booksByAuthor?.length ?? 0} byEmail=${booksByEmail?.length ?? 0} byName=${booksByName?.length ?? 0})`);

    // Check analysis status — generated_assets.author_id also FKs to author_profiles.id
    const { data: assets } = await admin
      .from("generated_assets")
      .select("book_id")
      .in("author_id", allAuthorRefs)
      .eq("asset_type", "business_plan");
    const analyzedBookIds = new Set((assets || []).map((a: any) => a.book_id));
    const analyzedCount = analyzedBookIds.size;

    // Count author_nodes (built products tracked outside product tables)
    // author_nodes.author_id references author_profiles.id, NOT auth.users.id
    const allProfileIds: string[] = [];
    if (profile?.id) allProfileIds.push(profile.id);
    // Also check for sibling profiles
    if (profile?.pen_name) {
      const { data: siblingProfiles } = await admin
        .from("author_profiles")
        .select("id")
        .eq("pen_name", profile.pen_name)
        .neq("user_id", userId);
      if (siblingProfiles) {
        for (const sp of siblingProfiles) allProfileIds.push(sp.id);
      }
    }

    const { data: authorNodes } = allProfileIds.length > 0
      ? await admin
          .from("author_nodes")
          .select("node_id, status, book_id, content_json")
          .in("author_id", allProfileIds)
          .in("status", ["content_ready", "live"])
      : { data: [] };

    // hasRequiredAssets is imported from ../_shared/node-readiness.ts
    // — the SAME module used by the frontend hooks. Do not inline a copy here.

    // Only count nodes that are truly built (status live + readiness gate).
    // NOTE: Stripe Express connection is intentionally NOT passed in. Authors
    // Bureau is Merchant of Record — payout setup is admin-side only and
    // never gates Live status.
    const builtNodeIds = new Set<string>();
    const countedRows: Array<{ node_id: string; status: string; book_id: string | null; ready: boolean }> = [];
    for (const n of (authorNodes || []) as any[]) {
      const isLiveStatus = n.status === "live";
      const ready = hasRequiredAssets(n.node_id, n.content_json);
      countedRows.push({ node_id: n.node_id, status: n.status, book_id: n.book_id, ready });
      if (isLiveStatus && ready) builtNodeIds.add(n.node_id);
    }

    // Map node_ids to categories
    const nodesBuilt = { brand: 0, buildAuthority: 0, yield: 0 };
    for (const nodeId of builtNodeIds) {
      if (nodeId.startsWith("BP-")) nodesBuilt.brand++;
      else if (nodeId.startsWith("BA-")) nodesBuilt.buildAuthority++;
      else if (nodeId.startsWith("YR-")) nodesBuilt.yield++;
    }

    // Count products per table per status
    type StatusCounts = { draft: number; ready_for_review: number; published: number; total: number };
    const perTable: Record<string, StatusCounts> = {};
    let totalBuilt = 0; // draft + ready_for_review + published = "built"
    let totalReadyForReview = 0;
    let totalPublished = 0;

    // Per-book structured node tracking. Each book gets a Set of distinct node_ids built.
    type PerBookEntry = { brand: number; build: number; yield: number; total: number; nodeIds: string[] };
    const perBookNodeSets: Record<string, Set<string>> = {};
    const ensureBookSet = (bookId: string) => {
      if (!perBookNodeSets[bookId]) perBookNodeSets[bookId] = new Set();
      return perBookNodeSets[bookId];
    };
    // Initialise an empty set for every known book so each book appears in perBook
    for (const b of allBooks) ensureBookSet(b.id);

    // Tables that are author-scoped (no book_id column) — must NOT select book_id
    // or the entire query silently returns null and that table's rows are lost.
    const AUTHOR_SCOPED_TABLES = new Set<string>(["coaching_packages"]);

    const allBookIds = allBooks.map((b: any) => b.id);

    for (const table of PRODUCT_TABLES) {
      const isAuthorScoped = AUTHOR_SCOPED_TABLES.has(table);
      const selectCols = isAuthorScoped ? "id, status" : "id, status, book_id";
      const { data: rows } = await admin
        .from(table)
        .select(selectCols)
        .in("author_id", allAuthorRefs);

      const counts: StatusCounts = { draft: 0, ready_for_review: 0, published: 0, total: 0 };
      for (const row of rows || []) {
        counts.total++;
        if (row.status === "draft") counts.draft++;
        else if (row.status === "ready_for_review") counts.ready_for_review++;
        else if (row.status === "published" || row.status === "active" || row.status === "live") counts.published++;

        // Product tables remain operational/reporting mirrors. They never
        // contribute to X/28; author_nodes is the sole completion ledger.
      }

      perTable[table] = counts;
      totalBuilt += counts.total;
      totalReadyForReview += counts.ready_for_review;
      totalPublished += counts.published;
    }

    const authoritativeCounts = countBuiltNodesByBook(allBookIds, countedRows);
    for (const [bookId, nodeIds] of Object.entries(authoritativeCounts)) {
      const set = ensureBookSet(bookId);
      for (const nodeId of nodeIds) set.add(nodeId);
    }


    // Materialise structured perBook output with brand/build/yield bucket counts
    const perBook: Record<string, PerBookEntry> = {};
    for (const [bookId, set] of Object.entries(perBookNodeSets)) {
      let brand = 0, build = 0, yld = 0;
      for (const nid of set) {
        if (nid.startsWith("BP-")) brand++;
        else if (nid.startsWith("BA-")) build++;
        else if (nid.startsWith("YR-")) yld++;
      }
      perBook[bookId] = {
        brand,
        build,
        yield: yld,
        total: set.size,
        nodeIds: Array.from(set),
      };
    }

    // Portfolio total is the sum of independently built modules per book.
    // Do not de-duplicate node IDs across books: BP-06 for two books is two
    // genuinely separate products and must count twice in portfolio totals.
    totalBuilt = Object.values(perBook).reduce((sum, entry) => sum + entry.total, 0);

    const result = {
      bookCount,
      liveMicrosites,
      analyzedCount,
      stripeConnected: !!(profile as any)?.stripe_onboarding_complete,
      nodesBuilt,
      products: {
        totalBuilt,
        totalReadyForReview,
        totalPublished,
        perTable,
        perBook,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("author-stats error:", errMessage);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
