import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Builder-specific Act 1 analysis prompts ──────────────────────────
const ACT1_PROMPTS: Record<string, string> = {
  "online-course": `You are Abby, a world-class course designer. Analyze this manuscript and design a complete online course.

DESIGN:
1. TITLE_OPTIONS: 3 compelling course titles derived from the book's branded language (NOT the book title repeated)
2. SUBTITLE: A transformation-focused subtitle for each title
3. DESCRIPTION: 2-3 paragraphs selling the transformation, in second person ("You will...")
4. TARGET_STUDENT: Demographics, pain points, goals, what they've tried before
5. TRANSFORMATION_PROMISE: 5 specific, measurable outcomes students will achieve
6. CURRICULUM: 8-12 modules with 3-5 lessons each. Structure:
   - Module 1: Foundation / Why the old way fails
   - Modules 2-3: Core framework introduction
   - Modules 4-7: Step-by-step implementation
   - Modules 8-9: Advanced strategies
   - Module 10: Integration & action plan
   Each module: title, description, source chapters, lessons with titles and descriptions
7. RECOMMENDED_PRICE: Exact price with justification based on market research
8. VALUE_LADDER_POSITION: Where this course sits (Bait/Tripwire/Core/Premium/High-Ticket)
9. CROSS_BUILDER_PREVIEW: List what will be auto-created for other builders`,

  "workbook": `You are Abby, expert in companion workbook design. Analyze this manuscript and design a professional workbook.

DETERMINE PURPOSE:
- If no other products exist: Design as FREE LEAD MAGNET to build email list
- If course exists: Design as COMPANION WORKBOOK matching course modules
- If standalone paid: Design as PREMIUM WORKBOOK, 40-60 pages, $17-$27

DESIGN:
1. TITLE_OPTIONS: 3 options. Pattern: "The [Book Title] Workbook: [Action Verb] Your Way to [Outcome]"
2. PURPOSE: lead_magnet | companion | standalone_paid
3. PRICE: Free, or $9.99-$24.99
4. SECTIONS: Map each book chapter to a workbook section containing:
   - Section intro (key concept summary)
   - 3-5 exercises per section (fill-in, reflection, action planning, self-assessment)
   - Key takeaway box
5. DESIGN_TEMPLATE: clean | bold | elegant
6. LEAD_MAGNET_STRATEGY: If free — opt-in page copy, CTA placement
7. CROSS_BUILDER_PREVIEW: What gets pushed to Email, Website, Social Media`,

  "social-media": `You are Abby, a social media strategist for authors. Design a complete 90-day content calendar.

DESIGN:
1. PLATFORM_STRATEGY: Recommend 2-3 platforms with reasoning
2. CONTENT_PILLARS: 4-5 recurring themes from the book
3. POSTING_FREQUENCY: Per platform recommendation
4. SAMPLE_POSTS: 5 sample posts per platform showing format, hashtags, CTAs
5. CTA_ROTATION: How to rotate CTAs across products
6. CALENDAR_OVERVIEW: Week-by-week themes for 12 weeks
7. CROSS_BUILDER_PREVIEW: Feeds into Email Marketing, all product builders`,

  "email-flows": `You are Abby, expert in email marketing for authors. Design a complete email marketing system.

DESIGN:
1. STRATEGY_OVERVIEW: How email connects the author's products
2. SEQUENCES: Design 4 sequences:
   - Welcome (5-7 emails): First impression, deliver lead magnet, introduce author
   - Nurture (ongoing): Weekly value emails building trust
   - Launch (7-10 emails): Product launch sequence with urgency
   - Re-engagement (3-5 emails): Win back inactive subscribers
3. LEAD_MAGNET: What free resource drives signups
4. AUTOMATION_RULES: Trigger-based flows connecting sequences
5. SUBJECT_LINE_FORMULAS: 5 proven formulas customized to this book
6. CROSS_BUILDER_PREVIEW: Connects to all product builders`,

  "home-study-course": `You are Abby, expert in self-paced learning design. Design a home study course.

DESIGN:
1. PROGRAM_TITLE: 3 options. Pattern: "[Duration]-Day [Outcome] Challenge" or "The [Book] Study Guide"
2. DURATION: 7, 14, 21, or 30 days based on book content depth
3. DAILY_COMMITMENT: 15-30 minutes per day
4. DAILY_SCHEDULE: For each day: theme, reading assignment, key concept, exercise, reflection prompt
5. PRICING: If tripwire ($27-$47) or standalone ($97-$147)
6. UPSELL_PATHWAY: What comes after completion
7. MATERIALS: Progress tracker, daily emails, completion certificate
8. CROSS_BUILDER_PREVIEW: Daily emails→Email, sales page→Website, exercises→Workbook`,

  "audiobook": `You are Abby, expert in audiobook production. Prepare this manuscript for audiobook production.

DESIGN:
1. TITLE_METADATA: Title, subtitle, narrator credit
2. MANUSCRIPT_OPTIMIZATIONS: Identify text needing audio adaptation (tables, charts, visual refs)
3. CHAPTER_PLAN: For each chapter: estimated duration, vocal notes, key moments
4. VOICE_RECOMMENDATION: Style (warm/authoritative/conversational) with reasoning
5. DISTRIBUTION_PLAN: ACX/Audible, Findaway, Google Play, direct sales
6. PRICING: $14.99-$24.99 range recommendation
7. SAMPLE_SCRIPT: 2-minute sample from the strongest chapter opening
8. CROSS_BUILDER_PREVIEW: Audio clips→Social, listing→Website, launch emails→Email`,

  "podcast": `You are Abby, expert in podcast production. Design a complete podcast season from this book.

DESIGN:
1. SHOW_IDENTITY: 3 name options, tagline, description
2. FORMAT: Solo teaching, interview, or mix — with reasoning
3. EPISODE_ROADMAP: 10-20 episode season plan with:
   - Episode number, title, topic, source chapter
   - Format (solo/interview/panel)
   - Key talking points and book quotes to reference
   - Listener action item and CTA
4. TRAILER_SCRIPT: 2-minute season trailer script
5. GUEST_SUGGESTIONS: 5 potential guest topics with outreach angles
6. MONETIZATION: Sponsorship strategy, product CTAs per episode
7. CROSS_BUILDER_PREVIEW: Show notes→Website, clips→Social, guest emails→Email`,

  "webinar": `You are Abby, expert in webinar design. Design a complete webinar package.

DESIGN:
1. WEBINAR_TITLE: 3 options optimized for registrations
2. STRUCTURE: Perfect Webinar format — Hook, Story, Content (3 secrets), Transition, Offer, Close
3. DURATION: 60 minutes breakdown (40 value, 15 pitch, 5 Q&A)
4. SLIDE_OUTLINE: 30-40 slides with key point per slide
5. REGISTRATION_PAGE: Headline, 3 bullets, urgency element
6. OFFER_STACK: What you're selling, bonuses, price, guarantee
7. FOLLOW_UP_PLAN: 3-email post-webinar sequence
8. CROSS_BUILDER_PREVIEW: Reg page→Website, emails→Email, content→Social, replay→Course`,

  "membership": `You are Abby, expert in membership design. Design a monthly membership program.

DESIGN:
1. MEMBERSHIP_NAME: 3 options
2. TIER_STRUCTURE: 2-3 tiers with decoy pricing:
   - Basic ($9-$27/mo): Content library, community, monthly Q&A
   - Pro ($27-$67/mo): + live calls, new content weekly, accountability
   - VIP ($97-$197/mo): + monthly 1-on-1, priority support, exclusive content
3. CONTENT_CALENDAR: 3-month plan per tier
4. ONBOARDING_FLOW: Welcome sequence, getting-started guide
5. RETENTION_STRATEGY: Monthly wins, progress tracking, renewal incentives
6. REVENUE_PROJECTION: Members × price × retention rate
7. CROSS_BUILDER_PREVIEW: Welcome emails→Email, sales pages→Website, teasers→Social`,

  "website": `You are Abby, expert in author website design. Design a complete author microsite.

DESIGN:
1. SITE_STRUCTURE: Page hierarchy (Home, About, Products, Blog, Contact)
2. HOME_PAGE: Hero section, email capture, featured products, testimonials
3. PRODUCT_PAGES: Auto-populated from built products
4. ABOUT_PAGE: Author bio, credentials, photo, social links
5. SEO_STRATEGY: Meta titles, descriptions, keywords per page
6. LEAD_CAPTURE: Placement strategy, lead magnet integration
7. DESIGN_STYLE: Color scheme, typography, layout recommendations
8. CROSS_BUILDER_PREVIEW: Central hub connecting all product builders`,

  "coaching-1on1": `You are Abby, expert in coaching program design. Design a 1-on-1 coaching program.

DESIGN:
1. PROGRAM_NAME: 3 options derived from the book's transformation
2. STRUCTURE: 12-week program mapped to book chapters
3. SESSION_FRAMEWORK: Check-in→Teaching→Exercise→Homework→Next Steps
4. CLIENT_MATERIALS: Intake form, welcome packet, session notes, progress tracker, certificate
5. PRICING: $1,997-$2,997 for 12 weeks, or $150-$500/individual session
6. SALES_PROCESS: Discovery call script, application form, enrollment steps
7. CAPACITY: Start with 3-5 clients max
8. CROSS_BUILDER_PREVIEW: Sales page→Website, follow-up→Email, testimonials→Social`,

  "group-coaching": `You are Abby, expert in cohort-based programs. Design a group coaching program.

DESIGN:
1. PROGRAM_NAME: 3 options
2. COHORT_SIZE: 8-20 participants
3. DURATION: 8-12 weeks with weekly 90-min sessions
4. CURRICULUM: Weekly themes from book with exercises and accountability
5. GROUP_DYNAMICS: Accountability partners, community prompts, hot seats
6. PRICING: $297-$997 per participant
7. ENROLLMENT_STRATEGY: Limited spots, countdown, application process
8. CROSS_BUILDER_PREVIEW: Enrollment page→Website, launch emails→Email, social proof→Social`,

  "speaking": `You are Abby, expert in keynote design. Design keynote speaking materials.

DESIGN:
1. TALK_TOPICS: 3 keynote topics (broad, medium, niche) from the book
2. TALK_STRUCTURE: Opening Hook→3-5 Key Points with Stories→Interactive Element→Closing CTA
3. SPEAKER_ONE_SHEET: Bio, photo, topics, testimonials, contact info
4. FEE_STRUCTURE: Beginner ($2,500-$5,000), Established ($5,000-$15,000), Authority ($15,000+)
5. BACK_OF_ROOM_STRATEGY: Book sales, email capture, coaching offers
6. BUREAU_SUBMISSION: Speaker bureau pitch and conference proposal
7. CROSS_BUILDER_PREVIEW: Speaker page→Website, follow-up→Email, highlights→Social`,

  "corporate-training": `You are Abby, expert in corporate workshop design. Design corporate training packages.

DESIGN:
1. WORKSHOP_FORMATS: Lunch & Learn (1hr), Half-Day ($2,500-$5,000), Full-Day ($5,000-$10,000)
2. CURRICULUM: Per format — objectives, exercises, case studies, takeaway materials
3. CORPORATE_PROPOSAL: ROI quantification, target departments, pilot program pitch
4. PARTICIPANT_WORKBOOK: Branded exercises and note-taking guides
5. FACILITATOR_GUIDE: So others can deliver the program
6. REPEAT_BOOKING: Pilot→Case Study→Ongoing Contract strategy
7. CROSS_BUILDER_PREVIEW: Proposal→Website, follow-up→Email, case studies→Social`,

  "training-programs": `You are Abby, expert in scalable training. Design a training program.

DESIGN:
1. PROGRAM_NAME: 3 options
2. CURRICULUM: Multi-day training with assessments and manager briefings
3. FACILITATOR_GUIDE: Enable others to deliver without the author
4. PRICING: Per-participant ($500-$2,500) or site license ($25,000+/year)
5. CERTIFICATION_PATHWAY: Train-the-trainer option
6. ROI_CASE_STUDY: Template for measuring organizational impact
7. CROSS_BUILDER_PREVIEW: Brochure→Website, sales emails→Email, social proof→Social`,

  "affiliate": `You are Abby, expert in affiliate marketing. Design an affiliate program.

DESIGN:
1. COMMISSION_STRUCTURE: 30-40% digital, 15-20% physical
2. AFFILIATE_MATERIALS: Swipe copy, social posts, banners, review templates
3. TRACKING: Unique coupon codes, cookie duration (30-90 days)
4. RECRUITMENT_STRATEGY: Email list, peers, past students
5. AFFILIATE_PAGE: Signup page copy and benefits
6. REVENUE_PROJECTION: Affiliates × sales/month × commission
7. CROSS_BUILDER_PREVIEW: Signup page→Website, swipe copy→Email, templates→Social`,

  "partnerships": `You are Abby, expert in joint ventures. Design a JV partnership program.

DESIGN:
1. PARTNER_TYPES: Complementary authors, course creators, coaches
2. REVENUE_SHARE_MODEL: Commission splits, co-creation terms
3. PARTNER_MATERIALS: Proposal template, co-marketing plan
4. OUTREACH_STRATEGY: Warm intro templates, value proposition
5. TRACKING: Revenue attribution and reporting
6. CROSS_BUILDER_PREVIEW: Partner page→Website, outreach→Email, co-marketing→Social`,

  "upsell-downsell": `You are Abby, funnel strategist. Design the complete upsell/downsell system.

DESIGN:
1. FUNNEL_MAP: For each existing product, design:
   - ORDER_BUMP ($17-$47): Checkout add-on
   - UPSELL: Post-purchase next-tier offer
   - DOWNSELL: Reduced offer if upsell declined
   - FOLLOW_UP: Email upsell 7 days later
2. REVENUE_MODELING: Base + bump (30-40% take rate) + upsell (10-20%) + downsell (20-30%)
3. PAGE_DESIGNS: Landing→Checkout→Upsell→Downsell→Thank You
4. CROSS_BUILDER_PREVIEW: Pages→Website, follow-up→Email, social proof→Social`,

  "retreat": `You are Abby, expert in immersive events. Design a retreat/bootcamp.

DESIGN:
1. EVENT_NAME: 3 options
2. FORMAT: 2-3 day intensive with daily arc
3. CURRICULUM: Session-by-session breakdown
4. PRICING: $1,500-$5,000 per person
5. VENUE_REQUIREMENTS: Capacity, amenities, location recommendations
6. MARKETING_TIMELINE: 12-week countdown plan
7. CROSS_BUILDER_PREVIEW: Registration→Website, promo→Email+Social, upsell→Masterminds`,

  "certification": `You are Abby, expert in certification programs. Design a certification program.

DESIGN:
1. PROGRAM_NAME: 3 options
2. LEVELS: 3-level certification pathway
3. CURRICULUM: 8-12 modules with assessments (60% knowledge, 40% practical)
4. PRICING: $2,500-$7,500 + $500/yr renewal
5. CERTIFIED_DIRECTORY: Public listing of certified practitioners
6. TRAIN_THE_TRAINER: How certified people can deliver the program
7. CROSS_BUILDER_PREVIEW: Program page→Website, enrollment→Email, announcements→Social`,

  "mastermind": `You are Abby, expert in high-value communities. Design a mastermind group.

DESIGN:
1. GROUP_NAME: 3 options
2. SIZE: 6-12 members
3. STRUCTURE: Monthly meetings, accountability, hot seats
4. APPLICATION_PROCESS: Criteria, application form, interview
5. PRICING: $5,000-$25,000/year
6. CONTENT_PLAN: Monthly themes, guest experts, resources
7. CROSS_BUILDER_PREVIEW: Application→Website, invitation→Email, exclusivity→Social`,

  "big-ticket": `You are Abby, expert in premium consulting. Design consulting packages.

DESIGN:
1. PACKAGE_OPTIONS: VIP Day ($5,000-$10,000), 90-Day Intensive ($10,000-$25,000), Retainer
2. DELIVERABLES: Per package — assessments, strategy sessions, implementation support
3. PROPOSAL_TEMPLATE: ROI-focused, results-driven
4. APPLICATION_FORM: Qualifying questions
5. CASE_STUDY_TEMPLATE: For documenting client results
6. CROSS_BUILDER_PREVIEW: Premium page→Website, application→Email, case studies→Social`,

  "special-editions": `You are Abby, expert in premium editions. Design special edition offerings.

DESIGN:
1. EDITION_TYPES: Signed, numbered, bonus content, collector's
2. PRICING: $49-$199 per edition
3. LIMITED_RUN: 100-500 copies
4. BONUS_CONTENT: Additional chapters, author notes, exclusive materials
5. PRE_ORDER_STRATEGY: Countdown, early bird pricing
6. CROSS_BUILDER_PREVIEW: Pre-order→Website, launch→Email, countdown→Social`,

  "book-sales": `You are Abby, expert in event book sales. Design an event sales kit.

DESIGN:
1. EVENT_TYPES: Keynotes, conferences, workshops, book signings
2. INVENTORY_PLANNING: Audience size × 50-60% = books to bring
3. TABLE_DISPLAY: One-sheet, QR codes, bundle offers, email capture cards
4. PAYMENT_METHODS: Square, Venmo, cash, pre-signed
5. BUNDLE_STRATEGY: Book + workbook + bonus chapter
6. POST_EVENT_FOLLOWUP: Email sequence for captured leads
7. CROSS_BUILDER_PREVIEW: Materials→Website, follow-up→Email, promo→Social`,

  "conventions": `You are Abby, expert in conference strategy. Design convention materials.

DESIGN:
1. SPEAKER_PROPOSAL: Topic, abstract, attendee takeaways
2. NETWORKING_MATERIALS: Business cards, elevator pitch, one-sheet
3. BOOTH_STRATEGY: If exhibiting — display, lead capture, giveaways
4. FOLLOW_UP_PLAN: Within 48 hours of event
5. CROSS_BUILDER_PREVIEW: Landing page→Website, follow-up→Email, live posts→Social`,

  "fundraising": `You are Abby, expert in cause-aligned fundraising. Design a fundraising campaign.

DESIGN:
1. CAMPAIGN_CONCEPT: How the book ties to the cause
2. DONATION_TIERS: With rewards at each level
3. CAMPAIGN_PAGE: Copy, visuals, progress bar
4. OUTREACH_PLAN: Email, social, press releases
5. PARTNER_OUTREACH: Sponsor and partner proposals
6. CROSS_BUILDER_PREVIEW: Campaign→Website, outreach→Email, posts→Social`,

  "exhibitors": `You are Abby, expert in exhibition strategy. Design exhibitor/JV materials.

DESIGN:
1. PARTNERSHIP_PROPOSAL: Value proposition, co-branding terms
2. BOOTH_DESIGN: Display layout, lead capture, QR codes
3. CO_MARKETING_PLAN: Joint social, email, event promotions
4. LEAD_CAPTURE: QR codes, email forms, follow-up within 24hrs
5. CROSS_BUILDER_PREVIEW: Proposal→Website, co-marketing→Email+Social`,
};

