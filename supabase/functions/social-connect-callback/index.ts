// Exchanges OAuth code for tokens and stores connection in DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const resolved = await resolveUser(req.headers.get("Authorization"));
    console.log("[social-connect-callback] resolved", { id: resolved.id, source: resolved.source, email: resolved.email });
    if (!resolved.id) return json({ error: "Unauthorized — please sign in again." }, 401);
    const userId = resolved.id;

    const { code, state, origin, platform } = await req.json();
    console.log("[social-connect-callback] req", { platform, origin, hasCode: !!code, hasState: !!state });
    if (!code || !platform) return json({ error: "code + platform required" }, 400);

    // Must EXACTLY match what social-connect-start sent.
    const redirectUri = "https://authorsbureau.com/auth/social-callback";

    // Get author_profile id
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from("author_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) return json({ error: "Author profile not found" }, 404);

    let tokenData: any = null;
    let accountId = "";
    let accountName = "";
    let accountAvatar: string | null = null;
    let pageId: string | null = null;
    let igBusinessId: string | null = null;
    let scopes: string[] = [];
    let expiresAt: string | null = null;

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

      // Fetch profile
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
      if (!tokenRes.ok) return json({ error: "Meta token exchange failed", detail: tokenData }, 400);

      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${tokenData.access_token}`);
      const me = await meRes.json();
      accountId = me.id;
      accountName = me.name;

      // Get first page (FB) — IG business is linked via the page
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${tokenData.access_token}`,
      );
      const pagesJson = await pagesRes.json();
      const firstPage = pagesJson.data?.[0];
      if (firstPage) {
        pageId = firstPage.id;
        accountName = firstPage.name;
        // For IG, look up linked business account
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
        // Use the page access token for posting
        tokenData.access_token = firstPage.access_token;
      } else if (platform === "facebook") {
        return json({ error: "No Facebook Pages found on this account." }, 400);
      }
      scopes = ["pages_manage_posts", "pages_read_engagement", "instagram_content_publish"];
    } else {
      return json({ error: "Unsupported platform" }, 400);
    }

    // Upsert connection
    const { error: upsertErr } = await admin
      .from("social_connections")
      .upsert(
        {
          author_id: profile.id,
          user_id: userId,
          platform,
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
        { onConflict: "author_id,platform,account_id" },
      );
    if (upsertErr) return json({ error: upsertErr.message }, 500);

    return json({ success: true, platform, account_name: accountName });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
