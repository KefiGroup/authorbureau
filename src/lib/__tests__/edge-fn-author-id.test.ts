import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// Guard rail: prevent the recurring "books.author_id = auth.user.id" bug.
// Every public.*.author_id column FK's to author_profiles.id, NOT auth.users.id.
// Edge functions must resolve authorId via _shared/resolve-author-id.ts before
// any `.eq("author_id", …)` query.
describe("edge function author_id resolution", () => {
  it("never uses user.id directly as author_id", () => {
    let hits = "";
    try {
      hits = execSync(
        `rg --pcre2 -n "\\.eq\\((['\\"])author_id\\1,\\s*user\\.id\\)|author_id:\\s*user\\.id\\b|book\\.author_id !== user\\.id" supabase/functions/ || true`,
        { encoding: "utf8" }
      ).trim();
    } catch {
      hits = "";
    }
    expect(hits, `Forbidden pattern detected:\n${hits}\n\nUse resolveAuthorId() from supabase/functions/_shared/resolve-author-id.ts`).toBe("");
  });
});
