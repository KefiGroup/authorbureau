import { supabase, SHARED_BACKEND_URL, SHARED_ANON_KEY } from "@/lib/shared-backend";

const PUBLISHNOW_SSO_URL = "https://publishnowinterface.lovable.app/#/sso";

/**
 * Generate an SSO token via the shared backend and redirect to PublishNow
 * with an optional target path (e.g. /profile, /dashboard).
 */
export async function redirectToPublishNow(
  targetPath: string = "/dashboard"
): Promise<{ error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.access_token) {
      return { error: "Not authenticated" };
    }

    const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/sso-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SHARED_ANON_KEY,
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
      throw new Error(data.error || "Failed to generate SSO token");
    }

    const url = `${PUBLISHNOW_SSO_URL}?token=${data.token}&from=authorsbureau&redirect=${encodeURIComponent(targetPath)}`;
    window.open(url, "_blank");
    return {};
  } catch (err: any) {
    return { error: err.message || "SSO redirect failed" };
  }
}
