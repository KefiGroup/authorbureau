import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

type Action = "load" | "save" | "repair_calendar";
type NextStatus = "content_ready" | "live";

const PLATFORMS = ["linkedin", "instagram", "facebook", "twitter"] as const;

const ARCHETYPES = ["Quote", "Lesson", "Question", "Story", "Framework", "Proof"] as const;
const ARCHETYPE_SET = new Set<string>(ARCHETYPES as readonly string[]);
// Must mirror generate-bp03-social-media so legacy/repaired data labels correctly.
function archetypeForDay(day: number): string {
  const d = Math.max(1, Number(day) || 1);
  return ARCHETYPES[(d - 1) % ARCHETYPES.length];
}
const CAROUSEL_IG_DAYS = new Set([3, 6, 9, 12, 15, 18]);

// Synthesize 5 carousel slides from a caption when AI didn't comply.
function synthesizeCarouselSlides(caption: string, archetype: string): Array<{ headline: string; body: string }> {
  const lines = (caption || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentences = (caption || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pool = lines.length >= 4 ? lines : sentences;
  const cover = (pool[0] || archetype || "Read this").slice(0, 60);
  const insights = [pool[1], pool[2], pool[3]].map((s, i) =>
    (s || `Key insight ${i + 1}`).slice(0, 200),
  );
  const cta = (pool[pool.length - 1] || "Grab the book to go deeper.").slice(0, 200);
  return [
    { headline: cover, body: archetype ? `${archetype} from the book.` : "From the book." },
    { headline: "Insight 1", body: insights[0] },
    { headline: "Insight 2", body: insights[1] },
    { headline: "Insight 3", body: insights[2] },
    { headline: "Get the book", body: cta },
  ];
}

function flattenPosts(content: any): Array<{
  index: number;
  day: number;
  platform: string;
  caption: string;
  hashtags: string[];
  post_type: string;
  archetype: string | null;
  carousel_slides: any;
}> {
  const days: any[] = Array.isArray(content?.posts) ? content.posts : [];
  const flat: any[] = [];
  let idx = 0;
  let dayCounter = 0;
  for (const d of days) {
    dayCounter++;
    // Day index from data when present, else fall back to position.
    const dayNum = Number(d?.day) || dayCounter;
    // Deterministic archetype rotation. We trust the day index, not whatever
    // the AI happened to write (legacy data often returns "Insight").
    const archetype = ARCHETYPE_SET.has(d?.post_type) ? d.post_type : archetypeForDay(dayNum);
    for (const platform of PLATFORMS) {
      const p = d?.[platform];
      if (!p?.caption) continue;
      let caption: string = p.caption;

      // Carousel resolution for Instagram: trust AI when it complied, else
      // synthesize 5 slides on every designated carousel day so we always
      // ship 6 carousels regardless of model compliance.
      // Sprint 63: every Instagram post is a carousel. We synthesize 5 slides
      // from the caption whenever the AI didn't produce a compliant set, so
      // there are no longer "0 carousels" gaps when content_json is short.
      let carouselSlides: any = null;
      if (platform === "instagram") {
        const aiCompliant =
          p.format === "carousel" &&
          Array.isArray(p.carousel_slides) &&
          p.carousel_slides.length === 5;
        if (aiCompliant) {
          carouselSlides = p.carousel_slides;
        } else {
          carouselSlides = synthesizeCarouselSlides(caption, archetype);
        }
        if (carouselSlides) {
          const slidesBlock = (carouselSlides as Array<any>)
            .map((s: any, i: number) => `Slide ${i + 1} — ${s?.headline || ""}\n${s?.body || ""}`.trim())
            .join("\n\n");
          caption = `${caption}\n\n— Carousel script (5 slides) —\n\n${slidesBlock}`;
        }
      }

      flat.push({
        index: idx++,
        day: dayNum,
        platform,
        caption,
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        post_type: archetype,
        archetype,
        carousel_slides: carouselSlides,
      });
    }
  }
  return flat;
}

async function rebuildSocialPosts(
  cloudAdmin: ReturnType<typeof createClient>,
  authorId: string,
  content: any,
  bookId: string | null = null,
): Promise<number> {
  const flat = flattenPosts(content);
  if (flat.length === 0) return 0;

  // Idempotent: wipe previous BP-03 draft/ready posts that the author has not yet posted.
  // Posts already marked posted are preserved for the "X of Y posted" counter.
  // Sprint 64 — book-scoped: only wipe rows for the same (author_id, book_id)
  // so other books' calendars stay intact.
  let deleteQuery = cloudAdmin
    .from("social_posts")
    .delete()
    .eq("author_id", authorId)
    .eq("node_id", "BP-03")
    .in("status", ["draft", "ready"]);
  if (bookId) {
    deleteQuery = deleteQuery.eq("book_id", bookId);
  } else {
    deleteQuery = deleteQuery.is("book_id", null);
  }
  const { error: delErr } = await deleteQuery;
  if (delErr) throw delErr;

  // Author-driven scheduling: every newly-generated post starts as an Unscheduled draft.
  // The author picks a date+time per post (or "Post Now") from the Social Calendar UI.
  const rows = flat.map((p) => ({
    author_id: authorId,
    book_id: bookId,
    node_id: "BP-03",
    platform: p.platform,
    content: [p.caption, p.hashtags.length ? p.hashtags.map((h: string) => `#${h}`).join(" ") : ""]
      .filter(Boolean)
      .join("\n\n"),
    scheduled_at: null as string | null,
    status: "draft",
    post_index: p.index,
    post_type: p.post_type,
    archetype: p.archetype,
    carousel_slides: p.carousel_slides,
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await cloudAdmin.from("social_posts").insert(batch);
    if (error) throw error;
  }
  return rows.length;
}

function respond(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hasUsableSocialKit(value: any) {
  return !!value && (
    (Array.isArray(value.posts) && value.posts.length > 0) ||
    (Array.isArray(value.outreach_kit) && value.outreach_kit.length > 0) ||
    value.source === "BP-02"
  );
}

function normalizeNode(node: any) {
  if (!node) return null;

  const rawContent = node.content_json && typeof node.content_json === "object"
    ? node.content_json as Record<string, unknown>
    : {};

  let currentStep = Number((rawContent as any)?._currentStep ?? node.current_step ?? 0);
  if (node.status === "live") {
    currentStep = Math.max(currentStep, 3);
  } else if (node.status === "content_ready" && hasUsableSocialKit(rawContent)) {
    currentStep = Math.max(currentStep, 2);
  } else if (node.status === "generating") {
    currentStep = Math.max(currentStep, 1);
  }

  return {
    ...node,
    current_step: currentStep,
    content_json: {
      ...rawContent,
      _currentStep: currentStep,
      publishStatus: node.status,
    },
  };
}

async function resolveIdentity(token: string): Promise<{ userId: string; email: string | null } | null> {
  try {
    const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.id) {
      return { userId: sharedUser.user.id, email: sharedUser.user.email ?? null };
    }
  } catch (_error) {
    // Fall through to Cloud auth below.
  }

  try {
    const localClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: localUser } = await localClient.auth.getUser(token);
    if (localUser?.user?.id) {
      return { userId: localUser.user.id, email: localUser.user.email ?? null };
    }
  } catch (_error) {
    // No-op.
  }

  return null;
}

async function resolveAuthorProfile(
  cloudAdmin: ReturnType<typeof createClient>,
  identity: { userId: string; email: string | null },
  requestedAuthorId?: string,
) {
  if (requestedAuthorId) {
    const { data: requestedProfile, error } = await cloudAdmin
      .from("author_profiles")
      .select("id, pen_name, author_slug, user_id")
      .eq("id", requestedAuthorId)
      .maybeSingle();

    if (error) throw error;
    if (requestedProfile) {
      // Allow if user_id matches OR if email matches the cloud auth user behind the profile
      if (requestedProfile.user_id === identity.userId) return requestedProfile;
      if (identity.email) {
        const { data: cloudAuthUser } = await cloudAdmin.auth.admin.getUserById(requestedProfile.user_id);
        if (cloudAuthUser?.user?.email?.toLowerCase() === identity.email.toLowerCase()) {
          return requestedProfile;
        }
      }
      return null;
    }
    return null;
  }

  // Try direct user_id match first
  const { data: profile, error } = await cloudAdmin
    .from("author_profiles")
    .select("id, pen_name, author_slug, user_id")
    .eq("user_id", identity.userId)
    .maybeSingle();

  if (error) throw error;
  if (profile) return profile;

  // Fallback: resolve via email — find cloud auth user by email, then match profile
  if (identity.email) {
    const { data: usersList } = await cloudAdmin.auth.admin.listUsers();
    const match = usersList?.users?.find(
      (u: any) => u.email?.toLowerCase() === identity.email!.toLowerCase(),
    );
    if (match?.id) {
      const { data: emailProfile } = await cloudAdmin
        .from("author_profiles")
        .select("id, pen_name, author_slug, user_id")
        .eq("user_id", match.id)
        .maybeSingle();
      if (emailProfile) return emailProfile;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return respond({ success: false, error: "No auth token provided." });
    }

    const identity = await resolveIdentity(token);
    if (!identity) {
      return respond({ success: false, error: "Invalid session. Please sign in again." });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action | undefined;
    const requestedAuthorId = body?.author_id as string | undefined;
    const requestedBookId = (body?.book_id as string | undefined) ?? null;

    if (!action) {
      return respond({ success: false, error: "Action is required." });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authorProfile = await resolveAuthorProfile(cloudAdmin, identity, requestedAuthorId);
    if (!authorProfile) {
      return respond({ success: false, error: "Unable to locate your author profile." });
    }

    if (action === "load") {
      // Per-book resolution mirrors BP-06/07. If a bookId is in scope, prefer
      // (author_id, book_id) -> books.title, only falling back to "latest" when
      // no bookId was passed.
      let bookTitle = "";
      if (requestedBookId) {
        const { data: ctx } = await cloudAdmin
          .from("author_context")
          .select("book_title")
          .eq("author_id", authorProfile.id)
          .eq("book_id", requestedBookId)
          .maybeSingle();
        bookTitle = ctx?.book_title || "";
        if (!bookTitle) {
          const { data: book } = await cloudAdmin
            .from("books")
            .select("title")
            .eq("id", requestedBookId)
            .maybeSingle();
          bookTitle = book?.title || "";
        }
      } else {
        const { data: ctx } = await cloudAdmin
          .from("author_context")
          .select("book_title")
          .eq("author_id", authorProfile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        bookTitle = ctx?.book_title || "";
        if (!bookTitle) {
          // FK: books.author_id → author_profiles.id (NOT auth.users.id).
          // Using authorProfile.user_id silently returned zero rows whenever
          // user_id != author_profiles.id, which is now the standard case.
          const { data: book } = await cloudAdmin
            .from("books")
            .select("title")
            .eq("author_id", authorProfile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          bookTitle = book?.title || "";
        }
      }

      let nodeQuery = cloudAdmin
        .from("author_nodes")
        .select("id, status, current_step, activated_at, content_json")
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03");
      if (requestedBookId) nodeQuery = nodeQuery.eq("book_id", requestedBookId);
      const { data: node, error: nodeError } = await nodeQuery.maybeSingle();

      if (nodeError) throw nodeError;

      return respond({
        success: true,
        profile: authorProfile,
        book_title: bookTitle,
        has_context: Boolean(bookTitle),
        node: normalizeNode(node),
      });
    }

    if (action === "repair_calendar") {
      // Idempotently rebuild social_posts from saved node content_json
      let existingNodeQuery = cloudAdmin
        .from("author_nodes")
        .select("id, status, activated_at, current_step, content_json, book_id")
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03");
      if (requestedBookId) existingNodeQuery = existingNodeQuery.eq("book_id", requestedBookId);
      const { data: existingNode, error: existingNodeError } = await existingNodeQuery.maybeSingle();
      if (existingNodeError) throw existingNodeError;

      const cj: any = existingNode?.content_json || null;
      if (!hasUsableSocialKit(cj)) {
        return respond({
          success: false,
          error: "No saved social media kit found. Please open BP-03 and generate it first.",
        });
      }

      const saved = await rebuildSocialPosts(cloudAdmin, authorProfile.id, cj, requestedBookId);

      // Promote node to live if it's not already, so Marketing Hub treats it as active
      if (existingNode && existingNode.status !== "live") {
        await cloudAdmin
          .from("author_nodes")
          .update({
            status: "live",
            current_step: 3,
            activated_at: existingNode.activated_at || new Date().toISOString(),
            content_json: { ...cj, _currentStep: 3, publishStatus: "live" },
          })
          .eq("id", existingNode.id);
      }

      return respond({ success: true, saved, node: normalizeNode(existingNode) });
    }

    if (action === "auto_repair_if_stale") {
      // Sniff for stale rows (legacy data with archetype=NULL or post_type='Insight').
      // If found, rebuild from content_json so the deterministic archetype rotation
      // and IG carousel synthesis from flattenPosts() take effect.
      // Sprint 63: also treat any Instagram row missing carousel_slides as stale.
      // Sprint 64 — book-scope the stale probe so a stale row on another
      // book can't trigger a rebuild scoped to the current book.
      let stalePostsQuery = cloudAdmin
        .from("social_posts")
        .select("id, archetype, post_type, platform, carousel_slides", { count: "exact", head: false })
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03")
        .or("archetype.is.null,post_type.eq.Insight,and(platform.eq.instagram,carousel_slides.is.null)")
        .limit(1);
      if (requestedBookId) {
        stalePostsQuery = stalePostsQuery.eq("book_id", requestedBookId);
      } else {
        stalePostsQuery = stalePostsQuery.is("book_id", null);
      }
      const { data: staleProbe } = await stalePostsQuery;
      const isStale = Array.isArray(staleProbe) && staleProbe.length > 0;
      if (!isStale) {
        return respond({ success: true, repaired: false, count: 0 });
      }

      let nodeQ = cloudAdmin
        .from("author_nodes")
        .select("id, content_json, book_id")
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03");
      if (requestedBookId) nodeQ = nodeQ.eq("book_id", requestedBookId);
      const { data: existingNode } = await nodeQ.maybeSingle();
      const cj: any = existingNode?.content_json || null;
      if (!hasUsableSocialKit(cj)) {
        return respond({ success: true, repaired: false, count: 0 });
      }
      const saved = await rebuildSocialPosts(cloudAdmin, authorProfile.id, cj, requestedBookId);
      return respond({ success: true, repaired: true, count: saved });
    }

    if (action !== "save") {
      return respond({ success: false, error: "Unsupported action." });
    }

    const nextStatus = body?.status as NextStatus | undefined;
    const content = body?.content;
    if (!nextStatus || !["content_ready", "live"].includes(nextStatus)) {
      return respond({ success: false, error: "A valid save status is required." });
    }

    if (!hasUsableSocialKit(content)) {
      return respond({ success: false, error: "Generate your starter kit before saving it." });
    }

    const targetStep = nextStatus === "live" ? 3 : 2;
    const payload = {
      status: nextStatus,
      current_step: targetStep,
      content_json: {
        ...(content || {}),
        _currentStep: targetStep,
        publishStatus: nextStatus,
      },
      personalised_name: content?.calendar_name || "Social Media Starter Kit",
      ...(nextStatus === "live" ? { activated_at: new Date().toISOString() } : {}),
    };

    let existingSaveQuery = cloudAdmin
      .from("author_nodes")
      .select("id, status, activated_at, current_step, content_json, book_id")
      .eq("author_id", authorProfile.id)
      .eq("node_id", "BP-03");
    if (requestedBookId) existingSaveQuery = existingSaveQuery.eq("book_id", requestedBookId);
    const { data: existingNode, error: existingNodeError } = await existingSaveQuery.maybeSingle();

    if (existingNodeError) throw existingNodeError;

    const existingContent = (existingNode?.content_json as any) || null;
    const existingStep = Number(existingContent?._currentStep ?? existingNode?.current_step ?? 0);
    const alreadySavedExactState =
      !!existingNode &&
      existingNode.status === nextStatus &&
      hasUsableSocialKit(existingContent) &&
      existingStep >= targetStep &&
      (nextStatus !== "live" || !!existingNode.activated_at);

    if (alreadySavedExactState) {
      return respond({ success: true, node: normalizeNode(existingNode) });
    }

    if (existingNode) {
      const { data: updatedNode, error: updateError } = await cloudAdmin
        .from("author_nodes")
        .update(payload)
        .eq("id", existingNode.id)
        .select("id, status, activated_at, current_step, content_json")
        .single();

      if (updateError) throw updateError;
      return respond({ success: true, node: normalizeNode(updatedNode) });
    }

    const { data: insertedNode, error: insertError } = await cloudAdmin
      .from("author_nodes")
      .insert({
        author_id: authorProfile.id,
        node_id: "BP-03",
        node_name: "Social Media",
        book_id: requestedBookId,
        ...payload,
      })
      .select("id, status, activated_at, current_step, content_json")
      .single();

    if (insertError) throw insertError;

    return respond({ success: true, node: normalizeNode(insertedNode) });
  } catch (err) {
    console.error("bp03-node-state error:", err);
    return respond({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});