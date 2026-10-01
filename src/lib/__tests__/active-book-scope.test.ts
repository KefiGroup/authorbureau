import { describe, it, expect } from "vitest";
import { readRouteBookId, resolveScopedBookId } from "@/lib/active-book-scope";

const VIP = "dee3e31e-12d4-43ff-b8ad-9a7f70e37d1b";
const VIW = "45e945ae-5542-409c-a9c1-47a60981fd7f";

describe("active book scope (DATA-01 regression)", () => {
  it("reads bookId from the query string", () => {
    expect(readRouteBookId(`?bookId=${VIP}`, "/dashboard")).toBe(VIP);
  });

  it("reads the legacy book param", () => {
    expect(readRouteBookId(`?book=${VIP}`, "/dashboard")).toBe(VIP);
  });

  it("reads the book id out of the builder path", () => {
    expect(readRouteBookId("", `/dashboard/book/${VIP}/build/YR-20`)).toBe(VIP);
  });

  it("never falls back to another book when none is in the route", () => {
    expect(readRouteBookId("", "/dashboard")).toBeNull();
  });

  it("ignores a malformed book id", () => {
    expect(readRouteBookId("?bookId=not-a-uuid", "/dashboard")).toBeNull();
  });

  it("prefers an explicit override over the route", () => {
    expect(resolveScopedBookId(VIW, `?bookId=${VIP}`, "/dashboard")).toBe(VIW);
  });

  it("uses the route when the override is missing or invalid", () => {
    expect(resolveScopedBookId(null, `?bookId=${VIP}`, "/dashboard")).toBe(VIP);
    expect(resolveScopedBookId("garbage", `?bookId=${VIP}`, "/dashboard")).toBe(VIP);
  });
});

import { rememberWorkspaceBookId, resolveWorkspaceBookId, resolveFunnelBookId } from "../active-book-scope";

describe("workspace book scope", () => {
  const A = "dee3e31e-12d4-43ff-b8ad-9a7f70e37d1b";
  it("falls back to the book last opened in this tab", () => {
    window.history.replaceState(null, "", "/dashboard?section=review-products");
    rememberWorkspaceBookId(A);
    expect(resolveWorkspaceBookId()).toBe(A);
    rememberWorkspaceBookId(null);
    expect(resolveWorkspaceBookId()).toBeNull();
  });
});

describe("funnel generation book scope", () => {
  const SUCK = "e5b857ac-48ce-4ffc-a761-3c09e95a318e";

  it("prefers the node's own book_id", () => {
    expect(resolveFunnelBookId(VIP, SUCK)).toBe(VIP);
    expect(resolveFunnelBookId(VIP, "all")).toBe(VIP);
    expect(resolveFunnelBookId(VIP, null)).toBe(VIP);
  });

  it("falls back to the currently selected specific book scope", () => {
    expect(resolveFunnelBookId(null, SUCK)).toBe(SUCK);
    expect(resolveFunnelBookId(undefined, SUCK)).toBe(SUCK);
  });

  it("keeps book_id null for All books and Unattributed scopes", () => {
    expect(resolveFunnelBookId(null, "all")).toBeNull();
    expect(resolveFunnelBookId(null, "unattributed")).toBeNull();
    expect(resolveFunnelBookId(undefined, undefined)).toBeNull();
  });
});
