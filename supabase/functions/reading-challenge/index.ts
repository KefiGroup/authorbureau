import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Resolve user ID from token (try local first, then shared backend)
    let userId = "";
    let email = "";
    const { data: localUser } = await admin.auth.getUser(token);
    if (localUser?.user?.id) {
      userId = localUser.user.id;
      email = localUser.user.email || "";
    } else {
      const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
      if (sharedKey) {
        const shared = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
        const { data: sharedUser } = await shared.auth.getUser(token);
        if (sharedUser?.user?.id) {
          userId = sharedUser.user.id;
          email = sharedUser.user.email || "";
        }
      }
    }
    if (!userId) {
      try {
        const p = JSON.parse(atob(token.split(".")[1]));
        if (p.sub) userId = p.sub;
        if (p.email) email = p.email;
      } catch {}
    }
    if (!userId) throw new Error("Could not resolve user");

    const { action, bookId, entryId, minutes } = await req.json();

    if (action === "start-challenge") {
      // Check if already active
      const { data: existing } = await admin
        .from("reading_challenge_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("book_id", bookId)
        .eq("status", "active")
        .maybeSingle();

      if (existing) throw new Error("You already have an active challenge for this book");

      const { data: entry, error } = await admin
        .from("reading_challenge_entries")
        .insert({ user_id: userId, book_id: bookId })
        .select("id")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, entryId: entry.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "log-reading") {
      // Verify entry ownership
      const { data: entry } = await admin
        .from("reading_challenge_entries")
        .select("id")
        .eq("id", entryId)
        .eq("user_id", userId)
        .single();

      if (!entry) throw new Error("Challenge entry not found");

      const { error } = await admin
        .from("reading_challenge_daily_logs")
        .insert({ entry_id: entryId, minutes_read: minutes || 2 });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error) {
    console.error("[reading-challenge]", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
