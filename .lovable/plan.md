
## Goal
Make BP-06 and BA-10 through BA-18 use the exact same working book-title resolution pattern as BP-07 so Abby shows the real title (`Be SUCKcessful`) instead of the placeholder `your book`.

## What is different today
- **BP-07** works because it does two things:
  1. Uses `useAuthorBook()` for the primary `detectedBookTitle`
  2. Adds a local fallback state `resolvedBookTitle`, populated from:
     - `author_context.book_title` by `authorId`
     - then `books.title` by `profile.user_id || authorId`
  3. Renders:
     ```tsx
     (detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"
     ```

- **BP-06** already appears to match that pattern in current source, so the implementation step there will be a careful re-check and no-op unless there is any small mismatch in the live file.
- **BA-10, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18** still render:
  ```tsx
  detectedBookTitle || "your book"
  ```
  so they fall through to the placeholder.
- **BA-11** is slightly different: its intro currently does not interpolate a book title at all, so it also needs the BP-07 fallback logic plus intro copy updated to reference the resolved title.

## Implementation plan
1. **Mirror BP-07 state setup**
   - In **BP-06** and each **BA builder from BA-10 to BA-18**, ensure there is:
     ```tsx
     const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");
     ```
   - Do not change BP-07.

2. **Mirror BP-07 data lookup**
   - In each target builder’s initial `useEffect`, after loading `author_profiles`, add the same fallback lookup sequence used in BP-07:
     - query `author_context.book_title` using `authorId`
     - if absent, query `books.title` using `profile?.user_id || authorId`
     - store result in `resolvedBookTitle`
   - Keep all existing draft-loading / node-loading logic intact.

3. **Mirror BP-07 render expression**
   - Replace plain placeholder rendering in each target intro with:
     ```tsx
     {(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}
     ```
   - This ensures the hook wins when valid, but the local fallback is used whenever the hook only returns the placeholder.

4. **Apply node-specific intro copy safely**
   - For **BA-10, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18**: keep existing intro text, only swap the book-title interpolation.
   - For **BA-11**: keep the audiobook messaging, but insert the resolved title into the sentence so it matches the same working title behavior rather than remaining title-less.

5. **Do not touch**
   - **BP-07**
   - Any BP nodes not requested
   - Draft loading, publish flow, generation functions, or gating logic unless needed to keep the files compiling.

## Files to update
- `src/components/dashboard/builders/bp06/BP06Builder.tsx`
- `src/components/dashboard/builders/ba10/BA10Builder.tsx`
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- `src/components/dashboard/builders/ba12/BA12Builder.tsx`
- `src/components/dashboard/builders/ba13/BA13Builder.tsx`
- `src/components/dashboard/builders/ba14/BA14Builder.tsx`
- `src/components/dashboard/builders/ba15/BA15Builder.tsx`
- `src/components/dashboard/builders/ba16/BA16Builder.tsx`
- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
- `src/components/dashboard/builders/ba18/BA18Builder.tsx`

## Verification
1. Project compiles with no TypeScript/import errors.
2. **BP-07** remains unchanged and still shows `Be SUCKcessful`.
3. **BP-06** shows `Be SUCKcessful` in Abby’s intro using the BP-07 pattern.
4. **BA-10 through BA-18** all stop showing the placeholder and render `Be SUCKcessful` when `author_context` or `books` resolves.
5. Book-profile gating still works correctly for users with no book.

## Technical detail
The standardized display expression to use everywhere is:
```tsx
(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"
```

The fallback query pattern to mirror from BP-07 is:
```tsx
const { data: ctx } = await supabase
  .from("author_context")
  .select("book_title")
  .eq("author_id", authorId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (ctx?.book_title) {
  setResolvedBookTitle(ctx.book_title);
} else {
  const { data: book } = await supabase
    .from("books")
    .select("title")
    .eq("author_id", profile?.user_id || authorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (book?.title) setResolvedBookTitle(book.title);
}
```
