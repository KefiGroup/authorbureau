import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

type Action = "load" | "save";
type NextStatus = "content_ready" | "live";

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
      const { data: ctx, error: ctxError } = await cloudAdmin
        .from("author_context")
        .select("book_title")
        .eq("author_id", authorProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ctxError) throw ctxError;

      let bookTitle = ctx?.book_title || "";
      if (!bookTitle) {
        const { data: book, error: bookError } = await cloudAdmin
          .from("books")
          .select("title")
          .eq("author_id", authorProfile.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bookError) throw bookError;
        bookTitle = book?.title || "";
      }

      const { data: node, error: nodeError } = await cloudAdmin
        .from("author_nodes")
        .select("id, status, current_step, activated_at, content_json")
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03")
        .maybeSingle();

      if (nodeError) throw nodeError;

      return respond({
        success: true,
        profile: authorProfile,
        book_title: bookTitle,
        has_context: Boolean(bookTitle),
        node: normalizeNode(node),
      });
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

    const { data: existingNode, error: existingNodeError } = await cloudAdmin
      .from("author_nodes")
      .select("id, status, activated_at, current_step, content_json")
      .eq("author_id", authorProfile.id)
      .eq("node_id", "BP-03")
      .maybeSingle();

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