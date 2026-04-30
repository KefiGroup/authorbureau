/**
 * Layer 2 of the microsite content quality gate.
 *
 * Every generator that writes to `author_nodes.content_json` should route through
 * `saveNodeContent` instead of calling `supabase.from('author_nodes').upsert(...)`
 * directly. This guarantees:
 *   1. The DB row is sanitised before storage (no need to rely on render-time
 *      scrubbing forever).
 *   2. Any rule violation is logged to `content_quality_log` so we can see
 *      drift the moment it happens, instead of discovering it during an audit.
 *   3. Every node ends up with a primary CTA, even if the model forgot.
 */

import {
  sanitiseForPublic,
  validateForPublic,
  ensurePrimaryCta,
} from "./microsite-content-rules.ts";

// Minimal supabase client shape we rely on (avoids version coupling).
type Supa = {
  from: (table: string) => {
    upsert: (
      values: Record<string, unknown>,
      options?: { onConflict?: string },
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    insert: (values: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
  };
};

export interface SaveNodeContentArgs {
  author_id: string;
  node_id: string;
  content_json: Record<string, unknown>;
  // Any other author_nodes columns the caller wants to set (status, archetype,
  // microsite_url, payment_link, price_usd, etc.).
  extra?: Record<string, unknown>;
  source?: string; // e.g. "generate-yr20-big-ticket"
}

export interface SaveNodeContentResult {
  ok: boolean;
  violations_logged: number;
  cta_injected: boolean;
  error?: string;
}

export async function saveNodeContent(
  supabase: Supa,
  args: SaveNodeContentArgs,
): Promise<SaveNodeContentResult> {
  const { author_id, node_id, content_json, extra = {}, source } = args;
  const opts = { nodeId: node_id, archetype: (extra.archetype as string) ?? null };

  // 1. Validate (report) before mutating, so we know what the model produced.
  const { violations } = validateForPublic(content_json, opts);

  // 2. Sanitise — clean DB row.
  const cleaned = sanitiseForPublic(content_json, opts);

  // 3. Ensure primary CTA exists; track if we had to inject one.
  const hadCtaBefore = JSON.stringify(cleaned).includes('"primary_cta"');
  const withCta = ensurePrimaryCta(cleaned, node_id);
  const ctaInjected = !hadCtaBefore && JSON.stringify(withCta).includes('"primary_cta"');

  // 4. Log violations (best-effort; never block the write).
  let logged = 0;
  if (violations.length > 0 || ctaInjected) {
    const rows: Record<string, unknown>[] = violations.map((v) => ({
      author_id,
      node_id,
      rule: v.rule,
      sample: v.sample,
      field_path: v.field_path,
      source: source ?? null,
    }));
    if (ctaInjected) {
      rows.push({
        author_id,
        node_id,
        rule: "missing_cta",
        sample: null,
        field_path: "primary_cta",
        source: source ?? null,
      });
    }
    try {
      const { error } = await supabase.from("content_quality_log").insert(rows);
      if (!error) logged = rows.length;
    } catch (_e) {
      // swallow — quality logging must never block content save
    }
  }

  // 5. Persist the cleaned row.
  const upsertPayload: Record<string, unknown> = {
    author_id,
    node_id,
    content_json: withCta,
    updated_at: new Date().toISOString(),
    ...extra,
  };

  const { error } = await supabase
    .from("author_nodes")
    .upsert(upsertPayload, { onConflict: "author_id,node_id" });

  if (error) {
    return { ok: false, violations_logged: logged, cta_injected: ctaInjected, error: error.message };
  }
  return { ok: true, violations_logged: logged, cta_injected: ctaInjected };
}
