import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

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

    // Resolve user identity using the SAME strategy as list-my-books so that
    // both endpoints converge on the same canonical user_id even when the
    // shared-backend auth API is slow or rotated. Strategy:
    //   1. Cloud admin auth.getUser(token)         (local Cloud auth)
    //   2. Shared backend auth.getUser(token)      (PublishNow auth)
    //   3. JWT claim decode (last-resort safety)
    //   4. Map email -> canonical Cloud user (so books linked by either
    //      auth-system end up reachable).
    let userId: string | null = null;
    let userEmail = "";
    let resolvedVia = "none";

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race<T | null>([
        p,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    // 1) Cloud auth via service role
    try {
      const cloudRes = await withTimeout(cloudAdmin.auth.getUser(token), 3000);
      const cloudUser = (cloudRes as any)?.data?.user;
      if (cloudUser) {
        userId = cloudUser.id;
        userEmail = cloudUser.email || "";
        resolvedVia = "cloud";
      }
    } catch (e) {
      console.warn("[author-stats] cloud auth failed:", (e as Error).message);
    }

    // 2) Shared backend
    if (!userId) {
      try {
        const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
        const sharedRes = await withTimeout(sharedClient.auth.getUser(token), 3000);
        const sharedUser = (sharedRes as any)?.data?.user;
        if (sharedUser) {
          userId = sharedUser.id;
          userEmail = sharedUser.email || "";
          resolvedVia = "shared";
        }
      } catch (e) {
        console.warn("[author-stats] shared auth failed:", (e as Error).message);
      }
    }

    // 3) JWT decode safety net
    if (!userId) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(
            atob(padded + "=".repeat((4 - (padded.length % 4)) % 4))
          );
          if (payload?.sub) {
            userId = payload.sub;
            userEmail = payload.email || userEmail;
            resolvedVia = "jwt-decode";
          }
        }
      } catch (e) {
        console.warn("[author-stats] jwt decode failed:", (e as Error).message);
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Map the resolved email back to the canonical Cloud user, so that
    // sessions issued by the shared backend (different sub) still land on the
    // local user_id that owns the books / author_profile / nodes.
    if (userEmail) {
      try {
        const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
        const localMatch = users?.find(
          (u: any) => u.email?.toLowerCase() === userEmail.toLowerCase()
        );
        if (localMatch && localMatch.id !== userId) {
          console.log(`[author-stats] mapped ${userId} -> ${localMatch.id} via email ${userEmail}`);
          userId = localMatch.id;
          resolvedVia += "+email-map";
        }
      } catch (e) {
        console.warn("[author-stats] email->user map failed:", (e as Error).message);
      }
    }

    console.log(`[author-stats] resolved userId=${userId} email=${userEmail} via=${resolvedVia}`);

    const admin = cloudAdmin;

    // Resolve all author IDs for this person
    const { data: profile } = await admin
      .from("author_profiles")
      .select("pen_name, stripe_onboarding_complete, author_slug, id")
      .eq("user_id", userId)
      .maybeSingle();

    const allUserIds: string[] = [userId];
    if (profile?.pen_name) {
      const { data: siblings } = await admin
        .from("author_profiles")
        .select("user_id")
        .eq("pen_name", profile.pen_name)
        .neq("user_id", userId);
      if (siblings) {
        for (const s of siblings) allUserIds.push(s.user_id);
      }
    }

    // Count books (also fetch created_at to attribute author_nodes to the oldest book)
    const { data: booksByAuthor } = await admin
      .from("books")
      .select("id, published_at, created_at")
      .in("author_id", allUserIds);

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

    // Determine the "primary" book to attribute author-level nodes to (oldest book by created_at).
    // author_nodes has no book_id column, so we attribute the author's nodes to their first/original book.
    const sortedBooks = [...allBooks].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    });
    const primaryBookId: string | null = sortedBooks[0]?.id ?? null;

    // Check analysis status
    const { data: assets } = await admin
      .from("generated_assets")
      .select("book_id")
      .in("author_id", allUserIds)
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

    // Mirror src/lib/node-readiness.ts so the dashboard counter matches the
    // Book Hub "Live vs Building" tile state. A node row may be status='live'
    // but missing required content_json — those must NOT count as built.
    function hasRequiredAssets(nodeId: string, content: any): boolean {
      if (!content || typeof content !== "object") return false;
      switch (nodeId) {
        case "BP-04": {
          const fields = ["hero_headline","hero_subheadline","about_long","about_short","cta_label","lead_magnet_id"];
          const hasField = fields.some((k) => {
            const v = content[k];
            return typeof v === "string" ? v.trim().length > 0 : !!v;
          });
          const hasSections = Array.isArray(content.sections) && content.sections.length > 0;
          return hasField || hasSections;
        }
        case "BA-13": {
          const hasSchedule = Array.isArray(content.sessions) ? content.sessions.length > 0 : !!content.schedule;
          return hasSchedule;
        }
        case "BA-14": {
          const rssReady = !!(content.rss_url || content.rss_feed_url || content?.transistor?.show_id);
          const episodes = Array.isArray(content.episodes) ? content.episodes : [];
          return rssReady && episodes.length > 0;
        }
        case "BA-15": {
          const hasPressRelease = !!(content.press_release || content.press_release_html || content?.assets?.press_release);
          const hasMediaList = Array.isArray(content.media_list)
            ? content.media_list.length > 0
            : Array.isArray(content.outlets) ? content.outlets.length > 0 : false;
          return hasPressRelease && hasMediaList;
        }
        default:
          return Object.keys(content).length > 0;
      }
    }

    // Only count nodes that are truly built (status live + readiness gate).
    const builtNodeIds = new Set<string>();
    const builtRows: Array<{ node_id: string; book_id: string | null }> = [];
    for (const n of (authorNodes || []) as any[]) {
      const isLiveStatus = n.status === "live";
      if (!isLiveStatus) continue;
      if (!hasRequiredAssets(n.node_id, n.content_json)) continue;
      builtNodeIds.add(n.node_id);
      builtRows.push({ node_id: n.node_id, book_id: n.book_id });
    }
    // Also count website as built if author_slug is set
    if (profile?.author_slug) {
      builtNodeIds.add("BP-04");
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

    // Map product table → its corresponding node_id
    const TABLE_TO_NODE: Record<string, string> = {
      courses: "YR-21",
      home_study_courses: "BP-07",
      audiobooks: "BP-09",
      podcasts: "BA-12",
      workbooks: "BP-06",
      coaching_packages: "YR-19",
      email_flows: "BP-01",
      social_media_content: "BP-03",
    };

    // Tables that are author-scoped (no book_id column) — must NOT select book_id
    // or the entire query silently returns null and that table's rows are lost.
    const AUTHOR_SCOPED_TABLES = new Set<string>(["coaching_packages"]);

    for (const table of PRODUCT_TABLES) {
      const isAuthorScoped = AUTHOR_SCOPED_TABLES.has(table);
      const selectCols = isAuthorScoped ? "id, status" : "id, status, book_id";
      const { data: rows } = await admin
        .from(table)
        .select(selectCols)
        .in("author_id", allUserIds);

      const counts: StatusCounts = { draft: 0, ready_for_review: 0, published: 0, total: 0 };
      const nodeIdForTable = TABLE_TO_NODE[table];

      for (const row of rows || []) {
        counts.total++;
        if (row.status === "draft") counts.draft++;
        else if (row.status === "ready_for_review") counts.ready_for_review++;
        else if (row.status === "published" || row.status === "active") counts.published++;

        // Per-book counting — attach this row's node to its specific book.
        // Author-scoped tables (no book_id) attribute to the primary book so they
        // still surface somewhere in the per-book breakdown.
        const bookId = isAuthorScoped ? primaryBookId : (row as any).book_id;
        if (bookId && nodeIdForTable) {
          ensureBookSet(bookId).add(nodeIdForTable);
        }
      }

      perTable[table] = counts;
      totalBuilt += counts.total;
      totalReadyForReview += counts.ready_for_review;
      totalPublished += counts.published;
    }

    // Attribute each *gated-built* author_node to its specific book when book_id is set;
    // fall back to the primary (oldest) book for legacy author-level rows.
    for (const n of builtRows) {
      const bid = n.book_id || primaryBookId;
      if (bid) ensureBookSet(bid).add(n.node_id);
    }
    if (profile?.author_slug && primaryBookId) {
      ensureBookSet(primaryBookId).add("BP-04");
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

    // Bug 3 fix: aggregate totalBuilt from per-book distinct node sets so it
    // includes author_nodes rows (BP/BA/YR), matching the per-book chip totals.
    // Falls back to product-table sum for safety if perBookNodeSets is empty.
    const aggregatedFromNodeSets = Object.values(perBookNodeSets)
      .reduce((sum, set) => sum + set.size, 0);
    if (aggregatedFromNodeSets > 0) {
      totalBuilt = aggregatedFromNodeSets;
    }

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
