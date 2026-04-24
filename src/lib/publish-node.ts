import { getMicrositeUrl, NO_MICROSITE_NODES } from "@/lib/node-slug-map";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

/**
 * Publishes a node's content to the author's microsite via the
 * `save-author-node` edge function (action: "publish").
 *
 * Why an edge function: the project-local Supabase JS client signs requests
 * with the Cloud-side `auth.uid()` which often differs from the shared-backend
 * user_id stored on `author_profiles.user_id`. Direct PostgREST updates
 * silently match zero rows under RLS. The edge function uses the service role
 * after a JWT-based ownership check.
 */
export async function publishNodeToSite(
  authorId: string,
  nodeId: string,
  penNameSlug: string,
  bookId?: string | null,
): Promise<{ micrositeUrl: string | null }> {
  const hasPublicPage = !NO_MICROSITE_NODES.has(nodeId);
  const micrositeUrl = hasPublicPage ? getMicrositeUrl(penNameSlug, nodeId) : null;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!projectId || !anonKey) throw new Error("Backend not configured");

  const token = (await getActiveToken()) ?? anonKey;
  const res = await fetchWithTimeout(
    `https://${projectId}.supabase.co/functions/v1/save-author-node`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "publish",
        authorId,
        nodeId,
        bookId: bookId ?? null,
        micrositeUrl,
      }),
    },
    25000,
  );

  let parsed: any = null;
  try { parsed = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    if (res.status === 409 && parsed?.error === "stripe_required") {
      throw new StripeRequiredError(parsed?.message || "Connect Stripe before publishing paid products.");
    }
    const msg = parsed?.error || `Publish failed (HTTP ${res.status})`;
    console.error("[publishNodeToSite] failed:", msg, parsed);
    throw new Error(msg);
  }

  return { micrositeUrl: parsed?.micrositeUrl ?? micrositeUrl };
}

/** Thrown when the server blocks a paid-product publish because Stripe Connect isn't onboarded. */
export class StripeRequiredError extends Error {
  readonly code = "stripe_required" as const;
  constructor(message: string) {
    super(message);
    this.name = "StripeRequiredError";
  }
}

