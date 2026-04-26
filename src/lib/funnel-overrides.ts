/**
 * Layered storage for funnel stage edits.
 *
 * `funnels` row = ABBY's generated baseline.
 * `funnel_stage_overrides` rows = per-stage author edits keyed by stage_id.
 *
 * One override row per (funnel_id, stage_id). `field_overrides` is a flat
 * { fieldKey: stringValue } map. Removing a key resets that field to ABBY's value.
 * Removing all keys deletes the override row entirely.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OverridesMap } from "./funnel-flow-stages";

export async function loadOverrides(funnelId: string): Promise<OverridesMap> {
  const { data, error } = await supabase
    .from("funnel_stage_overrides")
    .select("stage_id, field_overrides")
    .eq("funnel_id", funnelId);
  if (error) {
    console.warn("[funnel-overrides] load failed:", error.message);
    return {};
  }
  const map: OverridesMap = {};
  for (const row of data || []) {
    map[row.stage_id] = (row.field_overrides as Record<string, string>) || {};
  }
  return map;
}

/**
 * Upsert an override row for one stage. Pass the FULL field map for that stage
 * (this replaces the existing one). To remove a field, omit it from `fields`.
 * If `fields` is empty, the override row is deleted.
 */
export async function saveStageOverride(params: {
  funnelId: string;
  authorId: string;
  stageId: string;
  fields: Record<string, string>;
}): Promise<{ error?: string }> {
  const { funnelId, authorId, stageId, fields } = params;

  // Strip empty strings — empty = "use ABBY's value".
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && String(v).trim().length > 0) cleaned[k] = String(v);
  }

  if (Object.keys(cleaned).length === 0) {
    const { error } = await supabase
      .from("funnel_stage_overrides")
      .delete()
      .eq("funnel_id", funnelId)
      .eq("stage_id", stageId);
    if (error) return { error: error.message };
    return {};
  }

  const { error } = await supabase
    .from("funnel_stage_overrides")
    .upsert(
      {
        funnel_id: funnelId,
        author_id: authorId,
        stage_id: stageId,
        field_overrides: cleaned,
      },
      { onConflict: "funnel_id,stage_id" },
    );
  if (error) return { error: error.message };
  return {};
}
