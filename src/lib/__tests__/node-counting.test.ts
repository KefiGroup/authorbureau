import { describe, it, expect } from "vitest";
import { isBuiltProductStatus, bookForCountedRow, countBuiltNodesByBook } from "@/lib/node-counting";
import { getMicrositeUrl } from "@/lib/node-slug-map";

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

describe("countBuiltNodesByBook", () => {
  it("counts only ready live author_nodes for their exact book", () => {
    const result = countBuiltNodesByBook(["book-a", "book-b"], [
      { node_id: "BP-02", status: "live", book_id: "book-a", ready: true },
      { node_id: "BP-02", status: "live", book_id: "book-a", ready: true },
      { node_id: "BP-06", status: "content_ready", book_id: "book-a", ready: true },
      { node_id: "BA-10", status: "live", book_id: "book-a", ready: false },
      { node_id: "BP-02", status: "live", book_id: "book-b", ready: true },
      { node_id: "YR-19", status: "live", book_id: null, ready: true },
      { node_id: "YR-20", status: "live", book_id: "unknown", ready: true },
    ]);
    expect(result).toEqual({ "book-a": ["BP-02"], "book-b": ["BP-02"] });
  });

  it("keeps the same node built for two books as two portfolio modules", () => {
    const result = countBuiltNodesByBook(["book-a", "book-b"], [
      { node_id: "BP-06", status: "live", book_id: "book-a", ready: true },
      { node_id: "BP-06", status: "live", book_id: "book-b", ready: true },
    ]);
    expect(Object.values(result).reduce((sum, ids) => sum + ids.length, 0)).toBe(2);
  });
});

describe("book-scoped public module links", () => {
  it("refuses to generate an ambiguous two-segment module URL", () => {
    expect(getMicrositeUrl("pauline-teo", "BP-06")).toBeNull();
  });

  it("generates the canonical author/book/module URL", () => {
    expect(getMicrositeUrl("pauline-teo", "BP-06", "value-investing-for-women"))
      .toBe("https://authorsbureau.com/pauline-teo/value-investing-for-women/workbook");
  });
});
