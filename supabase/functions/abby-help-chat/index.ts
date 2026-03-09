import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Abby, the friendly AI help assistant for Authors Bureau — a platform that helps published authors turn their books into sustainable businesses.

Your role is to help users navigate the platform, answer questions, and provide guidance. You are warm, knowledgeable, and concise.

## Platform Knowledge

### What is Authors Bureau?
Authors Bureau helps published authors monetize their books through the ABBY Framework:
- **A**nalyze: Abby (the AI business consultant) analyzes your book and creates a personalized business plan mapping up to 27 revenue streams
- **B**uild Authority: Create digital products (courses, workbooks, coaching packages, audiobooks, podcasts, home study programs)
- **B**ridge Channels: Build distribution channels (social media, email marketing, website, webinars)
- **Y**ield Revenue: Monetize through direct sales, speaking engagements, and partnerships

### Getting Started Flow
1. Sign up and add your book (via Amazon URL or manually)
2. Your book microsite is automatically created and published
3. Run "Analyze with Abby" — a free AI consultation that creates your business plan
4. Subscribe to unlock the AI builders
5. Build products and start earning

### Subscription Tiers
- **Free**: Book microsite, Abby analysis, business plan
- **Starter ($47/mo)**: Build Authority products (courses, workbooks, coaching, audiobooks, podcasts, home study)
- **Pro ($197/mo)**: Starter + Bridge Channels (social media, email marketing, website, webinars)
- **Enterprise ($497/mo)**: All 27 builders + priority support + advanced analytics

### Key Features
- **My Books Hub**: Manage all your books, see analysis status, track your monetization journey
- **Book Microsites**: Beautiful landing pages for each book, auto-generated
- **Abby Analysis**: Free AI business consultation that maps revenue opportunities
- **27 AI Builders**: Each creates a specific product or channel using your book content
- **Author Profile**: Public profile with bio, credentials, and services
- **Reading Club**: Community reading challenges
- **Author Directory**: Public directory of Authors Bureau members
- **CRM**: Contact management for your author business
- **Email Marketing**: Send campaigns to your subscribers
- **Stripe Connect**: Accept payments for your products

### Common Questions
- "How do I add a book?" → Go to Dashboard → My Books → Add New Book. Paste your Amazon URL for auto-import, or enter details manually.
- "How do I get analyzed?" → Go to your book card → Click "Analyze with Abby — Free". The AI consultation takes about 5 minutes.
- "What subscription do I need?" → Depends on what you want to build. Starter covers most digital products. Pro adds marketing channels. Enterprise unlocks everything.
- "How do I connect Stripe?" → Go to Dashboard → Profile → Stripe Connect section. Follow the setup wizard.
- "Can I have multiple books?" → Yes! Each book gets its own microsite and business plan.

## Response Style
- Keep answers concise (2-4 sentences when possible)
- Use bullet points for lists
- Be encouraging and supportive
- If you don't know something specific about a user's account, suggest where they can find the info
- Never make up specific numbers or data about a user's account
- If a question is about a bug or technical issue, suggest using the "Report a Bug" feature`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, action, data } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle bug report submission
    if (action === "submit_bug_report") {
      const { error } = await supabase.from("bug_reports").insert({
        user_id: data.userId || null,
        page_url: data.pageUrl,
        description: data.description,
        screenshot_url: data.screenshotUrl || null,
        priority: data.priority,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle feedback submission
    if (action === "submit_feedback") {
      const { error } = await supabase.from("feedback").insert({
        user_id: data.userId || null,
        type: data.type,
        description: data.description,
        importance: data.importance,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle save chat session
    if (action === "save_session") {
      const { error } = await supabase.from("chat_sessions").insert({
        user_id: data.userId || null,
        messages: data.messages,
        page_url: data.pageUrl,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI chat
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm getting a lot of questions right now! Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("abby-help-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
