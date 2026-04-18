import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";

type MarketingHubAction =
  | "snapshot"
  | "social_calendar"
  | "update_social_post"
  | "reschedule_social_post"
  | "sequences"
  | "toggle_sequence_status"
  | "activate_node"
  | "pause_node"
  | "email_settings"
  | "save_email_settings";

export async function callMarketingHubState<T = any>(
  action: MarketingHubAction,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const token = await getActiveToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

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
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "We couldn't load your Marketing Hub data.");
  }

  return result as T;
}