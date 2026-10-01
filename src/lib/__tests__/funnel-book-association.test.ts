import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildBookAssociationPatch,
  normalizeBookAssociation,
} from "../../../supabase/functions/_shared/funnel-book-association";

vi.mock("@/lib/get-active-token", () => ({
  getActiveToken: vi.fn(async () => "test-token"),
  fetchWithTimeout: vi.fn(),
}));

import { fetchWithTimeout } from "@/lib/get-active-token";
import { setFunnelBook } from "@/lib/funnels-api";

const BE_SUCKCESSFUL = "e5b857ac-48ce-4ffc-a761-3c09e95a318e";

const funnel = {
  id: "11111111-1111-1111-1111-111111111111",
  author_id: "author-1",
  node_id: "YR-23",
  book_id: null as string | null,
  funnel_type: "application",
  title: "SUCKCESS Executive Breakthrough Programme",
  slug: "suckcess-executive-breakthrough",
  headline: "H", subheadline: "S", body_copy: "B", cta_text: "Apply", cta_url: null,
  status: "draft",
  published_at: null,
  page_views: 12, conversions: 3,
  updated_at: "2026-09-01T00:00:00.000Z",
};
const leads = [{ id: "lead-1", funnel_id: funnel.id, book_id: null, email: "a@x.com" }];

describe("funnel book association (Change book)", () => {
  beforeEach(() => vi.mocked(fetchWithTimeout).mockReset());

  it("patch writes only book_id + updated_at", () => {
    const patch = buildBookAssociationPatch(BE_SUCKCESSFUL, new Date("2026-10-01T00:00:00Z"));
    expect(Object.keys(patch).sort()).toEqual(["book_id", "updated_at"]);
    expect(patch.book_id).toBe(BE_SUCKCESSFUL);
  });

  it("applying the patch preserves every other field and leaves leads untouched", () => {
    const leadsBefore = structuredClone(leads);
    const after = { ...funnel, ...buildBookAssociationPatch(BE_SUCKCESSFUL) };
    const { book_id: _b, updated_at: _u, ...restAfter } = after;
    const { book_id: _b2, updated_at: _u2, ...restBefore } = funnel;
    expect(restAfter).toEqual(restBefore);
    expect(after.book_id).toBe(BE_SUCKCESSFUL);
    expect(after.status).toBe("draft");
    expect(after.published_at).toBeNull();
    expect(leads).toEqual(leadsBefore);
  });

  it("accepts a uuid or null, rejects anything else", () => {
    expect(normalizeBookAssociation(BE_SUCKCESSFUL)).toEqual({ ok: true, bookId: BE_SUCKCESSFUL });
    expect(normalizeBookAssociation(null)).toEqual({ ok: true, bookId: null });
    expect(normalizeBookAssociation("all").ok).toBe(false);
    expect(normalizeBookAssociation(undefined).ok).toBe(false);
  });

  it("client sends only action, funnel_id and book_id", async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValue(
      new Response(JSON.stringify({ funnel: { ...funnel, book_id: BE_SUCKCESSFUL } }), { status: 200 }),
    );
    await setFunnelBook(funnel.id, BE_SUCKCESSFUL);
    const body = JSON.parse((vi.mocked(fetchWithTimeout).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ action: "set_book", funnel_id: funnel.id, book_id: BE_SUCKCESSFUL });
  });
});
