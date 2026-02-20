import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";

const PUBLISHNOW_SSO_URL = "https://publishnowinterface.lovable.app/#/sso";
const PUBLISHNOW_DIRECT_URL = "https://publishnowinterface.lovable.app/#";

/**
 * Generate an SSO token via the shared backend and redirect to PublishNow.
 * Falls back to a direct link if SSO fails.
 */
export async function redirectToPublishNow(
  targetPath: string = "/dashboard"
): Promise<{ error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.access_token) {
      // Not authenticated — open PublishNow directly (they'll see their own login)
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
      // SSO generate failed — fall back to direct link
      console.warn("[SSO] generate failed, opening direct link:", data.error || res.status);
      window.open(`${PUBLISHNOW_DIRECT_URL}${targetPath}`, "_blank");
      return {};
    }

    const url = `${PUBLISHNOW_SSO_URL}?token=${data.token}&from=authorsbureau&redirect=${encodeURIComponent(targetPath)}`;
    window.open(url, "_blank");
    return {};
  } catch (err: any) {
    // Network error — fall back to direct link
    console.warn("[SSO] error, opening direct link:", err.message);
    window.open(`${PUBLISHNOW_DIRECT_URL}${targetPath}`, "_blank");
    return {};
  }
}
