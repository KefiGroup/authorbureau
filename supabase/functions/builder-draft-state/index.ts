import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

type DraftPayload = {
  currentStep?: number;
  stepData?: Record<string, unknown>;
  editedSteps?: string[];
  savedAt?: string;
};

/* ── Node → table mapping (matches builderNodeConfig.ts) ─────────── */
const NODE_DB_TABLES: Record<string, string> = {
  "workbook": "generated_assets",
  "social-media": "social_media_content",
  "email-flows": "email_flows",
  "home-study-course": "home_study_courses",
  "book-sales": "generated_assets",
  "lead-magnet": "generated_assets",
  "website": "generated_assets",
  "online-course": "courses",
  "audiobook": "audiobooks",
  "podcast": "podcasts",
  "webinar": "generated_assets",
  "membership": "generated_assets",
  "coaching-1on1": "coaching_packages",
  "group-coaching": "generated_assets",
  "speaking": "generated_assets",
  "corporate-training": "generated_assets",
  "training-programs": "courses",
  "affiliate": "generated_assets",
  "partnerships": "generated_assets",
  "upsell-downsell": "generated_assets",
  "licensing": "generated_assets",
  "community": "generated_assets",
  "retreat": "generated_assets",
  "certification": "generated_assets",
  "mastermind": "generated_assets",
  "big-ticket": "generated_assets",
  "special-editions": "generated_assets",
  "conventions": "generated_assets",
  "fundraising": "generated_assets",
  "exhibitors": "generated_assets",
  "revenue-share": "generated_assets",
  "white-label": "generated_assets",
  "events": "generated_assets",
  "franchise": "generated_assets",
};

/* Tables with their own product records (have status/title columns) */
const PRODUCT_TABLES = ["courses", "home_study_courses", "audiobooks", "podcasts", "social_media_content", "email_flows", "coaching_packages"] as const;

async function resolveIdentity(token: string): Promise<{ userId: string; email: string | null } | null> {
  const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
  const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);

  if (sharedUser) {
    return { userId: sharedUser.id, email: sharedUser.email ?? null };
  }

  const localClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user: localUser } } = await localClient.auth.getUser();

  if (!localUser) return null;
  return { userId: localUser.id, email: localUser.email ?? null };
}

async function resolveAllUserIds(cloudAdmin: any, identity: { userId: string; email: string | null }): Promise<string[]> {
  const allUserIds: string[] = [identity.userId];

  // Primary: look up profile by user_id
  let { data: profile } = await cloudAdmin
    .from("author_profiles")
    .select("pen_name, user_id")
    .eq("user_id", identity.userId)
    .maybeSingle();

  // Fallback: if no profile by user_id, try matching by email through auth.users
  // (handles shared-vs-cloud user id mismatches)
  if (!profile && identity.email) {
    const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
    const match = (users || []).find((u: any) => u.email?.toLowerCase() === identity.email!.toLowerCase());
    if (match) {
      if (!allUserIds.includes(match.id)) allUserIds.push(match.id);
      const { data: emailProfile } = await cloudAdmin
        .from("author_profiles")
        .select("pen_name, user_id")
        .eq("user_id", match.id)
        .maybeSingle();
      profile = emailProfile;
    }
  }

  if (profile?.pen_name) {
    const { data: siblings } = await cloudAdmin
      .from("author_profiles")
      .select("user_id")
      .eq("pen_name", profile.pen_name);
    for (const s of siblings || []) {
      if (!allUserIds.includes(s.user_id)) allUserIds.push(s.user_id);
    }
  }
  console.log("[builder-draft-state] 🔑 resolveAllUserIds →", { input: identity, allUserIds, pen_name: profile?.pen_name });
  return allUserIds;
}

