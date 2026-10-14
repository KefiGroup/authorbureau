import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Author headshots must never be centre-cropped (see AGENTS.md headshot rule).
const ROOT = join(__dirname, "..");
const EXCLUDE = ["components/admin/AuthorsTab.tsx"]; // intentional crop preview tool

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("author headshot framing", () => {
  it("never centre-crops an author photo", () => {
    const offenders: string[] = [];
    const imgRe = /<img\b[\s\S]*?\/?>/g;
    for (const file of walk(ROOT)) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
      if (EXCLUDE.includes(rel)) continue;
      const src = readFileSync(file, "utf8");
      for (const m of src.match(imgRe) ?? []) {
        if (!/(photo_url|photoUrl|authorPhoto|headshot)/.test(m)) continue;
        if (/object-cover/.test(m) && !/object-top|object-contain/.test(m)) {
          offenders.push(`${rel}: ${m.slice(0, 120)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
