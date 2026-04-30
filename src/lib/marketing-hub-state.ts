import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";

type MarketingHubAction =
  | "snapshot"
  | "social_calendar"
  | "update_social_post"
  | "reschedule_social_post"
  | "post_social_now"
  | "sequences"
  | "update_sequence"
  | "toggle_sequence_status"
  | "activate_all_sequences"
  | "generate_all_sequences"
  | "activate_node"
  | "pause_node"
  | "email_settings"
  | "save_email_settings"
  | "send_verification_email";

const INVALID_SESSION_MARKERS = [
  "invalid session",
  "session has expired",
  "no auth token",
];

function looksLikeInvalidSession(message: string | undefined | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return INVALID_SESSION_MARKERS.some((m) => lower.includes(m));
}

async function invokeMarketingHub(
  action: MarketingHubAction,
  payload: Record<string, unknown>,
  forceRefresh: boolean,
): Promise<{ ok: boolean; status: number; result: any }> {
  const token = await getActiveToken({ forceRefresh });
  if (!token) {
    return {
      ok: false,
      status: 401,
      result: { error: "Your session has expired. Please sign in again." },
    };
  }

  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-hub-state`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    },
  );

  const result = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, result };
}

export async function callMarketingHubState<T = any>(
  action: MarketingHubAction,
  payload: Record<string, unknown> = {},
): Promise<T> {
  // First attempt with the cached/normal token.
  let attempt = await invokeMarketingHub(action, payload, false);

  // If the server rejected us as "Invalid session", force-refresh the
  // session once and try again. This handles the common case where the
  // tab sat idle past the access-token TTL and our cached token is stale.
  const firstError = attempt.result?.error;
  if (
    (!attempt.ok || !attempt.result?.success) &&
    looksLikeInvalidSession(firstError)
  ) {
    attempt = await invokeMarketingHub(action, payload, true);
  }

  if (!attempt.ok || !attempt.result?.success) {
    throw new Error(
      attempt.result?.error || "We couldn't load your Marketing Hub data.",
    );
  }

  return attempt.result as T;
}
