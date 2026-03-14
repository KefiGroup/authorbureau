

# Plan: Add push-to-shared-backend call in save-book

## What changes

After a book is successfully inserted in the `save-book` edge function (line 318), add a non-fatal call to the shared backend's `receive-book-from-ab` endpoint. This sends the book data (title, description, content, author info) to the shared backend so it appears in the Publishing Studio as a draft.

## Technical approach

**File: `supabase/functions/save-book/index.ts`**

After the successful book insert (after line 318, before the email notification block at line 328), add:

```text
// ─── Push to shared backend (non-fatal) ───
try {
  const crossSecret = Deno.env.get("CROSS_PLATFORM_SECRET");
  if (crossSecret) {
    const ownerEmail = isPlatformPush ? body.email : null;
    // For JWT path, resolve email
    let pushEmail = ownerEmail;
    if (!pushEmail) {
      const { data: { user: emailUser } } = await cloudAdmin.auth.admin.getUserById(userId);
      pushEmail = emailUser?.email || null;
    }
    if (pushEmail) {
      const pushRes = await fetch(
        `${SHARED_BACKEND_URL}/functions/v1/receive-book-from-ab`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform_secret: crossSecret,
            email: pushEmail,
            book: {
              source_book_id: newBook.id,
              title: bookData.title,
              subtitle: bookData.subtitle || null,
              description: bookData.description || null,
              content: bookData.description || bookData.title,
              author_name: authorName,
              author_bio: authorBio,
              cover_image_url: bookData.coverImageUrl || bookData.cover_image_url || null,
              genre: bookData.genre || null,
            },
          }),
        }
      );
      const pushData = await pushRes.json().catch(() => ({}));
      console.log("[save-book] Push to shared backend:", pushRes.status, pushData);
    }
  }
} catch (pushErr) {
  console.error("[save-book] Push to shared backend failed (non-fatal):", pushErr);
}
```

Key points:
- Uses the existing `CROSS_PLATFORM_SECRET` (already configured)
- Uses the existing `SHARED_BACKEND_URL` constant
- Sends `newBook.id` as `source_book_id` for deduplication
- Wrapped in try/catch so failures never block book creation
- For JWT-path users, resolves email via admin API
- For platform push users, uses the provided email

