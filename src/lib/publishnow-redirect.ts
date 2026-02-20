import { supabase } from "@/lib/shared-backend";

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

    const { data, error } = await supabase.functions.invoke("sso-handoff", {
      body: {
        action: "generate",
        source_platform: "authorsbureau",
        session_data: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      },
    });

    if (error || !data?.token) {
      throw new Error(data?.error || error?.message || "Failed to generate SSO token");
    }

    const url = `${PUBLISHNOW_SSO_URL}?token=${data.token}&from=authorsbureau&redirect=${encodeURIComponent(targetPath)}`;
    window.open(url, "_blank");
    return {};
  } catch (err: any) {
    return { error: err.message || "SSO redirect failed" };
  }
}
