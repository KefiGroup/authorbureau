import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Fetch all author data in parallel
    const [
      profileRes,
      booksRes,
      coursesRes,
      homeStudyRes,
      audiobooksRes,
      podcastsRes,
      coachingRes,
      speakingRes,
      subscriberCountRes,
      emailFlowsRes,
    ] = await Promise.all([
      supabase
        .from("author_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("books")
        .select("title, subtitle, description, genre, cover_image_url, amazon_url, price, kindle_price, paperback_price, currency, badges, rating, pages, published_at, author_name")
        .eq("author_id", userId),
      supabase
        .from("courses")
        .select("title, description, price, currency, status, cover_image_url")
        .eq("author_id", userId),
      supabase
        .from("home_study_courses")
        .select("title, description, price, currency, status, duration_days")
        .eq("author_id", userId),
      supabase
        .from("audiobooks")
        .select("title, description, price, currency, status, duration_minutes")
        .eq("author_id", userId),
      supabase
        .from("podcasts")
        .select("title, description, status, episode_count, target_audience, tone")
        .eq("author_id", userId),
      supabase
        .from("coaching_packages")
        .select("title, description, price, currency, type, duration_minutes, sessions_count, status")
        .eq("author_id", userId),
      supabase
        .from("speaking_topics")
        .select("title, description, fee, fee_currency, duration_minutes, status")
        .eq("author_id", userId),
      supabase
        .from("author_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("author_id", userId)
        .eq("status", "active"),
      supabase
        .from("email_flows")
        .select("title, description, flow_type, status")
        .eq("author_id", userId),
    ]);

    const profile = profileRes.data;
    const books = booksRes.data || [];
    const courses = coursesRes.data || [];
    const homeStudy = homeStudyRes.data || [];
    const audiobooks = audiobooksRes.data || [];
    const podcasts = podcastsRes.data || [];
    const coaching = coachingRes.data || [];
    const speaking = speakingRes.data || [];
    const subscriberCount = subscriberCountRes.count || 0;
    const emailFlows = emailFlowsRes.data || [];

    // Build the Business Design File
    const designFile = {
      _meta: {
        version: "1.0",
        generated_at: new Date().toISOString(),
        source: "Authors Bureau",
        author_id: userId,
      },
      brand: {
        name: profile?.pen_name || user.user_metadata?.display_name || user.email,
        tagline: profile?.tagline || null,
        bio_short: profile?.bio_short || null,
        bio_long: profile?.bio_long || null,
        photo_url: profile?.photo_url || null,
        cover_photo_url: profile?.cover_photo_url || null,
        genres: profile?.genres || [],
        credentials: profile?.credentials || [],
        location: profile?.location_city
          ? `${profile.location_city}${profile.location_country ? `, ${profile.location_country}` : ""}`
          : null,
      },
      social_links: {
        website: profile?.website_url || null,
        linkedin: profile?.linkedin_url || null,
        twitter: profile?.twitter_url || null,
        instagram: profile?.instagram_url || null,
        youtube: profile?.youtube_url || null,
        amazon_author: profile?.amazon_author_profile_url || null,
      },
      books: books.map((b: any) => ({
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        genre: b.genre,
        cover_image_url: b.cover_image_url,
        amazon_url: b.amazon_url,
        pricing: {
          price: b.price,
          kindle_price: b.kindle_price,
          paperback_price: b.paperback_price,
          currency: b.currency,
        },
        badges: b.badges,
        pages: b.pages,
        published_at: b.published_at,
      })),
      products: {
        online_courses: courses.map((c: any) => ({
          title: c.title,
          description: c.description,
          price: c.price,
          currency: c.currency,
          status: c.status,
          cover_image_url: c.cover_image_url,
        })),
        home_study_courses: homeStudy.map((h: any) => ({
          title: h.title,
          description: h.description,
          price: h.price,
          currency: h.currency,
          status: h.status,
          duration_days: h.duration_days,
        })),
        audiobooks: audiobooks.map((a: any) => ({
          title: a.title,
          description: a.description,
          price: a.price,
          currency: a.currency,
          status: a.status,
          duration_minutes: a.duration_minutes,
        })),
        podcasts: podcasts.map((p: any) => ({
          title: p.title,
          description: p.description,
          status: p.status,
          episode_count: p.episode_count,
          target_audience: p.target_audience,
          tone: p.tone,
        })),
      },
      services: {
        coaching: coaching.map((c: any) => ({
          title: c.title,
          description: c.description,
          price: c.price,
          currency: c.currency,
          type: c.type,
          duration_minutes: c.duration_minutes,
          sessions_count: c.sessions_count,
          status: c.status,
        })),
        speaking: speaking.map((s: any) => ({
          title: s.title,
          description: s.description,
          fee: s.fee,
          currency: s.fee_currency,
          duration_minutes: s.duration_minutes,
          status: s.status,
        })),
        is_speaker: profile?.is_speaker || false,
        speaker_fee_range: profile?.speaker_fee_range || null,
      },
      audience: {
        subscriber_count: subscriberCount,
        email_flows: emailFlows.map((f: any) => ({
          title: f.title,
          description: f.description,
          type: f.flow_type,
          status: f.status,
        })),
      },
      website_requirements: {
        design_reference: "2percent.ai",
        suggested_pages: [
          "Home / Landing Page",
          "About the Author",
          "Books",
          books.length > 0 ? "Individual Book Pages" : null,
          courses.length > 0 ? "Online Courses" : null,
          coaching.length > 0 ? "Coaching & Services" : null,
          speaking.length > 0 ? "Speaking" : null,
          "Blog / Content Hub",
          "Contact",
          "Newsletter Signup",
        ].filter(Boolean),
        features: [
          "Custom domain support",
          "Responsive design",
          "SEO optimized",
          "Email capture forms",
          books.length > 0 ? "Book purchase CTAs" : null,
          courses.length > 0 ? "Course enrollment" : null,
          coaching.length > 0 ? "Coaching booking" : null,
        ].filter(Boolean),
      },
    };

    return new Response(JSON.stringify(designFile, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Error generating business design file:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate design file" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
