import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";

export type PulseAction = "status" | "connect_session" | "disconnect" | "publish_post" | "refresh_post";
export const PULSE_PLATFORMS = ["linkedin", "facebook", "instagram"] as const;

export interface PulseConnection {
  id: string;
  network: string;
  label: string | null;
  status: string;
}

/** Calls the pulse-social-sync bridge. Throws with a plain-language message. */
export async function callPulse<T = any>(action: PulseAction, payload: Record<string, unknown> = {}): Promise<T> {
  let token = await getActiveToken();
  if (!token) token = await getActiveToken({ forceRefresh: true });
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const res = await fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pulse-social-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok || !result?.success) throw new Error(result?.error || "Automatic posting is unavailable right now.");
  return result as T;
}
