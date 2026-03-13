import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA0tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

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
  const { data: profile } = await cloudAdmin
    .from("author_profiles")
    .select("pen_name, user_id")
    .eq("user_id", identity.userId)
    .maybeSingle();

  const allUserIds: string[] = [identity.userId];
  if (profile?.pen_name) {
    const { data: siblings } = await cloudAdmin
      .from("author_profiles")
      .select("user_id")
      .eq("pen_name", profile.pen_name)
      .neq("user_id", identity.userId);
    for (const s of siblings || []) allUserIds.push(s.user_id);
  }
  return allUserIds;
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
    if (action === "list-drafts" || action === "publish-product" || action === "preview-product" || action === "get-product-detail") {
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

      /* ─── LIST DRAFTS ──────────────────────────────────────── */
      if (action === "list-drafts") {
        const allDrafts: any[] = [];

        // 1) Query product tables (courses, home_study_courses, etc.)
        await Promise.all(
          PRODUCT_TABLES.map(async (table) => {
            const { data } = await cloudAdmin
              .from(table)
              .select("id, title, book_id, created_at, status, description, price")
              .in("author_id", allUserIds)
              .in("status", ["draft", "ready_for_review"]);
            for (const item of data || []) {
              // Determine which node this belongs to
              const nodeId = Object.entries(NODE_DB_TABLES).find(([, t]) => t === table)?.[0] || table;
              allDrafts.push({ ...item, table, nodeId });
            }
          })
        );

        // 2) Query generated_assets for builder_draft_* entries (covers all 28 nodes)
        const { data: assetDrafts } = await cloudAdmin
          .from("generated_assets")
          .select("id, book_id, asset_type, content, created_at, updated_at")
          .in("author_id", allUserIds)
          .like("asset_type", "builder_draft_%");

        for (const asset of assetDrafts || []) {
          const draftNodeId = asset.asset_type.replace("builder_draft_", "");
          // Skip if we already have this node from a product table
          const alreadyHas = allDrafts.some(d => d.nodeId === draftNodeId && d.book_id === asset.book_id);
          if (alreadyHas) continue;

          // Parse stored draft to get step progress
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
            created_at: asset.created_at,
            status: editedCount >= 3 ? "ready_for_review" : "draft",
            description: "",
            table: "generated_assets",
            nodeId: draftNodeId,
            stepsCompleted: editedCount,
          });
        }

        // Get book titles
        const bookIds = [...new Set(allDrafts.map(d => d.book_id).filter(Boolean))];
        const titleMap: Record<string, string> = {};
        if (bookIds.length > 0) {
          const { data: books } = await cloudAdmin.from("books").select("id, title").in("id", bookIds);
          for (const b of books || []) titleMap[b.id] = b.title;
        }

        const enriched = allDrafts.map(d => ({
          ...d,
          bookTitle: titleMap[d.book_id] || "Unknown Book",
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
          // Update the asset_type to mark as published
          const { data: asset } = await cloudAdmin
            .from("generated_assets")
            .select("asset_type, content")
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

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateErr } = await cloudAdmin
          .from(table)
          .update({ status: "published" })
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

      return new Response(JSON.stringify({
        draft: parsed
          ? { ...parsed, savedAt: parsed.savedAt || draftRow.updated_at }
          : null,
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

    if (action === "publish_home_study") {
      const payload = (body?.payload || {}) as {
        title?: string;
        description?: string;
        content_markdown?: string;
        duration_days?: number;
        price?: number | null;
        study_schedule_json?: any;
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
        description,
        status: "ready_for_review",
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
