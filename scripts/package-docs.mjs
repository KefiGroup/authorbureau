#!/usr/bin/env node
/**
 * scripts/package-docs.mjs
 *
 * Zips /docs into /mnt/documents/authors-bureau-docs-v3.zip for download.
 *
 * Run: node scripts/package-docs.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = "/mnt/documents";
const OUT_FILE = resolve(OUT_DIR, "authors-bureau-docs-v3.8.zip");
const SRC = resolve(process.cwd(), "docs");

if (!existsSync(SRC)) {
  console.error(`Missing source: ${SRC}`);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
if (existsSync(OUT_FILE)) rmSync(OUT_FILE);

// Use system zip via nix if not available; fall back to node implementation.
let r = spawnSync("zip", ["-r", "-q", OUT_FILE, "docs"], { stdio: "inherit" });
if (r.status !== 0) {
  // Fallback via nix
  r = spawnSync(
    "nix",
    ["run", "nixpkgs#zip", "--", "-r", "-q", OUT_FILE, "docs"],
    { stdio: "inherit" }
  );
}
if (r.status !== 0) {
  console.error("zip failed");
  process.exit(r.status ?? 1);
}
console.log(`Packaged: ${OUT_FILE}`);
