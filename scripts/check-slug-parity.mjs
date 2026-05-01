#!/usr/bin/env node
/**
 * Sprint 51 — slug parity build check.
 *
 * Compares src/lib/node-slug-map.ts (NODE_SLUG_MAP) against the seeded
 * slugs in supabase/migrations/*node_registry* migration. Fails the build
 * with a clear diff if the two have drifted.
 *
 * Run via `npm test` or directly: `node scripts/check-slug-parity.mjs`
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

function loadTsSlugMap() {
  const src = readFileSync(join(ROOT, "src/lib/node-slug-map.ts"), "utf8");
  const block = src.match(/NODE_SLUG_MAP[^=]*=\s*{([\s\S]*?)};/);
  if (!block) throw new Error("Could not locate NODE_SLUG_MAP literal in node-slug-map.ts");
  const out = {};
  for (const line of block[1].split("\n")) {
    const m = line.match(/"([A-Z]{2}-\d{2})"\s*:\s*"([^"]*)"/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function loadMigrationSlugs() {
  const dir = join(ROOT, "supabase/migrations");
  const file = readdirSync(dir).find((f) => /node_registry|512a9065/.test(f));
  if (!file) throw new Error("Could not locate node_registry migration");
  const sql = readFileSync(join(dir, file), "utf8");
  // Match INSERT rows like  ('BP-02','Lead Magnet','build','B','free-gift', 2)
  const out = {};
  const re = /\(\s*'([A-Z]{2}-\d{2})'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*('([^']*)'|NULL)/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    out[m[1]] = m[3] ?? null;
  }
  return out;
}

const ts = loadTsSlugMap();
const db = loadMigrationSlugs();

const allIds = new Set([...Object.keys(ts), ...Object.keys(db)]);
const drift = [];

for (const id of [...allIds].sort()) {
  const t = ts[id] ?? null;
  const d = db[id] ?? null;
  // BP-01 / BP-03 are intentionally absent from TS (no microsite); DB stores NULL.
  if ((id === "BP-01" || id === "BP-03") && t === undefined) {
    if (d !== null) drift.push({ id, ts: "(absent)", db: d });
    continue;
  }
  if (t !== d) drift.push({ id, ts: t, db: d });
}

if (drift.length > 0) {
  console.error("\n[slug-parity] DRIFT detected between TS map and DB seed:\n");
  for (const row of drift) {
    console.error(`  ${row.id.padEnd(6)}  TS="${row.ts}"  vs  DB="${row.db}"`);
  }
  console.error(
    "\nFix one of:\n  - src/lib/node-slug-map.ts\n  - supabase/migrations/*node_registry*.sql\n",
  );
  process.exit(1);
}

console.log(`[slug-parity] OK — ${Object.keys(db).length} nodes, all slugs in sync.`);