function splitSalesAndContent(markdown: string): { sales: string; content: string } {
  const text = (markdown || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { sales: "", content: "" };

  const stripMarkers = (s: string) =>
    s
      .replace(/={3,}\s*(SALES[_ ]?PAGE[_ ]?START|SALES[_ ]?PAGE[_ ]?END|CONTENT[_ ]?START|CONTENT[_ ]?END)\s*={3,}/gi, "")
      .trim();

  const salesMatch = text.match(/={3,}\s*SALES[_ ]?PAGE[_ ]?START\s*={3,}([\s\S]*?)={3,}\s*SALES[_ ]?PAGE[_ ]?END\s*={3,}/i);
  const contentMatch = text.match(/={3,}\s*CONTENT[_ ]?START\s*={3,}([\s\S]*?)={3,}\s*CONTENT[_ ]?END\s*={3,}/i);
  if (salesMatch?.[1] && contentMatch?.[1]) {
    return { sales: stripMarkers(salesMatch[1]), content: stripMarkers(contentMatch[1]) };
  }

  const salesStart = text.search(/={3,}\s*SALES[_ ]?PAGE[_ ]?START\s*={3,}/i);
  const salesEnd = text.search(/={3,}\s*SALES[_ ]?PAGE[_ ]?END\s*={3,}/i);
  const contentStart = text.search(/={3,}\s*CONTENT[_ ]?START\s*={3,}/i);

  if (salesStart >= 0 && contentStart > salesStart) {
    const sales = stripMarkers(text.slice(salesStart, contentStart));
    const content = stripMarkers(text.slice(contentStart));
    if (sales && content) return { sales, content };
  }

  if (salesStart >= 0 && salesEnd > salesStart) {
    const sales = stripMarkers(text.slice(salesStart, salesEnd));
    const rest = stripMarkers(text.slice(salesEnd));
    if (sales && rest) return { sales, content: rest };
  }

  const salesHeader = text.search(/(^|\n)#{1,6}\s*(sales\s*page|landing\s*page|offer\s*page|marketing\s*copy)\b/i);
  const contentHeader = text.search(/(^|\n)#{1,6}\s*(day\s*1\b|module\s*1\b|lesson\s*1\b|curriculum\b|course\s*content\b)/i);
  if (salesHeader >= 0 && contentHeader > salesHeader) {
    return {
      sales: stripMarkers(text.slice(salesHeader, contentHeader)),
      content: stripMarkers(text.slice(contentHeader)),
    };
  }

  return { sales: "", content: stripMarkers(text) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const bookId = body?.bookId as string | undefined;
    const nodeId = body?.nodeId as string | undefined;

    // ── Actions that don't require bookId/nodeId ──
    if (action === "list-drafts" || action === "publish-product" || action === "preview-product" || action === "get-product-detail" || action === "delete-product") {
      const identity = await resolveIdentity(token);
      if (!identity) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cloudAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const allUserIds = await resolveAllUserIds(cloudAdmin, identity);

      /* ─── LIST DRAFTS (+ live / published node items) ───────── */
      if (action === "list-drafts") {
        const allDrafts: any[] = [];

        // 1) Query product tables (courses, home_study_courses, etc.)
        //    Include published rows too so Review & Publish can show "Published".
        await Promise.all(
          PRODUCT_TABLES.map(async (table) => {
            const { data } = await cloudAdmin
              .from(table)
              .select("id, title, book_id, created_at, status, description, price")
              .in("author_id", allUserIds)
              .in("status", ["draft", "ready_for_review", "published", "live"]);
            for (const item of data || []) {
              const nodeId = Object.entries(NODE_DB_TABLES).find(([, t]) => t === table)?.[0] || table;
              allDrafts.push({ ...item, table, nodeId });
            }
          })
        );

        // 2) Query generated_assets for builder_draft_* entries (covers all 28 nodes)
        const { data: assetDrafts } = await cloudAdmin
          .from("generated_assets")
          .select("id, book_id, asset_type, content, created_at, updated_at, author_id")
          .in("author_id", allUserIds)
          .like("asset_type", "builder_draft_%");

        for (const asset of assetDrafts || []) {
          const draftNodeId = asset.asset_type.replace("builder_draft_", "");
          const alreadyHas = allDrafts.some(d => d.nodeId === draftNodeId && d.book_id === asset.book_id);
          if (alreadyHas) continue;

          let stepData: any = {};
          let currentStep = 0;
          let title = "";
          try {
            const parsed = JSON.parse(asset.content);
            stepData = parsed.stepData || {};
            currentStep = parsed.currentStep || 0;
            title = stepData?.setup?.title || stepData?.foundation?.title || stepData?.model?.title || "";
          } catch { /* ignore */ }

          const editedCount = Object.keys(stepData).length;

          allDrafts.push({
            id: asset.id,
            title: title || `${draftNodeId} Draft`,
            book_id: asset.book_id,
            author_id: asset.author_id,
            created_at: asset.created_at,
            status: editedCount >= 3 ? "ready_for_review" : "draft",
            description: "",
            table: "generated_assets",
            nodeId: draftNodeId,
            stepsCompleted: editedCount,
          });
        }

        // 3) Pull node-backed live / content_ready items from `author_nodes`
        //    using the AUTHOR PROFILE ID (not auth user_id).
        try {
          const { data: profileRows } = await cloudAdmin
            .from("author_profiles")
            .select("id, user_id")
            .in("user_id", allUserIds);
          const profileIds = (profileRows || []).map((p: any) => p.id);

          if (profileIds.length > 0) {
            const { data: nodeRows } = await cloudAdmin
              .from("author_nodes")
              .select("id, node_id, node_name, personalised_name, status, microsite_url, created_at, current_step, content_json, author_id")
              .in("author_id", profileIds)
              .in("status", ["content_ready", "live", "published"])
              .order("created_at", { ascending: false });

            // node_id (e.g. "BP-02") → builder slug used by ALL_BUILDER_NODES (e.g. "lead-magnet")
            const NODE_CODE_TO_SLUG: Record<string, string> = {
              "BP-01": "email-flows",
              "BP-02": "lead-magnet",
              "BP-03": "social-media",
              "BP-04": "website",
              "BP-05": "webinar",
              "BP-06": "workbook",
              "BP-07": "book-sales",
              "BP-08": "audiobook",
              "BP-09": "online-course",
            };

            for (const n of nodeRows || []) {
              const slugId = NODE_CODE_TO_SLUG[n.node_id] || n.node_id;
              // Skip if we already have this node from product table or builder_draft_
              const alreadyHas = allDrafts.some(d => d.nodeId === slugId);
              if (alreadyHas) continue;

              const status =
                n.status === "live" || n.status === "published" ? "published" : "ready_for_review";

              allDrafts.push({
                id: n.id,
                title: n.personalised_name || n.node_name || n.node_id,
                book_id: null,
                author_id: n.author_id,
                created_at: n.created_at,
                status,
                description: n.microsite_url || "",
                table: "author_nodes",
                nodeId: slugId,
                stepsCompleted: n.current_step || 0,
                microsite_url: n.microsite_url || null,
                node_code: n.node_id,
              });
            }
          }
        } catch (e) {
          console.warn("[builder-draft-state] author_nodes lookup failed:", e);
        }

        // Get book titles
        const bookIds = [...new Set(allDrafts.map(d => d.book_id).filter(Boolean))];
        const titleMap: Record<string, string> = {};
        if (bookIds.length > 0) {
          const { data: books } = await cloudAdmin.from("books").select("id, title").in("id", bookIds);
          for (const b of books || []) titleMap[b.id] = b.title;
        }

        // Per-author primary book fallback (first book per author by created_at)
        const authorIds = [...new Set(allDrafts.map(d => d.author_id).filter(Boolean))];
        const authorPrimaryBook: Record<string, { id: string; title: string }> = {};
        if (authorIds.length > 0) {
          const { data: authorBooks } = await cloudAdmin
            .from("books")
            .select("id, title, author_id, created_at")
            .in("author_id", authorIds)
            .order("created_at", { ascending: true });
          for (const b of authorBooks || []) {
            if (!authorPrimaryBook[b.author_id]) {
              authorPrimaryBook[b.author_id] = { id: b.id, title: b.title };
            }
          }
        }

        const enriched = allDrafts.map(d => {
          let bookTitle = titleMap[d.book_id];
          if (!bookTitle && d.author_id && authorPrimaryBook[d.author_id]) {
            bookTitle = authorPrimaryBook[d.author_id].title;
          }
          return { ...d, bookTitle: bookTitle || "" };
        });

        console.log("[builder-draft-state] 📋 list-drafts result:", JSON.stringify({
          allUserIds,
          total: enriched.length,
          by_table: enriched.reduce((acc: any, d: any) => { acc[d.table] = (acc[d.table] || 0) + 1; return acc; }, {}),
        }));

        return new Response(JSON.stringify({ drafts: enriched }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /* ─── PREVIEW PRODUCT ──────────────────────────────────── */
      if (action === "preview-product") {
        const { productId, table, nodeId: previewNodeId, bookId: previewBookId } = body;

        let preview = "";

        // Try to get content from generated_assets builder draft
        if (previewNodeId && previewBookId) {
          const assetType = `builder_draft_${previewNodeId}`;
          const { data: asset } = await cloudAdmin
            .from("generated_assets")
            .select("content")
            .eq("book_id", previewBookId)
            .eq("asset_type", assetType)
            .in("author_id", allUserIds)
            .maybeSingle();

          if (asset?.content) {
            try {
              const parsed = JSON.parse(asset.content);
              const sd = parsed.stepData || {};

              // Build a markdown preview from stepData
              const sections: string[] = [];
              for (const [key, val] of Object.entries(sd)) {
                if (typeof val === "object" && val !== null) {
                  const v = val as Record<string, any>;
                  if (v.title) sections.push(`## ${v.title}`);
                  if (v.description) sections.push(v.description);
                  if (v.content_markdown) sections.push(v.content_markdown);
                  if (v.generatedContent) sections.push(v.generatedContent);
                  if (v.salesPage) sections.push(v.salesPage);
                  // Handle arrays (days, modules, episodes, etc.)
                  if (v.days && Array.isArray(v.days)) {
                    sections.push(`\n**${v.days.length} days** of structured content`);
                    for (const day of v.days.slice(0, 3)) {
                      sections.push(`- **Day ${day.dayNumber || '?'}**: ${day.theme || day.title || 'Content'}`);
                    }
                    if (v.days.length > 3) sections.push(`- ... and ${v.days.length - 3} more days`);
                  }
                  if (v.modules && Array.isArray(v.modules)) {
                    for (const mod of v.modules) {
                      sections.push(`### Module: ${mod.title || 'Untitled'}`);
                      if (mod.lessons) {
                        for (const lesson of mod.lessons) {
                          sections.push(`- ${lesson.title || lesson}`);
                        }
                      }
                    }
                  }
                  if (v.episodes && Array.isArray(v.episodes)) {
                    for (const ep of v.episodes.slice(0, 5)) {
                      sections.push(`- **Episode ${ep.episodeNumber || '?'}**: ${ep.title || 'Untitled'}`);
                    }
                  }
                }
              }
              preview = sections.filter(Boolean).join("\n\n");
            } catch { /* ignore */ }
          }
        }

        // Fallback: get description from product table
        if (!preview && productId && table && table !== "generated_assets") {
          const { data: product } = await cloudAdmin
            .from(table)
            .select("description, title")
            .eq("id", productId)
            .maybeSingle();
          if (product?.description) preview = `## ${product.title || ''}\n\n${product.description}`;
        }

        return new Response(JSON.stringify({ preview: preview || null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /* ─── GET PRODUCT DETAIL (for review view) ─────────────── */
      if (action === "get-product-detail") {
        const { productId, table, nodeId: detailNodeId, bookId: detailBookId } = body;
        const result: Record<string, any> = {};

        // 1) Load from product table (e.g. home_study_courses)
        if (productId && table && table !== "generated_assets") {
          const { data: product } = await cloudAdmin
            .from(table)
            .select("*")
            .eq("id", productId)
            .maybeSingle();
          if (product && allUserIds.includes(product.author_id)) {
            result.product = product;
          }
        }

        // 2) Load draft, content, and sales page from generated_assets
        if (detailNodeId && detailBookId) {
          const draftType = `builder_draft_${detailNodeId}`;
          const contentType = `builder_content_${detailNodeId}`;
          const salesPageType = `builder_sales_page_${detailNodeId}`;
          const { data: assets } = await cloudAdmin
            .from("generated_assets")
            .select("asset_type, content")
            .eq("book_id", detailBookId)
            .in("asset_type", [draftType, contentType, salesPageType])
            .in("author_id", allUserIds);

          for (const asset of assets || []) {
            if (asset.asset_type === draftType) result.draftContent = asset.content;
            if (asset.asset_type === contentType) result.generatedContent = asset.content;
            if (asset.asset_type === salesPageType) result.salesPageContent = asset.content;
          }

          // Backward compatibility: if no separate sales page, try to split from generatedContent
          if (!result.salesPageContent && result.generatedContent) {
            const { sales, content } = splitSalesAndContent(String(result.generatedContent));
            if (sales) {
              result.salesPageContent = sales;
            }
            if (content) {
              result.generatedContent = content;
            }
          }
        }

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /* ─── DELETE PRODUCT ───────────────────────────────────── */
      if (action === "delete-product") {
        const { productId, table, nodeId: deleteNodeId, bookId: deleteBookId } = body;
        if (!productId || !table) {
          return new Response(JSON.stringify({ error: "productId and table required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let resolvedBookId: string | null = deleteBookId || null;
        let resolvedNodeId: string | null = deleteNodeId || null;

        if (table === "generated_assets") {
          const { data: asset } = await cloudAdmin
            .from("generated_assets")
            .select("id, author_id, book_id, asset_type")
            .eq("id", productId)
            .maybeSingle();

          if (!asset || !allUserIds.includes(asset.author_id)) {
            return new Response(JSON.stringify({ error: "Product not found or unauthorized" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          resolvedBookId = resolvedBookId || asset.book_id;
          if (!resolvedNodeId && typeof asset.asset_type === "string" && asset.asset_type.startsWith("builder_draft_")) {
            resolvedNodeId = asset.asset_type.replace("builder_draft_", "");
          }

          const { error: deleteErr } = await cloudAdmin
            .from("generated_assets")
            .delete()
            .eq("id", productId);
          if (deleteErr) throw deleteErr;
        } else {
          const { data: product } = await cloudAdmin
            .from(table)
            .select("id, author_id")
            .eq("id", productId)
            .maybeSingle();

          if (!product || !allUserIds.includes(product.author_id)) {
            return new Response(JSON.stringify({ error: "Product not found or unauthorized" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          resolvedNodeId = resolvedNodeId || Object.entries(NODE_DB_TABLES).find(([, t]) => t === table)?.[0] || null;

          const { error: deleteErr } = await cloudAdmin
            .from(table)
            .delete()
            .eq("id", productId);
          if (deleteErr) throw deleteErr;
        }

        if (resolvedNodeId && resolvedBookId) {
          const { error: cleanupErr } = await cloudAdmin
            .from("generated_assets")
            .delete()
            .eq("book_id", resolvedBookId)
            .in("author_id", allUserIds)
            .in("asset_type", [
              `builder_draft_${resolvedNodeId}`,
              `builder_content_${resolvedNodeId}`,
              `builder_sales_page_${resolvedNodeId}`,
            ]);

          if (cleanupErr) throw cleanupErr;
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /* ─── PUBLISH PRODUCT ──────────────────────────────────── */
      if (action === "publish-product") {
        const { productId, table } = body;
        if (!productId || !table) {
          return new Response(JSON.stringify({ error: "productId and table required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify ownership
        const { data: product } = await cloudAdmin
          .from(table)
          .select("id, author_id")
          .eq("id", productId)
          .maybeSingle();

        if (!product || !allUserIds.includes(product.author_id)) {
          return new Response(JSON.stringify({ error: "Product not found or unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // For generated_assets, there's no "status" column, so we handle differently
        if (table === "generated_assets") {
          const { data: asset } = await cloudAdmin
            .from("generated_assets")
            .select("asset_type, content, book_id, author_id")
            .eq("id", productId)
            .maybeSingle();

          if (asset?.content) {
            try {
              const parsed = JSON.parse(asset.content);
              parsed.status = "published";
              parsed.publishedAt = new Date().toISOString();
              await cloudAdmin
                .from("generated_assets")
                .update({ content: JSON.stringify(parsed) })
                .eq("id", productId);
            } catch { /* ignore */ }
          }

          // If this node maps to a product table, create/update a record there too
          if (asset) {
            const draftNodeId = asset.asset_type?.replace("builder_draft_", "") || "";
            const targetTable = NODE_DB_TABLES[draftNodeId];

            if (targetTable && targetTable !== "generated_assets" && asset.book_id && asset.author_id) {
              // Parse draft data for title, price, description, etc.
              let title = "";
              let price: number | null = null;
              let currency = "USD";
              let description = "";
              let durationDays: number | null = null;
              let contentMarkdown = "";

              try {
                const parsed = JSON.parse(asset.content);
                const sd = parsed.stepData || {};
                title = sd?.setup?.title || sd?.foundation?.title || sd?.model?.title || "Untitled";
                price = sd?.setup?.price ? parseFloat(sd.setup.price) : null;
                currency = sd?.setup?.currency || "USD";
                durationDays = sd?.setup?.duration || null;
              } catch { /* ignore */ }

              // Get sales page content for description
              const { data: salesAsset } = await cloudAdmin
                .from("generated_assets")
                .select("content")
                .eq("book_id", asset.book_id)
                .eq("author_id", asset.author_id)
                .eq("asset_type", `builder_sales_page_${draftNodeId}`)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (salesAsset?.content && salesAsset.content.trim().length > 50) {
                description = salesAsset.content.trim();
              }

              // Get generated content
              const { data: contentAsset } = await cloudAdmin
                .from("generated_assets")
                .select("content")
                .eq("book_id", asset.book_id)
                .eq("author_id", asset.author_id)
                .eq("asset_type", `builder_content_${draftNodeId}`)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (contentAsset?.content) {
                contentMarkdown = contentAsset.content;
              }

              // Check if record already exists
              const { data: existingProduct } = await cloudAdmin
                .from(targetTable)
                .select("id")
                .eq("book_id", asset.book_id)
                .eq("author_id", asset.author_id)
                .maybeSingle();

              if (existingProduct) {
                // Update existing
                const updateData: Record<string, any> = { status: "published" };
                if (title) updateData.title = title;
                if (description) updateData.description = description;
                if (price !== null) updateData.price = price;
                if (contentMarkdown) updateData.content_markdown = contentMarkdown;
                if (durationDays !== null) updateData.duration_days = durationDays;

                await cloudAdmin
                  .from(targetTable)
                  .update(updateData)
                  .eq("id", existingProduct.id);
              } else {
                // Create new record
                const insertData: Record<string, any> = {
                  author_id: asset.author_id,
                  book_id: asset.book_id,
                  title: title || "Untitled",
                  status: "published",
                };
                if (description) insertData.description = description;
                if (price !== null) insertData.price = price;
                if (currency) insertData.currency = currency;
                if (contentMarkdown) insertData.content_markdown = contentMarkdown;
                if (durationDays !== null) insertData.duration_days = durationDays;

                await cloudAdmin
                  .from(targetTable)
                  .insert(insertData);
              }
            }
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Before publishing, inject the sales page content into the product description
        const updatePayload: Record<string, any> = { status: "published" };

        // Look up book_id from the product to find the sales page asset
        const { data: productFull } = await cloudAdmin
          .from(table)
          .select("book_id, author_id")
          .eq("id", productId)
          .maybeSingle();

        if (productFull?.book_id && productFull?.author_id) {
          // Determine the node ID from the table name
          const tableToNode: Record<string, string> = {
            home_study_courses: "home-study-course",
            courses: "online-course",
            coaching_packages: "coaching",
            audiobooks: "audiobook",
            podcasts: "podcast",
          };
          const nodeId = tableToNode[table] || table.replace(/_/g, "-");

          // Look for a saved sales page asset
          const { data: salesAsset } = await cloudAdmin
            .from("generated_assets")
            .select("content")
            .eq("book_id", productFull.book_id)
            .eq("author_id", productFull.author_id)
            .eq("asset_type", `builder_sales_page_${nodeId}`)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (salesAsset?.content && salesAsset.content.trim().length > 50) {
            updatePayload.description = salesAsset.content.trim();
          }
        }

        const { error: updateErr } = await cloudAdmin
          .from(table)
          .update(updatePayload)
          .eq("id", productId);

        if (updateErr) throw updateErr;

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!action || !bookId || !nodeId) {
      return new Response(JSON.stringify({ error: "action, bookId, and nodeId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const identity = await resolveIdentity(token);
    if (!identity) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await cloudAdmin
      .from("author_profiles")
      .select("pen_name")
      .eq("user_id", identity.userId)
      .maybeSingle();

    const allUserIds: string[] = [identity.userId];
    if (profile?.pen_name) {
      const { data: siblingProfiles } = await cloudAdmin
        .from("author_profiles")
        .select("user_id")
        .eq("pen_name", profile.pen_name)
        .neq("user_id", identity.userId);
      for (const sibling of siblingProfiles || []) {
        allUserIds.push(sibling.user_id);
      }
    }

    const { data: book, error: bookError } = await cloudAdmin
      .from("books")
      .select("id, author_id, owner_email, author_name")
      .eq("id", bookId)
      .maybeSingle();

    if (bookError || !book) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasBookAccess =
      allUserIds.includes(book.author_id) ||
      (!!identity.email && !!book.owner_email && identity.email.toLowerCase() === book.owner_email.toLowerCase()) ||
      (!!profile?.pen_name && !!book.author_name && profile.pen_name === book.author_name);

    if (!hasBookAccess) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assetType = `builder_draft_${nodeId}`;

    if (action === "load") {
      const { data: draftRow, error: draftError } = await cloudAdmin
        .from("generated_assets")
        .select("content, updated_at")
        .eq("book_id", bookId)
        .eq("asset_type", assetType)
        .maybeSingle();

      if (draftError) throw draftError;

      if (!draftRow?.content) {
        return new Response(JSON.stringify({ draft: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let parsed: DraftPayload | null = null;
      try {
        parsed = JSON.parse(draftRow.content) as DraftPayload;
      } catch {
        parsed = null;
      }

      let generatedContent: string | null = null;
      if (nodeId === "home-study-course") {
        const { data: contentRow } = await cloudAdmin
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("asset_type", `builder_content_${nodeId}`)
          .maybeSingle();
        generatedContent = contentRow?.content ?? null;
      }

      return new Response(JSON.stringify({
        draft: parsed
          ? { ...parsed, savedAt: parsed.savedAt || draftRow.updated_at }
          : null,
        generatedContent,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const payload = (body?.payload || {}) as DraftPayload;
      const savedAt = new Date().toISOString();
      const content = JSON.stringify({
        currentStep: payload.currentStep ?? 0,
        stepData: payload.stepData ?? {},
        editedSteps: Array.isArray(payload.editedSteps) ? payload.editedSteps : [],
        savedAt,
      });

      const { error: upsertError } = await cloudAdmin
        .from("generated_assets")
        .upsert(
          {
            author_id: book.author_id,
            book_id: bookId,
            asset_type: assetType,
            content,
            updated_at: savedAt,
          },
          { onConflict: "book_id,asset_type" }
        );

      if (upsertError) throw upsertError;

      return new Response(JSON.stringify({ ok: true, savedAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save-sales-page" || action === "save-content") {
      const contentToSave = body?.content as string;
      if (!contentToSave) {
        return new Response(JSON.stringify({ error: "content is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const saveAssetType = action === "save-sales-page"
        ? `builder_sales_page_${nodeId}`
        : `builder_content_${nodeId}`;

      const { error: upsertErr } = await cloudAdmin
        .from("generated_assets")
        .upsert(
          {
            author_id: book.author_id,
            book_id: bookId,
            asset_type: saveAssetType,
            content: contentToSave,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "book_id,asset_type" }
        );

      if (upsertErr) throw upsertErr;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "publish_home_study") {
      const payload = (body?.payload || {}) as {
        title?: string;
        description?: string;
        content_markdown?: string;
        duration_days?: number;
        price?: number | null;
        study_schedule_json?: any;
        sales_copy_json?: any;
      };

      const title = (payload.title || "").trim() || `${bookId} — Home Study Course`;
      const description = typeof payload.description === "string" ? payload.description : "";
      const content_markdown = typeof payload.content_markdown === "string" ? payload.content_markdown : "";
      const duration_days = Number.isFinite(payload.duration_days)
        ? Number(payload.duration_days)
        : 30;
      const parsedPrice = payload.price === null || payload.price === undefined
        ? null
        : Number(payload.price);
      const price = Number.isFinite(parsedPrice as number) ? parsedPrice : null;

      // Parse content_markdown as JSON to extract structured days for study_schedule_json
      let study_schedule_json = payload.study_schedule_json || null;
      if (!study_schedule_json && content_markdown) {
        try {
          const parsed = JSON.parse(content_markdown);
          if (Array.isArray(parsed)) {
            study_schedule_json = { days: parsed };
          }
        } catch { /* not JSON, that's fine */ }
      }

      // Save sales copy JSON as a generated_assets record AND use as description
      let salesCopyJsonStr = "";
      if (payload.sales_copy_json) {
        salesCopyJsonStr = typeof payload.sales_copy_json === "string"
          ? payload.sales_copy_json
          : JSON.stringify(payload.sales_copy_json);
        
        const { error: spErr } = await cloudAdmin
          .from("generated_assets")
          .upsert(
            {
              author_id: book.author_id,
              book_id: bookId,
              asset_type: `builder_sales_page_${nodeId}`,
              content: salesCopyJsonStr,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "book_id,asset_type" }
          );
        if (spErr) {
          console.error("Failed to save sales copy asset:", spErr);
        }
      } else {
        // Try to extract salesCopyData from the draft
        const { data: draftAsset } = await cloudAdmin
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("author_id", book.author_id)
          .eq("asset_type", `builder_draft_${nodeId}`)
          .maybeSingle();
        if (draftAsset?.content) {
          try {
            const draftParsed = JSON.parse(draftAsset.content);
            const scd = draftParsed?.stepData?.setup?.salesCopyData;
            if (scd && typeof scd === "object" && (scd.hero || scd.pricing)) {
              salesCopyJsonStr = JSON.stringify(scd);
              await cloudAdmin
                .from("generated_assets")
                .upsert(
                  {
                    author_id: book.author_id,
                    book_id: bookId,
                    asset_type: `builder_sales_page_${nodeId}`,
                    content: salesCopyJsonStr,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "book_id,asset_type" }
                );
            }
          } catch { /* ignore */ }
        }
      }

      const { data: existing, error: fetchErr } = await cloudAdmin
        .from("home_study_courses")
        .select("id")
        .eq("author_id", book.author_id)
        .eq("book_id", bookId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const productRecord: Record<string, any> = {
        author_id: book.author_id,
        book_id: bookId,
        title,
        description: salesCopyJsonStr || description,
        status: "published",
        content_markdown,
        duration_days,
        price,
      };
      if (study_schedule_json) {
        productRecord.study_schedule_json = study_schedule_json;
      }

      if (existing?.id) {
        const { error: updateErr } = await cloudAdmin
          .from("home_study_courses")
          .update(productRecord)
          .eq("id", existing.id);
        if (updateErr) throw updateErr;

        return new Response(JSON.stringify({ ok: true, id: existing.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: inserted, error: insertErr } = await cloudAdmin
        .from("home_study_courses")
        .insert(productRecord)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("builder-draft-state error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
