import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SERVICE_ROLE_KEY = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
    console.log("Key length:", SERVICE_ROLE_KEY?.length, "starts:", SERVICE_ROLE_KEY?.substring(0, 20), "dots:", SERVICE_ROLE_KEY?.split(".").length);
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "SHARED_BACKEND_SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      apikey: SHARED_ANON_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    // 1. Fetch author_profiles by user_email
    const profileUrl = `${SHARED_BACKEND_URL}/rest/v1/author_profiles?user_email=eq.${encodeURIComponent(email)}&select=*`;
    const profileRes = await fetch(profileUrl, { headers });
    const profileStatus = profileRes.status;
    const profileBody = await profileRes.text();

    let profiles: any[] = [];
    try {
      profiles = JSON.parse(profileBody);
    } catch {
      // keep empty
    }

    // 2. If we found a profile, look up books by that user_id
    let books: any[] = [];
    if (Array.isArray(profiles) && profiles.length > 0) {
      const userId = profiles[0].user_id;
      if (userId) {
        const booksUrl = `${SHARED_BACKEND_URL}/rest/v1/books?author_id=eq.${userId}&select=*`;
        const booksRes = await fetch(booksUrl, { headers });
        const booksBody = await booksRes.text();
        try {
          books = JSON.parse(booksBody);
        } catch {
          // keep empty
        }
      }
    }

    return new Response(
      JSON.stringify({
        profileStatus,
        profileCount: profiles.length,
        profiles,
        bookCount: Array.isArray(books) ? books.length : 0,
        books,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