// Tool calling schema removed — using direct JSON response for better model compatibility

// ── Resolve user from JWT ────────────────────────────────────────────
async function resolveUser(req: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await client.auth.getUser(token);
    if (user) return { id: user.id, email: user.email || "" };
  } catch (_) {}

  // Fallback: shared backend
  try {
    const shared = createClient(
      "https://wuftdpnekscrsghqtssd.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s",
    );
    const { data: { user: sharedUser } } = await shared.auth.getUser(token);
    if (sharedUser) return { id: sharedUser.id, email: sharedUser.email || "" };
  } catch (_) {}

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { act, builderId, bookId, builderLabel, approvedProposal } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const user = await resolveUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch context in parallel
    const [profileRes, bookRes, manuscriptRes, planRes, frameworksRes, productsRes] = await Promise.all([
      adminClient.from("author_profiles").select("pen_name, bio_short, genres, frameworks, credentials").eq("user_id", user.id).maybeSingle(),
      adminClient.from("books").select("title, subtitle, description, genre, author_name").eq("id", bookId).maybeSingle(),
      adminClient.from("generated_assets").select("content").eq("book_id", bookId).eq("author_id", user.id).eq("asset_type", "source_material").maybeSingle(),
      adminClient.from("generated_assets").select("content").eq("book_id", bookId).eq("author_id", user.id).eq("asset_type", "business_plan").maybeSingle(),
      adminClient.from("generated_assets").select("content").eq("book_id", bookId).eq("author_id", user.id).eq("asset_type", "frameworks").maybeSingle(),
      Promise.all([
        adminClient.from("courses").select("id, title, status, price").eq("author_id", user.id).eq("book_id", bookId),
        adminClient.from("audiobooks").select("id, title, status").eq("author_id", user.id).eq("book_id", bookId),
        adminClient.from("home_study_courses").select("id, title, status").eq("author_id", user.id).eq("book_id", bookId),
        adminClient.from("email_flows").select("id, title, status").eq("author_id", user.id),
        adminClient.from("coaching_packages").select("id, title, status").eq("author_id", user.id),
      ]),
    ]);

    const book = bookRes.data;
    const profile = profileRes.data;
    const manuscript = manuscriptRes.data?.content?.slice(0, 80000) || "";
    const businessPlan = planRes.data?.content?.slice(0, 10000) || "";
    const frameworks = frameworksRes.data?.content?.slice(0, 3000) || "";

    const existingProducts = productsRes
      .map(r => r.data || [])
      .flat()
      .map((p: any) => `${p.title} (${p.status})`)
      .join(", ");

    const contextBlock = `
BOOK: "${book?.title || "Unknown"}" by ${profile?.pen_name || book?.author_name || "Author"}
${book?.subtitle ? `Subtitle: ${book.subtitle}` : ""}
${book?.description ? `Description: ${book.description.slice(0, 1000)}` : ""}
Genre: ${book?.genre || "Non-fiction"}
Author Bio: ${profile?.bio_short || "Not provided"}
Frameworks: ${frameworks || (profile?.frameworks ? JSON.stringify(profile.frameworks) : "None extracted")}

${manuscript ? `=== MANUSCRIPT ===\n${manuscript}\n=== END MANUSCRIPT ===` : "No manuscript uploaded — use book description and frameworks."}

${businessPlan ? `=== BUSINESS PLAN ===\n${businessPlan.slice(0, 5000)}\n=== END PLAN ===` : "No business plan yet."}

EXISTING PRODUCTS: ${existingProducts || "None built yet."}`;

    // ═══════════════════════════════════════════════════════════════
    // ACT 1: ANALYZE — Returns structured proposal via tool calling
    // ═══════════════════════════════════════════════════════════════
    if (act === 1) {
      const builderPrompt = ACT1_PROMPTS[builderId] || `You are Abby. Analyze this book and design a complete ${builderLabel || builderId} product. Provide title options, structure, pricing, target audience, and cross-builder outputs.`;

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `${builderPrompt}\n\n${contextBlock}\n\nReturn your complete product design as a JSON object with these fields:
- title_options: array of 3 title strings
- recommended_title: string (which title you recommend)
- subtitle: string
- description: string (2-3 paragraphs)
- target_audience: string
- transformation_promises: array of 5 strings
- recommended_price: number (USD)
- price_justification: string
- value_ladder_position: one of "bait", "tripwire", "core", "premium", "high_ticket"
- structure: array of objects with { title, description, source_chapters, items: [{ title, description }] }. KEEP THIS CONCISE — max 8 modules with 3-4 items each. Use short descriptions (1 sentence).
- cross_builder_outputs: array of { builder, label, description }
- abby_commentary: string (your personal note about why this will work — 2-3 sentences max)
- revenue_projection: string (1 sentence)

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no text before or after. Keep descriptions short to fit within token limits. The entire response must be a single valid JSON object.` },
            { role: "user", content: `Analyze my book "${book?.title}" and design the complete ${builderLabel || builderId} product. Return ONLY a JSON object.` },
          ],
          temperature: 0.7,
          max_completion_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Act 1 AI error:", status, t);
        return new Response(JSON.stringify({ error: "Abby is temporarily unavailable. Please try again." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await response.json();
      
      // Extract JSON from content (no tool calling)
      const content = result.choices?.[0]?.message?.content || "";
      
      let proposal: any;
      try {
        // Try direct JSON parse first
        const cleaned = content.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
        proposal = JSON.parse(cleaned);
      } catch {
        // Fallback: find JSON object in content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("No JSON found in Act 1 response:", content.slice(0, 500));
          return new Response(JSON.stringify({ error: "Failed to generate proposal. Please try again." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        try {
          proposal = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse extracted JSON:", e, jsonMatch[0].slice(0, 300));
          return new Response(JSON.stringify({ error: "Failed to parse proposal. Please try again." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Save proposal as draft (non-blocking)
      try {
        const { error: upsertErr } = await adminClient.from("generated_assets").upsert({
          book_id: bookId,
          author_id: user.id,
          asset_type: `builder_proposal_${builderId}`,
          content: JSON.stringify(proposal),
          updated_at: new Date().toISOString(),
        }, { onConflict: "book_id,asset_type" });
        if (upsertErr) {
          console.warn("Proposal upsert failed, trying insert:", upsertErr);
          await adminClient.from("generated_assets").insert({
            book_id: bookId,
            author_id: user.id,
            asset_type: `builder_proposal_${builderId}`,
            content: JSON.stringify(proposal),
          });
        }
      } catch (e) {
        console.warn("Proposal save failed:", e);
      }

      return new Response(JSON.stringify({ proposal }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACT 3: GENERATE — Streams full content from approved proposal
    // ═══════════════════════════════════════════════════════════════
    if (act === 3) {
      if (!approvedProposal) {
        return new Response(JSON.stringify({ error: "Approved proposal required for Act 3" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const generatePrompt = `You are Abby. The author has approved this product proposal. Now generate ALL the content.

APPROVED PROPOSAL:
${JSON.stringify(approvedProposal, null, 2)}

${contextBlock}

GENERATE EVERYTHING:
For the "${approvedProposal.recommended_title || approvedProposal.title_options?.[0]}" ${builderLabel || builderId}:

1. Generate the COMPLETE content for every section/module/episode in the structure
2. For each item, write full professional content (800-1200 words for lessons, 200-400 for exercises)
3. Include all supporting materials (scripts, exercises, quizzes, templates)
4. Write any sales copy, email sequences, and marketing materials
5. Use the author's voice and the book's terminology throughout
6. Reference specific chapters, quotes, and frameworks from the manuscript

Format your output as structured markdown with clear section headers. This will be saved as the generated asset.`;

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: generatePrompt },
            { role: "user", content: `Generate all the content for my approved ${builderLabel || builderId}. Make it comprehensive and production-ready.` },
          ],
          temperature: 0.75,
          max_completion_tokens: 16000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Act 3 AI error:", status, t);
        return new Response(JSON.stringify({ error: "Abby is temporarily unavailable." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Stream the response back to client
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid act. Use act: 1 or act: 3" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("abby-builder-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
