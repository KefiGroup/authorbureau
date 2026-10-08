// Pulse bridge for BP-03 Social Calendar: connect channels, sync connections,
// publish/schedule posts and refresh their live status. The Pulse key never
// leaves the server. Manual copy-paste remains the fallback for everything.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PULSE_URL = (Deno.env.get("PULSE_BASE_URL") || "").replace(/\/$/, "");
const PULSE_KEY = Deno.env.get("PULSE_API_KEY") || "";
const PULSE_NETWORKS = ["linkedin", "facebook", "instagram"];
const RETURN_URL = "https://authorsbureau.com/dashboard?section=marketing-hub&tab=social-calendar&pulse=done";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function pulse(path: string, init: RequestInit = {}) {
  const res = await fetch(`${PULSE_URL}/v1/partner${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${PULSE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

function pulseError(r: { status: number; data: any }) {
  const code = r.data?.error?.code;
  const message = r.data?.error?.message || `Pulse returned ${r.status}`;
  if (code === "limit_reached") {
    return "All automatic posting slots are in use right now. You can still post with Copy caption and Mark as posted.";
  }
  return message;
}

async function ensureMember(profile: { id: string; pen_name?: string | null }) {
  const r = await pulse("/members", {
    method: "POST",
    body: JSON.stringify({ external_id: profile.id, ...(profile.pen_name ? { name: String(profile.pen_name).slice(0, 120) } : {}) }),
  });
  if (!r.ok) throw new Error(pulseError(r));
  return r.data.id as string;
}

async function syncConnections(admin: any, profile: any, userId: string, memberId: string) {
  const r = await pulse(`/members/${memberId}/connections`);
  if (!r.ok) throw new Error(pulseError(r));
  const conns: any[] = r.data?.connections || [];
  const active = new Map<string, any>();
  for (const c of conns) {
    if (!PULSE_NETWORKS.includes(c.network)) continue;
    if (c.status === "active" && !active.has(c.network)) active.set(c.network, c);
  }
  for (const net of PULSE_NETWORKS) {
    const c = active.get(net);
    if (c) {
      await admin.from("social_connections").upsert({
        user_id: userId,
        author_id: profile.id,
        platform: net,
        status: "connected",
        channel_id: c.id,
        account_id: memberId,
        account_name: c.label || null,
        channel_name: "pulse",
        scopes: ["pulse"],
        connected_at: c.connected_at || new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,platform" });
    } else {
      // Only clear rows Pulse owns; never touch other connection types.
      await admin.from("social_connections").update({ status: "disconnected", updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("platform", net).eq("channel_name", "pulse");
    }
  }
  return conns.map((c) => ({ id: c.id, network: c.network, label: c.label, status: c.status }));
}

function mapStatus(s: string | undefined) {
  if (s === "published") return "posted";
  if (s === "failed") return "failed";
  return null;
}

async function refreshPost(admin: any, memberId: string, post: any) {
  const r = await pulse(`/members/${memberId}/posts/${post.pulse_post_id}`);
  if (!r.ok) return post;
  const p = r.data;
  const net = (p.networks || [])[0] || {};
  const appStatus = mapStatus(p.status === "partial" ? net.status : p.status);
  const update: Record<string, unknown> = {
    pulse_status: p.status,
    external_url: net.external_url || null,
    error_message: net.error || p.error || null,
  };
  if (appStatus === "posted") { update.status = "posted"; update.posted_at = post.posted_at || new Date().toISOString(); }
  if (appStatus === "failed") update.status = "ready";
  await admin.from("social_posts").update(update).eq("id", post.id);
  return { ...post, ...update };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!PULSE_URL || !PULSE_KEY) return json({ success: false, error: "Automatic posting is not set up yet." }, 200);
    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    // Cron: refresh every in-flight Pulse post across authors.
    if (action === "refresh_all") {
      if (!(req.headers.get("Authorization") || "").includes(SERVICE)) return json({ error: "Forbidden" }, 403);
      const { data: pending } = await admin.from("social_posts")
        .select("id, author_id, pulse_post_id, posted_at")
        .not("pulse_post_id", "is", null).in("pulse_status", ["scheduled", "publishing"]).limit(100);
      let n = 0;
      for (const p of pending || []) {
        const m = await pulse("/members", { method: "POST", body: JSON.stringify({ external_id: p.author_id }) });
        if (m.ok) { await refreshPost(admin, m.data.id, p); n++; }
      }
      return json({ success: true, refreshed: n });
    }

    const resolved = await resolveUser(req.headers.get("Authorization"));
    if (!resolved.id) return json({ success: false, error: "Please sign in again." }, 401);
    const { data: profile } = await admin.from("author_profiles")
      .select("id, pen_name").eq("user_id", resolved.id)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!profile) return json({ success: false, error: "Author profile not found." }, 404);

    const memberId = await ensureMember(profile);

    if (action === "status") {
      const connections = await syncConnections(admin, profile, resolved.id, memberId);
      return json({ success: true, connections });
    }

    if (action === "connect_session") {
      const r = await pulse(`/members/${memberId}/connect-session`, {
        method: "POST",
        body: JSON.stringify({ networks: PULSE_NETWORKS, return_url: RETURN_URL }),
      });
      if (!r.ok) return json({ success: false, error: pulseError(r), code: r.data?.error?.code });
      return json({ success: true, url: r.data.url, expires_at: r.data.expires_at });
    }

    if (action === "disconnect") {
      const cid = String(body?.connection_id || "");
      if (!/^c_[A-Za-z0-9]+$/.test(cid)) return json({ success: false, error: "Invalid connection." }, 400);
      const r = await pulse(`/members/${memberId}/connections/${cid}`, { method: "DELETE" });
      if (!r.ok && r.status !== 404) return json({ success: false, error: pulseError(r) });
      const connections = await syncConnections(admin, profile, resolved.id, memberId);
      return json({ success: true, connections });
    }

    if (action === "publish_post" || action === "refresh_post") {
      const postId = String(body?.post_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(postId)) return json({ success: false, error: "Invalid post." }, 400);
      const { data: post } = await admin.from("social_posts")
        .select("id, author_id, platform, content, graphic_url, graphics, scheduled_at, status, posted_at, pulse_post_id, pulse_status")
        .eq("id", postId).maybeSingle();
      if (!post || post.author_id !== profile.id) return json({ success: false, error: "Post not found." }, 404);

      if (action === "refresh_post") {
        if (!post.pulse_post_id) return json({ success: true, post });
        return json({ success: true, post: await refreshPost(admin, memberId, post) });
      }

      if (!PULSE_NETWORKS.includes(post.platform)) {
        return json({ success: false, error: "This platform needs manual posting. Use Copy caption." });
      }
      if (post.pulse_post_id && ["scheduled", "publishing", "published"].includes(post.pulse_status || "")) {
        return json({ success: false, error: "This post is already queued with automatic posting." });
      }
      const mediaUrl = (post.graphics && typeof post.graphics === "object" && (post.graphics as any)[post.platform]) || post.graphic_url;
      const media = typeof mediaUrl === "string" && mediaUrl.startsWith("https://") ? [mediaUrl] : [];
      if (post.platform === "instagram" && media.length === 0) {
        return json({ success: false, error: "Instagram needs a graphic. Generate the graphic first." });
      }
      const payload: Record<string, unknown> = { text: post.content || "", networks: [post.platform] };
      if (media.length) payload.media_urls = media;
      const when = body?.mode === "schedule" && post.scheduled_at ? new Date(post.scheduled_at) : null;
      if (when && when.getTime() > Date.now() + 3 * 60_000) payload.scheduled_at = when.toISOString();

      const r = await pulse(`/members/${memberId}/posts`, { method: "POST", body: JSON.stringify(payload) });
      if (!r.ok) {
        const msg = pulseError(r);
        await admin.from("social_posts").update({ error_message: msg }).eq("id", post.id);
        return json({ success: false, error: msg, code: r.data?.error?.code });
      }
      const update = {
        pulse_post_id: r.data.id,
        pulse_status: r.data.status,
        error_message: null,
        scheduled_at: r.data.scheduled_at || post.scheduled_at,
      };
      await admin.from("social_posts").update(update).eq("id", post.id);
      return json({ success: true, post: { ...post, ...update } });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[pulse-social-sync]", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Something went wrong" }, 200);
  }
});
