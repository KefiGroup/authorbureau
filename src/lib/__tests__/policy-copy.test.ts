import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Audit 2026-10-01 P1-01 / P1-02 / P0-03: author-facing copy must never
 * promise automatic social posting or publish a speaking fee schedule.
 */
const ROOTS = ["src", "supabase/functions"];
const BANNED: RegExp[] = [
  /scheduling \d+ posts per week/i,
  /auto-scheduled to your connected social/i,
  /across your connected social channels/i,
  /designing your fee schedule/i,
  /and a fee schedule/i,
  /across all 28 nodes/i,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

describe("policy copy", () => {
  it("contains no banned social-automation or speaking-fee phrases", () => {
    const hits: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        const text = readFileSync(file, "utf8");
        for (const re of BANNED) if (re.test(text)) hits.push(`${file}: ${re}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
