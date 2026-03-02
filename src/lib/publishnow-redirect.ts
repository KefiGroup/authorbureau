import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";

const PUBLISHNOW_SSO_URL = "https://publishnow.io/#/sso";
const PUBLISHNOW_BASE = "https://publishnow.io";
const RETRY_DELAY_MS = 2000;

interface RedirectResult {
  error?: string;
  fallbackUrl?: string;
}

/**
 * Attempt a single SSO handoff fetch. Returns the token or throws.
 */
async function attemptHandoff(accessToken: string, refreshToken: string): Promise<string> {
  const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/sso-handoff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: "generate",
      source_platform: "authorsbureau",
      session_data: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data.error || `SSO handoff failed (${res.status})`);
  }
  return data.token;
}

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && err.message.toLowerCase().includes("failed to fetch"))
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate an SSO token via the shared backend and redirect to PublishNow
 * with an optional target path (e.g. /profile, /dashboard).
 *
 * Includes a single retry on network failure and returns a fallbackUrl
 * so callers can offer a direct (non-SSO) link when handoff fails.
 */
export async function redirectToPublishNow(
  targetPath: string = "/dashboard"
): Promise<RedirectResult> {
  const fallbackUrl = `${PUBLISHNOW_BASE}/#${targetPath}`;

  try {
    // 1. Check auth
    const session = (await supabase.auth.getSession()).data?.session ?? null;
    if (!session?.access_token) {
      return { error: "Not authenticated — please sign in first." };
    }

    // 2. First attempt
    let token: string | null = null;
    try {
      token = await attemptHandoff(session.access_token, session.refresh_token!);
    } catch (firstErr) {
      if (!isNetworkError(firstErr)) {
        // Server responded with an error — no point retrying
        return {
          error: `SSO token generation failed: ${(firstErr as Error).message}`,
          fallbackUrl,
        };
      }

      // Network error — retry once after delay
      await delay(RETRY_DELAY_MS);
      try {
        token = await attemptHandoff(session.access_token, session.refresh_token!);
      } catch (retryErr) {
        return {
          error: isNetworkError(retryErr)
            ? "Could not reach the authentication server. Please check your connection and try again."
            : `SSO handoff failed after retry: ${(retryErr as Error).message}`,
          fallbackUrl,
        };
      }
    }

    // 3. Success — open in new tab
    const url = `${PUBLISHNOW_SSO_URL}?token=${token}&from=authorsbureau&redirect=${encodeURIComponent(targetPath)}`;
    window.open(url, "_blank");
    return {};
  } catch (err: any) {
    return {
      error: err.message || "SSO redirect failed. Please try again.",
      fallbackUrl,
    };
  }
}
