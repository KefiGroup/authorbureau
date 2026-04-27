/**
 * Frontend client for the `funnels-manage` edge function.
 *
 * Why this exists: project Cloud PostgREST rejects the shared-backend JWT at
 * the gateway, so direct `.from("funnels")` owner reads/writes from the
 * browser are unreliable — they appear to work in-session but a refresh can
 * lose them because the direct client has no usable session for RLS.
 *
 * All funnel owner-side CRUD must go through this helper.
 */
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/funnels-manage`;

async function callFn<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = await getActiveToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetchWithTimeout(
    FN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    },
    20000,
  );
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const msg = data?.error || `funnels-manage HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export interface FunnelRow {
  id: string;
  author_id: string;
  node_id: string | null;
  funnel_type: string;
  title: string;
  slug: string;
  headline: string;
  subheadline: string | null;
  body_copy: string | null;
  cta_text: string;
  cta_url: string | null;
  hero_image_url: string | null;
  background_color: string;
  accent_color: string;
  status: string;
  page_views: number;
  conversions: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OverrideRow {
  stage_id: string;
  field_overrides: Record<string, string>;
}

export async function listFunnels(): Promise<{ funnels: FunnelRow[]; authorId: string | null }> {
  return callFn("list");
}

export async function getFunnel(funnelId: string): Promise<{ funnel: FunnelRow; overrides: OverrideRow[] }> {
  return callFn("get", { funnel_id: funnelId });
}

export async function saveFunnelCopy(
  funnelId: string,
  patch: Partial<Pick<FunnelRow, "headline" | "subheadline" | "body_copy" | "cta_text" | "cta_url" | "background_color" | "accent_color" | "title">>,
): Promise<{ funnel: FunnelRow }> {
  return callFn("save_copy", { funnel_id: funnelId, patch });
}

export async function saveStageOverrideViaFn(params: {
  funnelId: string;
  stageId: string;
  fields: Record<string, string>;
}): Promise<{ ok: true; deleted?: boolean }> {
  return callFn("save_override", {
    funnel_id: params.funnelId,
    stage_id: params.stageId,
    fields: params.fields,
  });
}

export async function setFunnelStatus(
  funnelId: string,
  status: "live" | "paused" | "draft",
): Promise<{ funnel: FunnelRow }> {
  return callFn("set_status", { funnel_id: funnelId, status });
}
