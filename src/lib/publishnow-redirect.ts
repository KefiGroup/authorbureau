import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";

const PUBLISHNOW_SSO_URL = "https://publishnowinterface.lovable.app/#/sso";
const PUBLISHNOW_DIRECT_URL = "https://publishnowinterface.lovable.app/#";

/**
 * Generate an SSO token via the shared backend and redirect to PublishNow
 * with an optional target path (e.g. /profile, /dashboard).
 * Falls back to a direct link if SSO fails, so the user is never blocked.
 */
export async function redirectToPublishNow(
  targetPath: string = "/dashboard"
): Promise<{ error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.access_token) {
      // No session — open direct link as fallback
      window.open(`${PUBLISHNOW_DIRECT_URL}${targetPath}`, "_blank");
      return {};
    }

    const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/sso-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "generate",
        source_platform: "authorsbureau",
        session_data: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.token) {
      // SSO failed — fall back to direct link
      window.open(`${PUBLISHNOW_DIRECT_URL}${targetPath}`, "_blank");
      return {};
    }

    const url = `${PUBLISHNOW_SSO_URL}?token=${data.token}&from=authorsbureau&redirect=${encodeURIComponent(targetPath)}`;
    window.open(url, "_blank");
    return {};
  } catch {
    // Network or other error — fall back to direct link
    window.open(`${PUBLISHNOW_DIRECT_URL}${targetPath}`, "_blank");
    return {};
  }
}
