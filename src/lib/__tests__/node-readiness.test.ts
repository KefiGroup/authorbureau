import { describe, it, expect } from "vitest";
import { hasRequiredAssets, AUTHOR_LEVEL_NODES, COMMERCE_NODES } from "@/lib/node-readiness";

/**
 * Fixture-based snapshot of the readiness rules. Any change to
 * supabase/functions/_shared/node-readiness.ts surfaces here as a diff,
 * so the dual-engine drift class (frontend vs author-stats edge function)
 * stays visible in PR review.
 *
 * If you intentionally change a rule, update the matching expectation here.
 */

describe("AUTHOR_LEVEL_NODES", () => {
  it("contains the canonical 16 author-scoped nodes", () => {
    const expected = [
      "BP-01", "BP-03", "BA-14", "BA-15", "BA-16", "BA-18",
      "YR-19", "YR-20", "YR-21", "YR-22", "YR-23",
      "YR-24", "YR-25", "YR-26", "YR-27", "YR-28",
    ];
    expect(AUTHOR_LEVEL_NODES.size).toBe(expected.length);
    for (const id of expected) expect(AUTHOR_LEVEL_NODES.has(id)).toBe(true);
  });
});

describe("hasRequiredAssets — BP-04 Author Microsite", () => {
  it("rejects empty content", () => {
    expect(hasRequiredAssets("BP-04", {})).toBe(false);
  });
  it("rejects autofilled cta_label only (the regression we're guarding)", () => {
    expect(hasRequiredAssets("BP-04", { cta_label: "Get the Book" })).toBe(false);
  });
  it("rejects hero_headline alone (no supporting field)", () => {
    expect(hasRequiredAssets("BP-04", { hero_headline: "My Book" })).toBe(false);
  });
  it("accepts hero_headline + about_long", () => {
    expect(
      hasRequiredAssets("BP-04", { hero_headline: "My Book", about_long: "Long-form story." })
    ).toBe(true);
  });
  it("accepts sections[] + about_short", () => {
    expect(
      hasRequiredAssets("BP-04", {
        sections: [{ kind: "hero", body: "x" }],
        about_short: "Bio.",
      })
    ).toBe(true);
  });
  it("rejects sections[] alone (no supporting field)", () => {
    expect(hasRequiredAssets("BP-04", { sections: [{ kind: "hero" }] })).toBe(false);
  });
  it("accepts hero_headline + lead_magnet_id (truthy non-string)", () => {
    expect(
      hasRequiredAssets("BP-04", { hero_headline: "Title", lead_magnet_id: "lm_123" })
    ).toBe(true);
  });
});

describe("hasRequiredAssets — BA-13 Group Coaching", () => {
  it("rejects empty", () => {
    expect(hasRequiredAssets("BA-13", {})).toBe(false);
  });
  it("accepts populated sessions[]", () => {
    expect(hasRequiredAssets("BA-13", { sessions: [{ week: 1 }] })).toBe(true);
  });
  it("accepts a schedule string", () => {
    expect(hasRequiredAssets("BA-13", { schedule: "Tuesdays 9am" })).toBe(true);
  });
});

describe("hasRequiredAssets — BA-14 Podcast", () => {
  it("RSS path: accepts rss_url + 1 episode", () => {
    expect(
      hasRequiredAssets("BA-14", {
        rss_url: "https://feeds.example.com/show",
        episodes: [{ id: "e1" }],
      })
    ).toBe(true);
  });
  it("RSS path: rejects rss without episodes", () => {
    expect(hasRequiredAssets("BA-14", { rss_url: "https://x", episodes: [] })).toBe(false);
  });
  it("Activated path: rejects activated + 1 episode + title (must be ≥ 2)", () => {
    expect(
      hasRequiredAssets("BA-14", {
        activated: true,
        episodes: [{ id: "e1" }],
        show_title: "My Show",
      })
    ).toBe(false);
  });
  it("Activated path: accepts activated + 2 episodes + title", () => {
    expect(
      hasRequiredAssets("BA-14", {
        activated: true,
        episodes: [{ id: "e1" }, { id: "e2" }],
        show_title: "My Show",
      })
    ).toBe(true);
  });
  it("Activated path: rejects activated + 2 episodes WITHOUT title", () => {
    expect(
      hasRequiredAssets("BA-14", {
        activated: true,
        episodes: [{ id: "e1" }, { id: "e2" }],
      })
    ).toBe(false);
  });
});

describe("hasRequiredAssets — BA-15 Press / Media", () => {
  it("rejects empty", () => {
    expect(hasRequiredAssets("BA-15", {})).toBe(false);
  });
  it("accepts string press_release + outlets", () => {
    expect(
      hasRequiredAssets("BA-15", {
        press_release: "FOR IMMEDIATE RELEASE...",
        target_media_outlets: [{ name: "NYT" }],
      })
    ).toBe(true);
  });
  it("rejects object press_release with only headline (the regression we're guarding)", () => {
    expect(
      hasRequiredAssets("BA-15", {
        press_release: { headline: "Author wins prize" },
        target_media_outlets: [{ name: "NYT" }],
      })
    ).toBe(false);
  });
  it("accepts object press_release with headline + body", () => {
    expect(
      hasRequiredAssets("BA-15", {
        press_release: { headline: "Author wins prize", body: "Full body copy." },
        target_media_outlets: [{ name: "NYT" }],
      })
    ).toBe(true);
  });
  it("rejects when outlets are missing", () => {
    expect(
      hasRequiredAssets("BA-15", {
        press_release: { headline: "H", body: "B" },
      })
    ).toBe(false);
  });
  it("accepts legacy media_list field", () => {
    expect(
      hasRequiredAssets("BA-15", {
        press_release: "string release",
        media_list: [{ name: "WaPo" }],
      })
    ).toBe(true);
  });
});

describe("hasRequiredAssets — generic / default gate", () => {
  it("rejects null/undefined/non-object", () => {
    expect(hasRequiredAssets("BP-06", null)).toBe(false);
    expect(hasRequiredAssets("BP-06", undefined)).toBe(false);
    expect(hasRequiredAssets("BP-06", "string" as any)).toBe(false);
  });
  it("rejects empty object", () => {
    expect(hasRequiredAssets("BP-06", {})).toBe(false);
  });
  it("accepts any single key for non-gated nodes", () => {
    expect(hasRequiredAssets("BP-06", { workbook_url: "x" })).toBe(true);
  });
});
