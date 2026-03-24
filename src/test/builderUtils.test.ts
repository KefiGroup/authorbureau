import { describe, it, expect } from "vitest";
import {
  extractBalancedJsonBlock,
  extractHomeStudyDaysFromContent,
  mapCoursePriceTier,
  buildCourseModulesFromStructure,
} from "@/components/dashboard/builders/builderUtils";

describe("builderUtils", () => {
  describe("extractBalancedJsonBlock", () => {
    it("extracts a JSON array from mixed content", () => {
      const input = 'Some text [1, 2, 3] more text';
      expect(extractBalancedJsonBlock(input, "[", "]")).toBe("[1, 2, 3]");
    });

    it("handles nested brackets", () => {
      const input = '{"a": {"b": 1}}';
      expect(extractBalancedJsonBlock(input, "{", "}")).toBe('{"a": {"b": 1}}');
    });

    it("returns null for unbalanced input", () => {
      expect(extractBalancedJsonBlock("no brackets here", "[", "]")).toBeNull();
    });

    it("handles strings with escaped quotes", () => {
      const input = '{"key": "value with \\"quotes\\""}';
      expect(extractBalancedJsonBlock(input, "{", "}")).toBe(input);
    });
  });

  describe("extractHomeStudyDaysFromContent", () => {
    it("parses a valid JSON array of days", () => {
      const input = JSON.stringify([
        { dayNumber: 1, theme: "Intro", concept: "Getting started" },
        { dayNumber: 2, theme: "Deep Dive", concept: "Core ideas" },
      ]);
      const days = extractHomeStudyDaysFromContent(input);
      expect(days).toHaveLength(2);
      expect(days[0].dayNumber).toBe(1);
      expect(days[0].theme).toBe("Intro");
      expect(days[1].concept).toBe("Core ideas");
    });

    it("handles snake_case keys", () => {
      const input = JSON.stringify([
        { day_number: 1, chapter_ref: "Ch1", action_plan: "Do X" },
      ]);
      const days = extractHomeStudyDaysFromContent(input);
      expect(days[0].chapterRef).toBe("Ch1");
      expect(days[0].actionPlan).toBe("Do X");
    });

    it("handles fenced code blocks", () => {
      const input = '```json\n[{"dayNumber": 1, "theme": "Test"}]\n```';
      const days = extractHomeStudyDaysFromContent(input);
      expect(days).toHaveLength(1);
      expect(days[0].theme).toBe("Test");
    });

    it("returns empty array for empty input", () => {
      expect(extractHomeStudyDaysFromContent("")).toEqual([]);
      expect(extractHomeStudyDaysFromContent("  ")).toEqual([]);
    });

    it("assigns UUIDs to days without IDs", () => {
      const input = JSON.stringify([{ dayNumber: 1, theme: "A" }]);
      const days = extractHomeStudyDaysFromContent(input);
      expect(days[0].id).toBeTruthy();
      expect(typeof days[0].id).toBe("string");
    });

    it("calculates weekNumber from dayNumber", () => {
      const input = JSON.stringify([
        { dayNumber: 1, theme: "D1" },
        { dayNumber: 8, theme: "D8" },
      ]);
      const days = extractHomeStudyDaysFromContent(input);
      expect(days[0].weekNumber).toBe(1);
      expect(days[1].weekNumber).toBe(2);
    });
  });

  describe("mapCoursePriceTier", () => {
    it("returns '0' for zero or negative prices", () => {
      expect(mapCoursePriceTier(0)).toBe("0");
      expect(mapCoursePriceTier(-10)).toBe("0");
    });

    it("returns '37' for prices up to $47", () => {
      expect(mapCoursePriceTier(20)).toBe("37");
      expect(mapCoursePriceTier(47)).toBe("37");
    });

    it("returns '147' for prices $48-$197", () => {
      expect(mapCoursePriceTier(100)).toBe("147");
      expect(mapCoursePriceTier(197)).toBe("147");
    });

    it("returns '297' for prices above $197", () => {
      expect(mapCoursePriceTier(300)).toBe("297");
      expect(mapCoursePriceTier(1000)).toBe("297");
    });

    it("returns '0' for NaN/Infinity", () => {
      expect(mapCoursePriceTier(NaN)).toBe("0");
      expect(mapCoursePriceTier(Infinity)).toBe("0");
    });
  });

  describe("buildCourseModulesFromStructure", () => {
    it("returns empty array for undefined input", () => {
      expect(buildCourseModulesFromStructure(undefined)).toEqual([]);
    });

    it("returns empty array for non-array input", () => {
      expect(buildCourseModulesFromStructure("not an array" as any)).toEqual([]);
    });

    it("builds modules from valid structure", () => {
      const structure = [
        {
          title: "Module 1",
          description: "Introduction",
          learning_objectives: ["Understand basics"],
          items: [
            { title: "Lesson 1", description: "First lesson" },
            { title: "Lesson 2", description: "Second lesson" },
          ],
        },
      ];
      const modules = buildCourseModulesFromStructure(structure);
      expect(modules).toHaveLength(1);
      expect(modules[0].title).toBe("Module 1");
      expect(modules[0].lessons).toHaveLength(2);
      expect(modules[0].lessons[0].title).toBe("Lesson 1");
    });

    it("creates fallback lesson when none provided", () => {
      const structure = [
        { title: "Empty Module", description: "No lessons" },
      ];
      const modules = buildCourseModulesFromStructure(structure);
      expect(modules[0].lessons).toHaveLength(1);
      expect(modules[0].lessons[0].title).toContain("Core Lesson");
    });

    it("handles string items as lesson titles", () => {
      const structure = [
        { title: "Module", items: ["Topic A", "Topic B"] },
      ];
      const modules = buildCourseModulesFromStructure(structure);
      expect(modules[0].lessons[0].title).toBe("Topic A");
      expect(modules[0].lessons[1].title).toBe("Topic B");
    });
  });
});
