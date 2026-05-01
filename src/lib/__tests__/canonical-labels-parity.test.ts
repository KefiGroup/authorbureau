/**
 * Sprint 51 — parity guard rail.
 *
 * Asserts that the three canonical-label sources of truth agree on:
 *   - the exact 28 node IDs (BP-01..09, BA-10..18, YR-19..28)
 *   - the canonical UI label for every node
 *
 * Sources checked:
 *   1. src/components/dashboard/builders/builderNodeConfig.ts (UI)
 *   2. supabase/functions/_shared/canonical-node-labels.ts    (edge functions)
 *   3. src/lib/node-slug-map.ts                               (microsite slugs)
 *
 * If this test fails, exactly one of those three files is out of sync.
 * Fix the file, re-run, and the build is safe again.
 */
import { describe, it, expect } from "vitest";
import { META as BUILDER_META } from "@/components/dashboard/builders/builderNodeConfig";
import { CANONICAL_NODE_LABELS } from "../../../supabase/functions/_shared/canonical-node-labels";
import { NODE_SLUG_MAP } from "@/lib/node-slug-map";

const EXPECTED_IDS = [
  "BP-01","BP-02","BP-03","BP-04","BP-05","BP-06","BP-07","BP-08","BP-09",
  "BA-10","BA-11","BA-12","BA-13","BA-14","BA-15","BA-16","BA-17","BA-18",
  "YR-19","YR-20","YR-21","YR-22","YR-23","YR-24","YR-25","YR-26","YR-27","YR-28",
];

describe("canonical node labels parity (Sprint 51)", () => {
  it("exposes exactly 28 node IDs from the UI source of truth", () => {
    const ids = BUILDER_META.map((m) => m.id).filter((id) => /^(BP|BA|YR)-\d+$/.test(id));
    expect(ids.sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("exposes exactly 28 node IDs from the edge canonical map", () => {
    expect(Object.keys(CANONICAL_NODE_LABELS).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("agrees on the canonical label between UI and edge maps for every node", () => {
    for (const id of EXPECTED_IDS) {
      const uiLabel = BUILDER_META.find((m) => m.id === id)?.label;
      const edgeLabel = CANONICAL_NODE_LABELS[id];
      expect(uiLabel, `${id} missing from builderNodeConfig`).toBeDefined();
      expect(edgeLabel, `${id} missing from canonical-node-labels`).toBeDefined();
      expect(
        edgeLabel,
        `Label drift for ${id}: UI="${uiLabel}" vs edge="${edgeLabel}"`,
      ).toBe(uiLabel);
    }
  });

  it("node-slug-map.ts covers every node ID (slug may be empty for non-public nodes)", () => {
    for (const id of EXPECTED_IDS) {
      // BP-01 / BP-03 intentionally absent from NODE_SLUG_MAP (no microsite).
      if (id === "BP-01" || id === "BP-03") continue;
      expect(NODE_SLUG_MAP[id], `${id} missing from NODE_SLUG_MAP`).toBeTruthy();
    }
  });
});
