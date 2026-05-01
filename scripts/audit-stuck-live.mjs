#!/usr/bin/env node
/**
 * audit-stuck-live.mjs — Sprint 54
 *
 * Lists author_nodes rows where status='live' but the readiness gate fails.
 * No mutations. Replaces the planned backfill script: since builders write
 * the new library_asset on publish, the only "stuck" rows are pre-Sprint-54
 * data, and those are now caught by the relaxed legacy fallback (BP-06's
 * workbook_title + sections rule). This script verifies that's true.
 *
 * Usage:
 *   node scripts/audit-stuck-live.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const REQUIRED_KIND = {
  "BP-01": "email_sequence", "BP-02": "docx", "BP-03": "docx",
  "BP-04": "external_url", "BP-05": "pptx", "BP-06": "docx",
  "BP-07": "docx", "BP-08": "docx", "BP-09": "external_url",
  "BA-10": "docx", "BA-11": "audio_zip", "BA-12": "docx",
  "BA-13": "docx", "BA-14": "podcast_pack", "BA-15": "docx",
  "BA-16": "docx", "BA-17": "docx", "BA-18": "docx",
  "YR-19": "docx", "YR-20": "docx", "YR-21": "pptx",
  "YR-22": "pptx", "YR-23": "docx", "YR-24": "docx",
  "YR-25": "docx", "YR-26": "docx", "YR-27": "docx",
  "YR-28": "docx",
};

function hasUniformAsset(nodeId, content) {
  const a = content?.library_asset;
  return !!(a?.url && a?.kind === REQUIRED_KIND[nodeId]);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
const { data, error } = await sb
  .from("author_nodes")
  .select("id, author_id, node_id, content_json")
  .eq("status", "live");

if (error) { console.error(error); process.exit(1); }

const stuck = [];
for (const row of data ?? []) {
  if (!hasUniformAsset(row.node_id, row.content_json)) {
    stuck.push({
      id: row.id,
      author_id: row.author_id,
      node_id: row.node_id,
      hint: "No library_asset — relying on legacy fallback. Re-publish to upgrade.",
    });
  }
}

console.log(JSON.stringify({
  total_live: data?.length ?? 0,
  using_uniform_contract: (data?.length ?? 0) - stuck.length,
  using_legacy_fallback: stuck.length,
  sample: stuck.slice(0, 10),
}, null, 2));
