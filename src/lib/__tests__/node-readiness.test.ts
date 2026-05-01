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

describe("hasRequiredAssets — generic / default gate (non-gated nodes)", () => {
  // Use BP-02 (lead magnets) — still on the generic gate.
  it("rejects null/undefined/non-object", () => {
    expect(hasRequiredAssets("BP-02", null)).toBe(false);
    expect(hasRequiredAssets("BP-02", undefined)).toBe(false);
    expect(hasRequiredAssets("BP-02", "string" as any)).toBe(false);
  });
  it("rejects empty object", () => {
    expect(hasRequiredAssets("BP-02", {})).toBe(false);
  });
  it("accepts any single key for non-gated nodes", () => {
    expect(hasRequiredAssets("BP-02", { magnet_url: "x" })).toBe(true);
  });
});

describe("COMMERCE_NODES set", () => {
  it("includes the 17 commerce-bearing nodes per the architecture", () => {
    const expected = [
      "BP-06", "BP-07", "BP-09",
      "BA-10", "BA-12", "BA-13", "BA-17",
      "YR-19", "YR-20", "YR-21", "YR-22", "YR-23",
      "YR-24", "YR-25", "YR-26", "YR-27", "YR-28",
    ];
    expect(COMMERCE_NODES.size).toBe(expected.length);
    for (const id of expected) expect(COMMERCE_NODES.has(id)).toBe(true);
  });
  it("does NOT gate non-commerce nodes (BP-01, BP-03, BP-04, BA-14, BA-15)", () => {
    for (const id of ["BP-01", "BP-03", "BP-04", "BA-14", "BA-15"]) {
      expect(COMMERCE_NODES.has(id)).toBe(false);
    }
  });
});

describe("hasRequiredAssets — Stripe Express never gates Live status", () => {
  // Authors Bureau is Merchant of Record. Author Stripe Express connection
  // is a back-office payout-method decision and must NEVER affect commerce
  // readiness or the X / 28 Live count.
  const goodYR19 = {
    title: "1:1 Coaching",
    stripe_price_id: "price_abc",
    session_type: "discovery_call",
  };
  const goodBP06 = { title: "WB", stripe_price_id: "price_x" };
  const goodYR22 = { title: "Corporate Training", price_usd: 5000, session_type: "cohort" };

  it("commerce node passes with no ctx", () => {
    expect(hasRequiredAssets("YR-19", goodYR19)).toBe(true);
    expect(hasRequiredAssets("BP-06", goodBP06)).toBe(true);
    expect(hasRequiredAssets("YR-22", goodYR22)).toBe(true);
  });
  it("ignores any legacy stripeConnected:false flag (no longer gates)", () => {
    expect(hasRequiredAssets("YR-19", goodYR19, { stripeConnected: false } as any)).toBe(true);
    expect(hasRequiredAssets("BP-06", goodBP06, { stripeConnected: false } as any)).toBe(true);
    expect(hasRequiredAssets("YR-22", goodYR22, { stripeConnected: false } as any)).toBe(true);
  });
  it("non-commerce node still passes regardless of any ctx", () => {
    const bp01 = { email_sequence_id: "seq_1", steps: [{ subject: "Hi" }] };
    expect(hasRequiredAssets("BP-01", bp01)).toBe(true);
    expect(hasRequiredAssets("BP-01", bp01, { stripeConnected: false } as any)).toBe(true);
  });
});

describe("hasRequiredAssets — BP-01 Email Marketing", () => {
  it("rejects empty", () => {
    expect(hasRequiredAssets("BP-01", {})).toBe(false);
  });
  it("rejects sequence_id without steps", () => {
    expect(hasRequiredAssets("BP-01", { email_sequence_id: "s_1" })).toBe(false);
  });
  it("accepts sequence_id + steps[]", () => {
    expect(
      hasRequiredAssets("BP-01", { email_sequence_id: "s_1", steps: [{ subject: "Hi" }] })
    ).toBe(true);
  });
  it("accepts legacy sequence_steps[]", () => {
    expect(
      hasRequiredAssets("BP-01", { sequence_steps: [{ subject: "Hi" }] })
    ).toBe(true);
  });
});

describe("hasRequiredAssets — BP-03 Social Media (Buffer-removed)", () => {
  it("rejects empty", () => {
    expect(hasRequiredAssets("BP-03", {})).toBe(false);
  });
  it("rejects buffer_connected:true alone (architecture removed Buffer)", () => {
    expect(hasRequiredAssets("BP-03", { buffer_connected: true })).toBe(false);
  });
  it("accepts posts_generated > 0", () => {
    expect(hasRequiredAssets("BP-03", { posts_generated: 12 })).toBe(true);
  });
  it("accepts content_calendar_id", () => {
    expect(hasRequiredAssets("BP-03", { content_calendar_id: "cal_1" })).toBe(true);
  });
  it("accepts populated posts[]", () => {
    expect(hasRequiredAssets("BP-03", { posts: [{ body: "hi" }] })).toBe(true);
  });
});

