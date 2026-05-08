// Canonical resolver for author_profiles.id given an auth.users.id.
//
// CRITICAL: every `public.*.author_id` column (books.author_id,
// generated_assets.author_id, author_nodes.author_id, courses.author_id,
// audiobooks.author_id, email_flows.author_id, etc.) is a foreign key to
// `author_profiles.id` — NOT `auth.users.id`. They only happened to be the
// same UUID for very early accounts; for every newer author they are
// different, which is why Abby kept silently returning empty results.
//
// Always call this helper before any `.eq("author_id", ...)` query in an
// edge function. Pass an admin (service-role) Supabase client.

export async function resolveAuthorId(
  adminClient: any,
  userId: string | null | undefined,
  email?: string | null,
): Promise<string | null> {
  if (!userId) return null;

  // 1. Look up existing profile
  const { data: existing } = await adminClient
    .from("author_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  // 2. Auto-create a minimal profile so we never silently 404 a real user.
  //    This mirrors what save-book / save-author-profile do.
  const fallbackName =
    (email || "").split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Author";

  const { data: created, error } = await adminClient
    .from("author_profiles")
    .insert({
      user_id: userId,
      pen_name: fallbackName,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[resolve-author-id] insert failed:", error.message);
    return null;
  }
  return (created?.id as string) || null;
}
