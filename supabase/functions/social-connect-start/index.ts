// Initiates OAuth flow for a given social platform. Returns auth URL.
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Public callback URL (frontend route that calls /social-connect-callback)
function getRedirectUri(origin: string) {
  return `${origin}/auth/social-callback`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { platform, origin } = await req.json();
    if (!platform) return json({ error: "platform required" }, 400);

    const userId = claims.claims.sub as string;
    const redirectUri = getRedirectUri(origin);
    const state = btoa(JSON.stringify({ uid: userId, p: platform, t: Date.now() }));

    let authUrl = "";

    if (platform === "linkedin") {
      const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
      if (!clientId) {
        return json({
          error: "LinkedIn is not yet configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.",
          needs_setup: true,
        }, 400);
      }
      const scopes = ["openid", "profile", "email", "w_member_social"].join(" ");
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: scopes,
      });
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    } else if (platform === "facebook" || platform === "instagram") {
      const appId = Deno.env.get("META_APP_ID");
      if (!appId) {
        return json({
          error: "Meta (Facebook/Instagram) is not yet configured. Please add META_APP_ID and META_APP_SECRET.",
          needs_setup: true,
        }, 400);
      }
      const scopes = [
        "pages_show_list",
        "pages_manage_posts",
        "pages_read_engagement",
        "instagram_basic",
        "instagram_content_publish",
        "business_management",
      ].join(",");
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        state,
        scope: scopes,
        response_type: "code",
      });
      authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
    } else if (platform === "x") {
      return json({
        error: "X (Twitter) requires a paid API tier ($200/mo). Manual posting only for now.",
        manual_only: true,
      }, 400);
    } else {
      return json({ error: `Platform ${platform} not supported yet.` }, 400);
    }

    return json({ success: true, authUrl, state });
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
