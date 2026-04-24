import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

async function resolveUser(token: string) {
  // Try shared backend first
  const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
  const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
  if (sharedUser) return sharedUser;

  // Fallback: try local cloud auth
  const cloudClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data: { user: cloudUser } } = await cloudClient.auth.getUser(token);
  return cloudUser;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await resolveUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, book_id, session_id, messages } = await req.json();

    // LOAD: get active session for book
    if (action === "load") {
      const { data } = await cloudAdmin
        .from("consultation_sessions")
        .select("id, messages")
        .eq("user_id", user.id)
        .eq("book_id", book_id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ session: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SAVE: upsert session
    if (action === "save") {
      if (session_id) {
        await cloudAdmin
          .from("consultation_sessions")
          .update({ messages, updated_at: new Date().toISOString() })
          .eq("id", session_id)
          .eq("user_id", user.id);
        return new Response(JSON.stringify({ id: session_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { data } = await cloudAdmin
          .from("consultation_sessions")
          .insert({
            user_id: user.id,
            book_id: book_id,
            messages,
            is_active: true,
          })
          .select("id")
          .single();
        return new Response(JSON.stringify({ id: data?.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // RESET: mark session inactive
    if (action === "reset") {
      if (session_id) {
        await cloudAdmin
          .from("consultation_sessions")
          .update({ is_active: false })
          .eq("id", session_id)
          .eq("user_id", user.id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // COUNT: check if any session exists for book (used by BookHubOverview)
    if (action === "count") {
      const { count } = await cloudAdmin
        .from("consultation_sessions")
        .select("id", { count: "exact", head: true })
        .eq("book_id", book_id)
        .eq("user_id", user.id);
      return new Response(JSON.stringify({ count: count ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("consultation-session error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
