import { describe, expect, it } from "vitest";
import { getAvailableAssets } from "@/lib/nodeAssetRegistry";

describe("BP-02 starter-kit assets", () => {
  it("exposes all three stored Buffett resources without replacing the baseline file", () => {
    const content = {
      library_asset: { title: "Baseline Check", url: "https://example.test/baseline.pdf" },
      starter_kit_resources: {
        three_r_checklist: { url: "/generated/bp02/3r.pdf" },
        circle_of_competence: { url: "/generated/bp02/circle.pdf" },
        education_retirement_planner: { url: "/generated/bp02/planner.pdf" },
      },
    };

    expect(getAvailableAssets("BP-02", content).map((asset) => asset.label)).toEqual([
      "Buffett 3R One-Page Checklist",
      "Family Circle of Competence Worksheet",
      "Education vs. Retirement Bucket Planner",
    ]);
    expect(content.library_asset.title).toBe("Baseline Check");
  });
});