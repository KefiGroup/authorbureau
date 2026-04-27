// One-time backfill: sync Pauline Teo's email pl@paulineteo.com → support@paulineteo.com
// Safe to delete after running once.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userId = "ef23c521-9cce-4d86-9128-dc687748b65b";
  const oldEmail = "pl@paulineteo.com";
  const newEmail = "support@paulineteo.com";

  const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });

  const { data: books, error: booksErr } = await supabase
    .from("books")
    .update({ owner_email: newEmail })
    .eq("owner_email", oldEmail)
    .select("id, title");

  await supabase.from("email_sync_log").insert({
    user_id: userId,
    old_email: oldEmail,
    new_email: newEmail,
    source: "manual_backfill_pauline",
    auth_updated: !authErr,
    books_updated_count: books?.length ?? 0,
    settings_updated: false,
    error_message: authErr?.message || booksErr?.message || null,
  });

  return new Response(
    JSON.stringify({
      success: !authErr,
      auth_error: authErr?.message ?? null,
      books_updated: books ?? [],
      books_error: booksErr?.message ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
