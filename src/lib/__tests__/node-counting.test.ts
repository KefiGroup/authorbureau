import { describe, it, expect } from "vitest";
import { isBuiltProductStatus, bookForCountedRow } from "@/lib/node-counting";

/**
 * Regression guard for the "X / 28" counters.
 * These two rules are what previously caused a book to report more modules
 * than it really had (draft rows counted, unstamped rows fell back onto the
 * oldest book).
 */

describe("isBuiltProductStatus", () => {
  it("counts finished rows", () => {
    expect(isBuiltProductStatus("published")).toBe(true);
    expect(isBuiltProductStatus("active")).toBe(true);
    expect(isBuiltProductStatus("live")).toBe(true);
  });
  it("never counts work in progress", () => {
    expect(isBuiltProductStatus("draft")).toBe(false);
    expect(isBuiltProductStatus("ready_for_review")).toBe(false);
    expect(isBuiltProductStatus("content_ready")).toBe(false);
    expect(isBuiltProductStatus(null)).toBe(false);
    expect(isBuiltProductStatus(undefined)).toBe(false);
  });
});

describe("bookForCountedRow", () => {
  it("counts a row only for its own book", () => {
    expect(bookForCountedRow("book-a")).toBe("book-a");
    expect(bookForCountedRow("book-a", "book-a")).toBe("book-a");
  });
  it("never counts a row for a different book", () => {
    expect(bookForCountedRow("book-a", "book-b")).toBeNull();
  });
  it("never falls back to another book when the row has no book", () => {
    expect(bookForCountedRow(null, "book-a")).toBeNull();
    expect(bookForCountedRow(undefined)).toBeNull();
  });
});
