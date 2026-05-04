# Bug: Bulk proposal (and other exports) download wrong book's content

## What you're seeing
You're on **Be Suckcessful** in BP-09. You click *Download HTML/PDF* on the Bulk-order proposal and the file contains **Invest Like Buffett for Parents** content (different book on your account).

## Root cause
This is a Builder Book Resolution violation in 4 export edge functions plus 3 frontend call sites. The exports completely ignore which book you have open and instead grab the **most recently created** book on your account.

Specifically, every one of these functions does:

```ts
// WRONG — picks newest book regardless of what user is viewing
author_context ... eq("author_id", author_id).order("created_at", desc).limit(1)
author_nodes   ... eq("author_id", author_id).eq("node_id", "BP-09").single()
```

`author_nodes` already has a `book_id` column (confirmed). The exports just aren't filtering on it, and the frontend isn't even sending `book_id` for 3 of the 4 calls. *Invest Like Buffett* was your most recent book, so it always wins.

## Fix (5 small, surgical edits)

### 1. Frontend — send `book_id` (3 call sites, 1-line each)

**`src/components/dashboard/builders/bp09/BP09Builder.tsx`**
- `downloadDoc(...)` (line ~216): add `book_id: bookId` to the JSON body
- `generateSlides(...)`: same — add `book_id: bookId` to body

**`src/components/dashboard/builders/bp08/BP08Builder.tsx`**
- `downloadEditionsDocx()` (line 291): add `book_id: activeBookId`
- `downloadOrderForm()` (line 320): add `book_id: activeBookId`

### 2. Backend — resolve by `book_id` (4 edge functions)

In each of:
- `supabase/functions/export-bp09-handout/index.ts`
- `supabase/functions/export-bp09-slides/index.ts`
- `supabase/functions/export-bp08-editions-docx/index.ts`
- `supabase/functions/export-bp08-order-form/index.ts`

Replace the two queries with book-scoped versions:

```ts
const { author_id, book_id /*, ...existing*/ } = await req.json();

// Title: prefer per-book author_context, fall back to books table
let bookTitle = "Your Book";
if (book_id) {
  const { data: ctx } = await supabase
    .from("author_context").select("book_title")
    .eq("author_id", author_id).eq("book_id", book_id).maybeSingle();
  if (ctx?.book_title) bookTitle = ctx.book_title;
  else {
    const { data: bk } = await supabase
      .from("books").select("title").eq("id", book_id).maybeSingle();
    if (bk?.title) bookTitle = bk.title;
  }
}

// Node content: scope to this book
let nodeQuery = supabase.from("author_nodes")
  .select("content_json")
  .eq("author_id", author_id)
  .eq("node_id", NODE_ID);
if (book_id) nodeQuery = nodeQuery.eq("book_id", book_id);
const { data: node } = await nodeQuery.maybeSingle();
if (!node?.content_json) throw new Error(`${NODE_ID} content not found for this book`);
```

Backwards compatible: if an old client sends no `book_id`, behaviour is unchanged (falls back to current "latest" logic), so no broken downloads during the rollout.

### 3. Deploy the 4 edge functions

`export-bp09-handout`, `export-bp09-slides`, `export-bp08-editions-docx`, `export-bp08-order-form`.

## Verification
After deploy, on the **Be Suckcessful** book, click *Download HTML/PDF* on the Bulk-order proposal — the file should contain Be Suckcessful tiers, not Invest Like Buffett. Repeat the test from the Invest Like Buffett book to confirm the other direction still works.

## Out of scope
No DB migration, no canonical-label change, no schema change. Pure data-scoping fix.
