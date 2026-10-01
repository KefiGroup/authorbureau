// Pure helpers for the funnels-manage "set_book" action.
// Kept dependency-free so the same code is unit-tested from vitest.
//
// Contract: changing a funnel's book touches ONLY `book_id` (+ updated_at).
// Copy, stages, type, title, slug, status, publication fields and any lead /
// CRM rows are never part of the patch.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts a book uuid or null (= Unattributed). Anything else is invalid. */
export function normalizeBookAssociation(input: unknown): { ok: true; bookId: string | null } | { ok: false } {
  if (input === null) return { ok: true, bookId: null };
  if (typeof input === "string" && UUID_RE.test(input)) return { ok: true, bookId: input };
  return { ok: false };
}

/** The only columns the set_book action is allowed to write. */
export function buildBookAssociationPatch(bookId: string | null, now: Date = new Date()) {
  return { book_id: bookId, updated_at: now.toISOString() } as const;
}
