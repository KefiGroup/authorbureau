import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

/**
 * Shared helper to call the admin-data edge function.
 * Used by all admin panel tabs that need admin-data actions.
 */
export async function adminDataFetch(action: string, body: Record<string, unknown> = {}) {
  const token = await getActiveToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
