/**
 * Cross-Builder Push Execution Utility
 * 
 * Handles creating push records in the database and optionally
 * creating draft records in destination tables.
 */

import { supabase } from "@/integrations/supabase/client";
import { getPushesForBuilder, type CrossBuilderPushDef } from "./cross-builder-registry";

export interface PushPayload {
  /** The builder that generated the content */
  sourceBuilder: string;
  /** The author's user ID */
  authorId: string;
  /** The book this content was generated from */
  bookId: string;
  /** Map of pushType → generated content (JSON) */
  outputs: Record<string, {
    title: string;
    description?: string;
    content: Record<string, any>;
  }>;
  /** Optional: the generated_assets.id that produced this content */
  sourceAssetId?: string;
}

export interface PushResult {
  success: boolean;
  pushed: number;
  errors: string[];
  pushIds: string[];
}

/**
 * Execute cross-builder pushes after content generation completes.
 * Creates records in cross_builder_pushes table for each matching output.
 */
export async function executeCrossBuilderPushes(payload: PushPayload): Promise<PushResult> {
  const pushDefs = getPushesForBuilder(payload.sourceBuilder);
  const result: PushResult = { success: true, pushed: 0, errors: [], pushIds: [] };

  if (pushDefs.length === 0) return result;

  // Build insert records for all pushes that have matching outputs
  const pushRecords = pushDefs
    .filter(def => payload.outputs[def.pushType])
    .map(def => {
      const output = payload.outputs[def.pushType];
      return {
        author_id: payload.authorId,
        book_id: payload.bookId,
        source_builder: payload.sourceBuilder,
        destination_builder: def.destinationBuilder,
        push_type: def.pushType,
        title: output.title || def.label,
        description: output.description || def.description,
        content_json: output.content,
        status: "pending" as const,
        source_asset_id: payload.sourceAssetId || null,
        destination_table: def.destinationTable || null,
      };
    });

  if (pushRecords.length === 0) return result;

  // Batch insert all push records
  const { data, error } = await supabase
    .from("cross_builder_pushes" as any)
    .insert(pushRecords as any)
    .select("id");

  if (error) {
    result.success = false;
    result.errors.push(error.message);
    return result;
  }

  result.pushed = pushRecords.length;
  result.pushIds = (data as any[])?.map((r: any) => r.id) || [];
  return result;
}

/**
 * Fetch pending pushes for a specific destination builder.
 */
export async function fetchPendingPushes(
  authorId: string,
  destinationBuilder: string,
  bookId?: string
) {
  let query = supabase
    .from("cross_builder_pushes" as any)
    .select("*")
    .eq("author_id", authorId)
    .eq("destination_builder", destinationBuilder)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (bookId) {
    query = query.eq("book_id", bookId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching pending pushes:", error);
    return [];
  }
  return (data as any[]) || [];
}

/**
 * Fetch all pushes originating from a specific source builder + book.
 */
export async function fetchOutgoingPushes(
  authorId: string,
  sourceBuilder: string,
  bookId: string
) {
  const { data, error } = await supabase
    .from("cross_builder_pushes" as any)
    .select("*")
    .eq("author_id", authorId)
    .eq("source_builder", sourceBuilder)
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching outgoing pushes:", error);
    return [];
  }
  return (data as any[]) || [];
}

/**
 * Mark a push as imported (author accepted it).
 */
export async function markPushImported(pushId: string, destinationRecordId?: string) {
  const { error } = await supabase
    .from("cross_builder_pushes" as any)
    .update({
      status: "imported",
      imported_at: new Date().toISOString(),
      destination_record_id: destinationRecordId || null,
    } as any)
    .eq("id", pushId);

  if (error) {
    console.error("Error marking push as imported:", error);
    return false;
  }
  return true;
}

/**
 * Dismiss a push (author doesn't want it).
 */
export async function dismissPush(pushId: string) {
  const { error } = await supabase
    .from("cross_builder_pushes" as any)
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
    } as any)
    .eq("id", pushId);

  if (error) {
    console.error("Error dismissing push:", error);
    return false;
  }
  return true;
}

/**
 * Get push statistics for a given book across all builders.
 */
export async function getPushStats(authorId: string, bookId: string) {
  const { data, error } = await supabase
    .from("cross_builder_pushes" as any)
    .select("destination_builder, status")
    .eq("author_id", authorId)
    .eq("book_id", bookId);

  if (error || !data) return { pending: 0, imported: 0, dismissed: 0, byBuilder: {} as Record<string, number> };

  const stats = {
    pending: 0,
    imported: 0,
    dismissed: 0,
    byBuilder: {} as Record<string, number>,
  };

  for (const row of data as any[]) {
    if (row.status === "pending") stats.pending++;
    if (row.status === "imported") stats.imported++;
    if (row.status === "dismissed") stats.dismissed++;

    if (row.status === "pending") {
      stats.byBuilder[row.destination_builder] = (stats.byBuilder[row.destination_builder] || 0) + 1;
    }
  }

  return stats;
}
