// Exchanges OAuth code for tokens and stores connection in DB.
// Supports a two-step Facebook flow: when the user admins multiple Pages,
// we pause and ask them to pick which Page to connect (instead of silently
// taking the first one).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const resolved = await resolveUser(req.headers.get("Authorization"));
    console.log("[social-connect-callback] resolved", { id: resolved.id, source: resolved.source, email: resolved.email });
    if (!resolved.id) return json({ error: "Unauthorized — please sign in again." }, 401);
    const userId = resolved.id;

    const body = await req.json();
    const { code, state, origin, platform, temp_token, page_id: chosen_page_id } = body;
    console.log("[social-connect-callback] req", { platform, origin, hasCode: !!code, hasState: !!state, hasTempToken: !!temp_token, chosen_page_id });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get author_profile id
    const { data: profile } = await admin
      .from("author_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) return json({ error: "Author profile not found" }, 404);

    // Must EXACTLY match what social-connect-start sent.
    const redirectUri = "https://authorsbureau.com/auth/social-callback";

    let tokenData: any = null;
    let accountId = "";
    let accountName = "";
    let accountAvatar: string | null = null;
    let pageId: string | null = null;
    let igBusinessId: string | null = null;
    let scopes: string[] = [];
    let expiresAt: string | null = null;
    let resolvedPlatform: string = platform || "";

    // ───────────────────── STAGE 2: user picked a Facebook Page ─────────────────────
    if (temp_token && chosen_page_id) {
      const { data: pending, error: pendingErr } = await admin
        .from("social_connect_pending")
        .select("*")
        .eq("temp_token", temp_token)
        .maybeSingle();

      if (pendingErr || !pending) {
        return json({ error: "This connect request expired. Please click Connect again." }, 410);
      }
      if (pending.user_id !== userId) {
        return json({ error: "Forbidden" }, 403);
      }
      if (new Date(pending.expires_at).getTime() < Date.now()) {
        await admin.from("social_connect_pending").delete().eq("temp_token", temp_token);
        return json({ error: "This connect request expired. Please click Connect again." }, 410);
      }

      resolvedPlatform = pending.platform;
      const userAccessToken: string = pending.user_access_token;
      const pages: any[] = Array.isArray(pending.pages_json) ? pending.pages_json : [];
      const chosen = pages.find((p) => p?.id === chosen_page_id);
      if (!chosen) {
        return json({ error: "Selected Page is no longer available." }, 400);
      }

      // Get a fresh page-scoped access token (some apps require re-fetching).
      pageId = chosen.id;
      accountId = chosen.id;
      accountName = chosen.name;
      tokenData = { access_token: chosen.access_token || userAccessToken };
      scopes = ["pages_manage_posts", "pages_read_engagement", "instagram_content_publish"];

      if (resolvedPlatform === "instagram") {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${tokenData.access_token}`,
        );
        const igJson = await igRes.json();
        igBusinessId = igJson.instagram_business_account?.id || null;
        if (!igBusinessId) {
          return json({
            error: "No Instagram Business account is linked to this Facebook Page. Convert your IG to Business and link it to a Page first.",
          }, 400);
        }
      }

      // Clean up the pending row — single-use.
      await admin.from("social_connect_pending").delete().eq("temp_token", temp_token);

    // ───────────────────── STAGE 1: fresh OAuth code exchange ─────────────────────
    } else {
      if (!code || !platform) return json({ error: "code + platform required" }, 400);

      if (platform === "linkedin") {
        const clientId = Deno.env.get("LINKEDIN_CLIENT_ID")!;
        const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });
        tokenData = await tokenRes.json();
        if (!tokenRes.ok) return json({ error: "LinkedIn token exchange failed", detail: tokenData }, 400);

        const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileJson = await profileRes.json();
        accountId = profileJson.sub;
        accountName = profileJson.name || profileJson.email || "LinkedIn User";
        accountAvatar = profileJson.picture || null;
        scopes = ["openid", "profile", "email", "w_member_social"];
        if (tokenData.expires_in) {
          expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        }
      } else if (platform === "facebook" || platform === "instagram") {
        const appId = Deno.env.get("META_APP_ID")!;
        const appSecret = Deno.env.get("META_APP_SECRET")!;
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
        const tokenRes = await fetch(tokenUrl);
        tokenData = await tokenRes.json();
        console.log("[social-connect-callback] meta token exchange", { ok: tokenRes.ok, hasAccessToken: !!tokenData?.access_token });
        if (!tokenRes.ok) return json({ error: `Meta token exchange failed: ${tokenData?.error?.message || tokenRes.status}`, detail: tokenData }, 400);

        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${tokenData.access_token}`);
        const me = await meRes.json();
        accountId = me.id;
        accountName = me.name;

        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture&access_token=${tokenData.access_token}`,
        );
        const pagesJson = await pagesRes.json();
        const pages: any[] = Array.isArray(pagesJson?.data) ? pagesJson.data : [];

        if (pages.length === 0) {
          return json({ error: "No Facebook Pages found on this account. Create or get admin access to a Facebook Page first." }, 400);
        }

        // Multi-page → pause and let the author pick.
        if (pages.length > 1) {
          const tempToken = randomToken();
          await admin.from("social_connect_pending").insert({
            temp_token: tempToken,
            user_id: userId,
            platform,
            user_access_token: tokenData.access_token,
            pages_json: pages,
          });
          console.log("[social-connect-callback] needs_page_selection", { count: pages.length });
          return json({
            success: false,
            needs_page_selection: true,
            platform,
            temp_token: tempToken,
            pages: pages.map((p) => ({
              id: p.id,
              name: p.name,
              picture: p?.picture?.data?.url || null,
            })),
          });
        }

        // Single page — auto-select.
        const firstPage = pages[0];
        pageId = firstPage.id;
        accountId = firstPage.id;
        accountName = firstPage.name;
        tokenData.access_token = firstPage.access_token;
        scopes = ["pages_manage_posts", "pages_read_engagement", "instagram_content_publish"];

        if (platform === "instagram") {
          const igRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${firstPage.access_token}`,
          );
          const igJson = await igRes.json();
          igBusinessId = igJson.instagram_business_account?.id || null;
          if (!igBusinessId) {
            return json({
              error: "No Instagram Business account is linked to this Facebook Page. Convert your IG to Business and link it to a Page first.",
            }, 400);
          }
        }
      } else {
        return json({ error: "Unsupported platform" }, 400);
      }
    }

    // ───────────────────── Upsert connection ─────────────────────
    const { error: upsertErr } = await admin
      .from("social_connections")
      .upsert(
        {
          author_id: profile.id,
          user_id: userId,
          platform: resolvedPlatform,
          account_id: accountId,
          account_name: accountName,
          account_avatar_url: accountAvatar,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          page_id: pageId,
          ig_business_id: igBusinessId,
          scopes,
          status: "connected",
          last_error: null,
          channel_id: accountId,
          channel_name: accountName,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform" },
      );
    if (upsertErr) {
      console.error("[social-connect-callback] upsert error", upsertErr);
      return json({ error: upsertErr.message }, 500);
    }
    console.log("[social-connect-callback] success", { platform: resolvedPlatform, accountId, accountName });

    return json({ success: true, platform: resolvedPlatform, account_name: accountName });
  } catch (e) {
    console.error("[social-connect-callback] unhandled", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