describe("hasRequiredAssets — BP-06 Workbook", () => {
  it("rejects without title", () => {
    expect(hasRequiredAssets("BP-06", { pdf_url: "x" })).toBe(false);
  });
  it("rejects title alone", () => {
    expect(hasRequiredAssets("BP-06", { title: "WB" })).toBe(false);
  });
  it("accepts title + pdf_url", () => {
    expect(hasRequiredAssets("BP-06", { title: "WB", pdf_url: "x" })).toBe(true);
  });
  it("accepts title + stripe_price_id (commerce signal)", () => {
    expect(
      hasRequiredAssets("BP-06", { title: "WB", stripe_price_id: "price_x" })
    ).toBe(true);
  });
});

describe("hasRequiredAssets — BP-07 Home Study Course", () => {
  it("rejects title alone", () => {
    expect(hasRequiredAssets("BP-07", { title: "HS" })).toBe(false);
  });
  it("accepts title + course_id", () => {
    expect(hasRequiredAssets("BP-07", { title: "HS", course_id: "c_1" })).toBe(true);
  });
  it("accepts title + price_usd > 0", () => {
    expect(hasRequiredAssets("BP-07", { title: "HS", price_usd: 197 })).toBe(true);
  });
});

describe("hasRequiredAssets — BP-09 Book Sales", () => {
  it("rejects title alone", () => {
    expect(hasRequiredAssets("BP-09", { title: "Book" })).toBe(false);
  });
  it("accepts title + amazon_url", () => {
    expect(
      hasRequiredAssets("BP-09", { title: "Book", amazon_url: "https://amzn.to/x" })
    ).toBe(true);
  });
  it("accepts title + sales_page_url", () => {
    expect(
      hasRequiredAssets("BP-09", { title: "Book", sales_page_url: "/buy" })
    ).toBe(true);
  });
});

describe("hasRequiredAssets — BA-10 Online Course", () => {
  it("rejects title alone", () => {
    expect(hasRequiredAssets("BA-10", { title: "OC" })).toBe(false);
  });
  it("accepts title + ≥1 module", () => {
    expect(
      hasRequiredAssets("BA-10", { title: "OC", modules: [{ title: "M1" }] })
    ).toBe(true);
  });
  it("accepts title + course_id", () => {
    expect(hasRequiredAssets("BA-10", { title: "OC", course_id: "c_1" })).toBe(true);
  });
});

describe("hasRequiredAssets — BA-11 Audiobook", () => {
  it("rejects empty", () => {
    expect(hasRequiredAssets("BA-11", {})).toBe(false);
  });
  it("accepts narration_script_url", () => {
    expect(hasRequiredAssets("BA-11", { narration_script_url: "https://s3/x.txt" })).toBe(true);
  });
  it("accepts acx_guide_generated:true", () => {
    expect(hasRequiredAssets("BA-11", { acx_guide_generated: true })).toBe(true);
  });
  it("accepts populated chapters[]", () => {
    expect(hasRequiredAssets("BA-11", { chapters: [{ id: 1 }] })).toBe(true);
  });
  it("rejects acx_guide_generated:false alone", () => {
    expect(hasRequiredAssets("BA-11", { acx_guide_generated: false })).toBe(false);
  });
});

describe("hasRequiredAssets — BA-12 Membership", () => {
  it("rejects title alone (membership requires recurring product)", () => {
    expect(hasRequiredAssets("BA-12", { title: "Inner Circle" })).toBe(false);
  });
  it("accepts title + stripe_price_id", () => {
    expect(
      hasRequiredAssets("BA-12", { title: "Inner Circle", stripe_price_id: "price_sub" })
    ).toBe(true);
  });
});

describe("hasRequiredAssets — BA-17 Bundles", () => {
  it("rejects bundle of one item", () => {
    expect(
      hasRequiredAssets("BA-17", { title: "Bundle", price_usd: 99, items: [{ id: "a" }] })
    ).toBe(false);
  });
  it("accepts ≥2 items + commerce signal", () => {
    expect(
      hasRequiredAssets("BA-17", { title: "Bundle", price_usd: 99, items: [{ id: "a" }, { id: "b" }] })
    ).toBe(true);
  });
});

describe("hasRequiredAssets — YR nodes (generic + session-style)", () => {
  it("YR-20 (non-session): accepts title + commerce", () => {
    expect(
      hasRequiredAssets("YR-20", { title: "VIP Day", price_usd: 5000 })
    ).toBe(true);
  });
  it("YR-20: rejects title alone", () => {
    expect(hasRequiredAssets("YR-20", { title: "VIP Day" })).toBe(false);
  });
  it("YR-19 (session-style): rejects title + commerce WITHOUT session_type/booking_url", () => {
    expect(
      hasRequiredAssets("YR-19", { title: "Coaching", price_usd: 1500 })
    ).toBe(false);
  });
  it("YR-19: accepts title + commerce + session_type", () => {
    expect(
      hasRequiredAssets("YR-19", { title: "Coaching", price_usd: 1500, session_type: "discovery" })
    ).toBe(true);
  });
  it("YR-23 mastermind: accepts title + commerce + booking_url", () => {
    expect(
      hasRequiredAssets("YR-23", { title: "MM", stripe_price_id: "price_x", booking_url: "https://book/x" })
    ).toBe(true);
  });
});
