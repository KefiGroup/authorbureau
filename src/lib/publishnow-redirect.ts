import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";

const PUBLISHNOW_SSO_URL = "https://publishnowinterface.lovable.app/#/sso";

/**
 * Generate an SSO token via the shared backend and redirect to PublishNow
 * with an optional target path (e.g. /profile, /dashboard).
 */
export async function redirectToPublishNow(
  targetPath: string = "/dashboard"
): Promise<{ error?: string }> {
  try {
    // Try refreshing first for a fresh JWT; fall back to existing session
    let session = (await supabase.auth.refreshSession()).data?.session;
    if (!session?.access_token) {
      session = (await supabase.auth.getSession()).data?.session ?? null;
    }
    if (!session?.access_token) {
      return { error: "Not authenticated — please sign in first." };
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
      return { error: data.error || `SSO handoff failed (${res.status}). Please try again.` };
    }

    const url = `${PUBLISHNOW_SSO_URL}?token=${data.token}&from=authorsbureau&redirect=${encodeURIComponent(targetPath)}`;
    window.open(url, "_blank");
    return {};
  } catch (err: any) {
    return { error: err.message || "SSO redirect failed. Please try again." };
  }
}
