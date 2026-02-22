const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

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
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "SHARED_BACKEND_SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    // 1. Fetch author_profiles by user_email
    const profileUrl = `${SHARED_BACKEND_URL}/rest/v1/author_profiles?user_email=eq.${encodeURIComponent(email)}&select=*`;
    const profileRes = await fetch(profileUrl, { headers });
    const profileBody = await profileRes.text();
    console.log("Profile response:", profileRes.status, profileBody.slice(0, 500));

    let profiles: any[] = [];
    try { profiles = JSON.parse(profileBody); } catch { /* keep empty */ }

    if (!profileRes.ok) {
      return new Response(JSON.stringify({ error: "Profile fetch failed", status: profileRes.status, body: profileBody.slice(0, 500) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. If we found a profile, look up books
    let books: any[] = [];
    if (Array.isArray(profiles) && profiles.length > 0) {
      const userId = profiles[0].user_id;
      if (userId) {
        const booksUrl = `${SHARED_BACKEND_URL}/rest/v1/books?author_id=eq.${userId}&select=*`;
        const booksRes = await fetch(booksUrl, { headers });
        const booksBody = await booksRes.text();
        console.log("Books response:", booksRes.status, booksBody.slice(0, 500));
        try { books = JSON.parse(booksBody); } catch { /* keep empty */ }
      }
    }

    return new Response(
      JSON.stringify({
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
