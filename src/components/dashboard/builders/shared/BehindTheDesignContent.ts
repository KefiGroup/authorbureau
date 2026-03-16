/**
 * Product-specific content for the "Behind the Design" panel.
 * Each product has 5 tabs: methodology, market, pricing, marketing, connected.
 */

export interface BehindTheDesignData {
  methodology: string;
  market: string;
  pricing: string;
  marketing: string;
  connected: string;
}

const CONTENT: Record<string, BehindTheDesignData> = {
  // ── BUILD ──────────────────────────────────────────────
  "workbook": {
    methodology: "**Framework: Activity-Based Learning (ABL)**\n\nWorkbooks are designed as standalone exercise companions to your book. Unlike courses with structured timelines, workbooks let readers engage at their own pace. Each chapter of your book maps to a workbook section with reflection prompts, fill-in exercises, self-assessments, and action items.\n\n**Design Principle:** Every exercise follows the \"Read → Reflect → Act\" cycle. Readers read a concept from your book, reflect on how it applies to their life, then complete an action that creates a tangible output.",
    market: "**Comparable Products:** Author-branded workbooks on Amazon sell for $9.99–$29.99. The sweet spot for self-help workbooks is $14.99–$19.99 (paperback) and $9.99 (digital PDF).\n\n**Market Size:** The workbook/journal category on Amazon grew 23% year-over-year. Readers increasingly want interactive formats beyond passive reading.\n\n**Competitor Benchmarks:** Rachel Hollis \"Start Today Journal\" ($16.99), Brene Brown \"Dare to Lead Workbook\" ($12.99), James Clear \"Atomic Habits Workbook\" ($14.99).",
    pricing: "**Value Ladder Position:** Entry-level (Tripwire/Bait)\n\n**Price Psychology:** Priced just above your book to create an easy upsell. A reader who paid $16.99 for your book will pay $14.99–$19.99 for a companion workbook without hesitation — it's the same price range they've already committed to.\n\n**Recommended Price:** $14.99 (digital) / $19.99 (print)\n\n**Revenue Model:** Volume-based. Low price, high volume. Sells on autopilot through your book's back matter and Amazon listing.",
    marketing: "**Auto-Generated Campaigns:**\n1. Book back-matter CTA (\"Get the companion workbook at authorsbureau.com/[you]/workbook\")\n2. Email sequence: 3-email drip to book buyers (Day 3, Day 7, Day 14 after purchase)\n3. Social media posts: 5 \"Workbook Exercise Preview\" posts showing sample pages\n4. Amazon A+ Content: Workbook cross-sell on your book listing\n\n**Timeline:** Launch 2–4 weeks after book publication for maximum momentum.",
    connected: "**Connected Products:**\n• **Special Editions** → Workbook included in Gift Set bundles ($79.99–$149.99)\n• **Home Study** → Workbook exercises feed into the 21/30-day program structure\n• **Online Course** → Workbook becomes the printable course workbook\n• **Email Marketing** → Workbook sample pages used as lead magnet content\n• **Upsells** → \"Add the Workbook\" one-click upsell on book checkout",
  },
  "home-study": {
    methodology: "**Framework: Habit Formation Science + Spaced Repetition**\n\nThe Home Study is a self-guided accountability program based on research by Dr. Phillippa Lally (University College London), which found that forming a new habit takes an average of 66 days, with the minimum effective period being 21 days. Your Home Study uses either a 21-day (habit kickstart) or 30-day (deep integration) structure.\n\n**Design Principle:** Each day follows the \"Learn → Practice → Reflect\" cycle. A short daily lesson (5–10 minutes of reading), a practice activity (15–20 minutes), and a reflection prompt (5 minutes). Total daily commitment: 25–35 minutes — low enough to maintain consistency, high enough to create real change.\n\n**Accountability Mechanism:** Daily check-ins, streak tracking, and milestone celebrations at Day 7, Day 14, and Day 21/30 create the dopamine loops that sustain engagement.",
    market: "**Comparable Products:** Self-paced home study programs in the self-help/personal development niche sell for $27–$197. The median price for a 21-day program is $47; for a 30-day program, $67.\n\n**Market Benchmarks:** Hal Elrod \"Miracle Morning 30-Day Challenge\" ($37), Gabby Bernstein \"21-Day Manifesting Challenge\" ($47), Brendon Burchard \"High Performance Planner\" ($24.97/quarter).\n\n**Completion Rates:** Self-paced programs average 15–20% completion. Programs with daily accountability (like this Home Study) achieve 45–65% completion — 3x the industry average.",
    pricing: "**Value Ladder Position:** Core Offer\n\n**Price Psychology:** The 3x–5x multiplier rule — your Home Study should be 3–5x the price of your book. If your book is $16.99, the Home Study sits at $47–$97. This creates a natural \"next step\" that feels proportional to the increased value (structured guidance vs. passive reading).\n\n**Recommended Price:** $47 (21-day) / $67 (30-day)\n\n**Revenue Model:** Semi-passive. Once built, it sells on autopilot. Higher margin than workbooks, lower volume.",
    marketing: "**Auto-Generated Campaigns:**\n1. Email sequence: 5-email nurture to book buyers (Day 7, 14, 21, 28, 35 after book purchase)\n2. Social media: \"Day X Challenge\" posts showing daily themes (creates FOMO)\n3. Webinar funnel: Free \"Day 1 Preview\" webinar → Home Study upsell\n4. Testimonial collection: Auto-request at Day 21/30 completion\n5. Reading Club cross-promotion: Readers who finish the 100-Day Challenge get a discount code\n\n**Timeline:** Launch 4–6 weeks after book publication. Promote heavily during the first 90 days.",
    connected: "**Connected Products:**\n• **Workbook** → Home Study daily exercises pull from the Workbook content\n• **Online Course** → Home Study graduates get a discount on the full Online Course\n• **Reading Club** → 100-Day Challenge readers are the ideal Home Study audience\n• **Email Marketing** → Home Study daily emails build your email list\n• **Coaching** → Home Study completers are pre-qualified coaching leads\n• **Special Editions** → Home Study included in Gift Set bundles",
  },
  "book-sales": {
    methodology: "**Framework: Direct-to-Reader Sales Channel**\n\nYour book is already published. This revenue stream is about selling it directly through your Authors Bureau storefront — bypassing Amazon's 30–65% cut. Direct sales give you full customer data (email, purchase history) and higher margins.\n\n**Design Principle:** Your book page on Authors Bureau is your storefront. It includes your book description, reviews, author bio, and a direct purchase button. Readers buy directly from you, and you keep 85–90% of the sale price (vs. 35–70% on Amazon).",
    market: "**Direct Sales Benchmarks:** Authors who sell directly earn 2–3x more per book than through Amazon. The average self-help book sells 250–500 copies in the first year. At $16.99 with 85% margin, that's $3,612–$7,224 vs. $1,487–$2,974 through Amazon.\n\n**Industry Trend:** Direct-to-consumer book sales grew 34% in 2024, driven by platforms like Shopify, Gumroad, and author-branded stores.",
    pricing: "**Value Ladder Position:** Foundation (Entry Point)\n\n**Price:** Match your Amazon/retail price. Do NOT discount — you want price consistency across channels. The value proposition for buying direct is extras (signed bookplate, bonus chapter, author letter), not a lower price.",
    marketing: "**Auto-Generated Campaigns:**\n1. Author website \"Buy Direct\" badge with bonus incentive\n2. Social media: \"Buy from me directly and get [bonus]\" posts\n3. Email signature: Direct purchase link\n4. Book back-matter: \"Get bonus content when you buy direct at authorsbureau.com\"",
    connected: "**Connected Products:**\n• **Special Editions** → Direct sales channel for all edition types\n• **Upsells** → \"Add the Workbook\" / \"Add the Home Study\" at checkout\n• **Email Marketing** → Every direct buyer joins your email list automatically\n• **Lead Magnets** → Free chapter download → direct book sale funnel",
  },
  "special-editions": {
    methodology: "**Framework: Scarcity Marketing + Occasion-Based Gifting**\n\nSpecial Editions leverage two psychological principles: scarcity (limited print runs create urgency) and occasion-based purchasing (people buy gifts on predictable calendar dates). By theming your book to specific occasions (Valentine's Day, Mother's Day, Graduation, etc.), you tap into the $200B+ gift market.\n\n**Design Principle:** Each Special Edition combines a physical format upgrade (signed, hardcover, illustrated) with occasion-themed bonus content (foreword, bonus chapter, companion resource) and gift-buyer-focused sales copy.",
    market: "**Special Edition Benchmarks:** Limited edition books command 2–5x the standard retail price. Signed copies sell for $29.99–$49.99. Hardcover collector's editions sell for $49.99–$99.99. Gift sets (book + workbook + extras) sell for $79.99–$149.99.\n\n**Gift Market Data:** 65% of book purchases during November–December are gifts. Mother's Day, Father's Day, and Graduation collectively drive $85B in gift spending annually.\n\n**Scarcity Effect:** Limited runs of 50–200 copies sell out 3x faster than open runs. \"Only 47 left\" messaging increases conversion by 226%.",
    pricing: "**Value Ladder Position:** Premium Entry (Tripwire to High-Ticket)\n\n**Price Psychology:** Special Editions are priced based on perceived exclusivity, not content value. A signed copy of a $16.99 book sells for $39.99 — the $23 premium is for the signature, the scarcity, and the gift-worthiness.\n\n**Recommended Pricing:**\n• Signed Copy: $29.99–$49.99\n• Hardcover Collector's: $49.99–$99.99\n• Gift Set: $79.99–$149.99",
    marketing: "**Auto-Generated Campaigns:**\n1. 30-day pre-launch email countdown per occasion\n2. Social media: \"Limited Edition Reveal\" posts with mockup images\n3. Gift-buyer targeted ads: \"The perfect [Mother's Day] gift for someone who [pain point]\"\n4. Scarcity updates: \"Only X copies remaining\" email triggers at 75%, 50%, 25%, 10% sold\n5. Post-occasion follow-up: \"Missed it? Join the waitlist for the next edition\"\n\n**Timeline:** Launch 6–8 weeks before each occasion. Abby auto-suggests the next upcoming occasion.",
    connected: "**Connected Products:**\n• **Workbook** → Included in Gift Set bundles\n• **Book Sales** → Special Editions sold through direct sales channel\n• **Email Marketing** → Edition launches drive email list growth\n• **Social Media** → Edition reveals create shareable content\n• **Affiliates** → Affiliates earn higher commissions on premium editions",
  },
  "social-media": {
    methodology: "**Framework: Content Pillar Strategy + Platform-Native Formatting**\n\nYour social media content is derived directly from your book's key themes. Abby identifies 4–6 content pillars from your manuscript and generates platform-specific content for each. Every post links back to your book, products, or email list — social media is a distribution channel, not a destination.\n\n**Design Principle:** The 80/20 rule — 80% value content (tips, insights, stories from your book), 20% promotional content (product launches, sales, CTAs). Each post follows the \"Hook → Value → CTA\" structure.",
    market: "**Platform Benchmarks:** Authors with consistent social media presence sell 3–5x more books than those without. The most effective platforms for non-fiction authors: LinkedIn (B2B/professional), Instagram (visual/lifestyle), TikTok/BookTok (discovery), Twitter/X (thought leadership).\n\n**Posting Frequency:** 3–5 posts/week is the sweet spot for author accounts. More than daily leads to audience fatigue; less than 2x/week loses algorithmic visibility.",
    pricing: "**Value Ladder Position:** Free (Audience Building)\n\n**Revenue Model:** Social media doesn't generate direct revenue — it drives traffic to your paid products. Every post should have a clear path to your book, workbook, home study, or email list.",
    marketing: "**Auto-Generated Content:**\n1. 30-day content calendar with daily posts across 3 platforms\n2. Quote graphics pulled from your book's best passages\n3. \"Behind the book\" story posts\n4. Product launch announcement templates\n5. Engagement prompts (polls, questions, challenges)",
    connected: "**Connected Products:**\n• **All Products** → Social media promotes every revenue stream\n• **Email Marketing** → \"Link in bio\" drives email signups\n• **Lead Magnets** → Free downloads promoted via social posts\n• **Special Editions** → Edition reveals create viral-worthy content\n• **Reading Club** → Challenge updates drive social engagement",
  },
  "email-marketing": {
    methodology: "**Framework: Automated Nurture Sequences + Segmented Broadcasting**\n\nYour email marketing system is built on two pillars: (1) automated sequences that nurture new subscribers through a predictable journey from awareness to purchase, and (2) broadcast emails for time-sensitive announcements (launches, sales, events).\n\n**Design Principle:** The \"Know → Like → Trust → Buy\" sequence. New subscribers receive a welcome sequence (Know), then value emails (Like), then social proof and case studies (Trust), then product offers (Buy). Each email has one clear CTA.",
    market: "**Email Benchmarks:** Email marketing returns $36 for every $1 spent — the highest ROI of any marketing channel. Non-fiction author email lists convert at 2–5% per campaign (vs. 0.5–1% for social media).\n\n**List Size Benchmarks:** Authors with 1,000+ email subscribers earn 3x more from product launches than those with fewer. The first 500 subscribers are the hardest; growth accelerates after that.",
    pricing: "**Value Ladder Position:** Free (List Building)\n\n**Revenue Model:** Email is the engine that sells everything else. It doesn't have its own price — it drives revenue across all 28 streams.",
    marketing: "**Auto-Generated Sequences:**\n1. Welcome sequence (5 emails over 14 days)\n2. Book buyer nurture (7 emails over 30 days → Workbook/Home Study upsell)\n3. Product launch sequence (5 emails over 7 days per product)\n4. Re-engagement sequence (3 emails for inactive subscribers)\n5. Weekly newsletter template",
    connected: "**Connected Products:**\n• **All Products** → Email is the primary sales channel for every product\n• **Lead Magnets** → Lead magnets feed the email list\n• **Social Media** → Social drives email signups; email drives social engagement\n• **Webinars** → Email promotes webinar registrations\n• **Reading Club** → Challenge updates delivered via email",
  },
  "website": {
    methodology: "**Framework: Author Platform Architecture**\n\nYour Authors Bureau website is your digital headquarters. It's not just a book page — it's a full author platform with your bio, all books, all products, blog/articles, email signup, and social links. The website follows the \"Hub and Spoke\" model: your website is the hub, and all other channels (social, email, Amazon, podcasts) are spokes that drive traffic back to the hub.\n\n**Design Principle:** Every page has one primary CTA. Homepage → email signup. Book page → buy. Product page → purchase. About page → follow/subscribe. No page should leave the visitor wondering \"what do I do next?\"",
    market: "**Author Website Benchmarks:** Authors with professional websites sell 40% more books than those without. The average author website converts 2–4% of visitors to email subscribers and 0.5–1.5% to direct book buyers.",
    pricing: "**Value Ladder Position:** Free (Platform/Infrastructure)\n\n**Revenue Model:** The website is the storefront — it doesn't have its own price, but it's where all transactions happen.",
    marketing: "**Auto-Generated Assets:**\n1. SEO-optimized author bio page\n2. Book landing page with reviews and buy links\n3. Product catalog page\n4. Email signup popup/form\n5. Blog template for content marketing",
    connected: "**Connected Products:**\n• **All Products** → Website is the storefront for everything\n• **Book Sales** → Direct purchase through website\n• **Email Marketing** → Website captures email subscribers\n• **Social Media** → Website linked from all social profiles",
  },
  "online-course": {
    methodology: "**Framework: Bloom's Taxonomy + Kolb's Experiential Learning Cycle**\n\nYour Online Course is a facilitated 2–3 day intensive workshop designed using two proven educational frameworks:\n\n**Bloom's Taxonomy** (6 cognitive levels) ensures learning objectives progress from basic recall to creative application: Remember → Understand → Apply → Analyze → Evaluate → Create.\n\n**Kolb's Learning Cycle** ensures every activity follows the complete learning loop: Concrete Experience (do something) → Reflective Observation (think about it) → Abstract Conceptualization (understand the principle) → Active Experimentation (try it differently).\n\n**7-Module Structure:**\n1. Orientation — Build context and motivation (Remember + Understand)\n2. Foundations — Core principles and mental models (Understand)\n3. Framework — Introduce the core system/method (Understand + Apply)\n4. Application — Students practice using the framework (Apply + Analyze)\n5. Case Studies — Real examples and analysis (Analyze + Evaluate)\n6. Creation — Students produce their own output (Create)\n7. Implementation — Action plan and next steps (Evaluate + Create)\n\n**Key Deliverables:** Printable Course Workbook, Downloadable Framework Mindmap, Facilitator Guide with activity instructions and debrief scripts.",
    market: "**Online Course Benchmarks:** Non-fiction author courses sell for $97–$497. The median price for a 7-module course with live facilitation is $197–$297. Courses with printable workbooks and downloadable resources command 30–50% higher prices than video-only courses.\n\n**Completion Rates:** Facilitated courses (with live elements) achieve 60–80% completion vs. 5–15% for self-paced video courses. The 2–3 day intensive format has the highest completion rate of any online course format.\n\n**Competitor Benchmarks:** Amy Porterfield courses ($297–$997), Marie Forleo B-School ($2,497), Masterclass ($180/year). Author-branded courses typically sit at $97–$497.",
    pricing: "**Value Ladder Position:** Core to Premium Offer\n\n**Price Psychology:** The Online Course is 5–10x the book price. It represents the \"full transformation\" — not just reading about the concepts, but practicing them with guidance. The facilitated element justifies premium pricing.\n\n**Recommended Price:** $197 (self-paced recording) / $297 (live facilitated) / $497 (live + group coaching add-on)",
    marketing: "**Auto-Generated Campaigns:**\n1. Free workshop preview: 45-minute \"Module 1 Preview\" webinar → course upsell\n2. Email launch sequence: 7 emails over 14 days (story → pain → solution → proof → offer → urgency → last call)\n3. Home Study graduates: Exclusive discount for Home Study completers\n4. Social media: \"Student Transformation\" posts, \"Behind the Curriculum\" content\n5. Affiliate program: 30% commission for affiliates promoting the course\n\n**Timeline:** Launch 8–12 weeks after book publication. Run live cohorts quarterly.",
    connected: "**Connected Products:**\n• **Workbook** → Course Workbook is an enhanced version of the standalone Workbook\n• **Home Study** → Home Study is the \"lite\" version; course is the \"full\" version\n• **Coaching** → Course graduates are pre-qualified coaching leads\n• **Webinars** → Free preview webinar drives course enrollment\n• **Certification** → Course completion is a prerequisite for certification\n• **Memberships** → Course alumni get discounted membership access",
  },

  // ── BRIDGE ─────────────────────────────────────────────
  "audiobook": {
    methodology: "**Framework: Multi-Format Content Repurposing**\n\nYour audiobook is your book in audio format — narrated by you (author-narrated) or a professional narrator. Author-narrated audiobooks create a stronger personal connection and perform 20–30% better in the self-help/business category.",
    market: "**Audiobook Market:** The audiobook market reached $7.7B in 2024, growing 25% year-over-year. 45% of audiobook listeners are new to the format — it's a growing audience, not a cannibalization of print sales.\n\n**Pricing:** Audiobooks sell for $14.99–$29.99 on Audible, or 1 credit ($14.95/month). Authors earn $3.43–$7.49 per sale through ACX/Audible.",
    pricing: "**Value Ladder Position:** Foundation (Parallel to Book Sales)\n\n**Revenue Model:** Royalty-based through Audible/ACX (40% exclusive, 25% non-exclusive) or direct sales through your website (85–90% margin).",
    marketing: "**Auto-Generated Campaigns:**\n1. Audio sample clips for social media (30–60 second excerpts)\n2. \"Now Available in Audio\" email to book buyers\n3. Podcast tour: Use audiobook clips as podcast guest content",
    connected: "**Connected Products:**\n• **Podcast Tour** → Audiobook clips used as podcast guest content\n• **Social Media** → Audio snippets for Instagram/TikTok\n• **Book Sales** → Cross-promotion on book listing",
  },
  "podcast-scripts": {
    methodology: "**Framework: Strategic Guest Appearance Mapping**\n\nA Podcast Tour is a coordinated series of guest appearances on podcasts relevant to your book's topic. Abby identifies target podcasts based on audience overlap, episode topics, and host alignment with your message.",
    market: "**Podcast Benchmarks:** A single podcast guest appearance drives 50–500 book sales depending on audience size. A 10-podcast tour can generate $5,000–$50,000 in book and product sales.",
    pricing: "**Value Ladder Position:** Free (Audience Building + Credibility)\n\n**Revenue Model:** Podcast appearances are free — the value is audience exposure, email list growth, and credibility building.",
    marketing: "**Auto-Generated Assets:**\n1. Podcast pitch template customized to your book\n2. 10–20 target podcast list with contact info\n3. Interview talking points per podcast\n4. Post-appearance social media promotion templates",
    connected: "**Connected Products:**\n• **Audiobook** → Podcast clips drive audiobook sales\n• **Email Marketing** → \"Listen to my interview\" emails\n• **Lead Magnets** → Podcast-exclusive free download offers\n• **Book Sales** → Every appearance includes a book mention",
  },
  "webinar": {
    methodology: "**Framework: Teach → Offer Webinar Model**\n\nWebinars follow the proven \"Teach → Offer\" structure: 45 minutes of genuine value teaching, followed by a 15-minute offer for your paid product. The teaching builds trust and demonstrates expertise; the offer converts that trust into revenue.",
    market: "**Webinar Benchmarks:** Average webinar attendance rate is 40–50% of registrants. Conversion rate from attendee to buyer is 5–15%. A webinar with 100 attendees selling a $197 course converts 5–15 sales = $985–$2,955 per webinar.",
    pricing: "**Value Ladder Position:** Free (Lead Generation + Sales Tool)\n\n**Revenue Model:** Webinars are free to attend — they sell your paid products (courses, coaching, memberships).",
    marketing: "**Auto-Generated Assets:**\n1. Webinar slide deck template\n2. Registration page\n3. 5-email promotion sequence\n4. Post-webinar follow-up sequence (attendees + no-shows)\n5. Replay page with CTA",
    connected: "**Connected Products:**\n• **Online Course** → Webinar is the primary sales tool for courses\n• **Home Study** → Webinar preview of Day 1 content\n• **Coaching** → Webinar attendees are warm coaching leads\n• **Email Marketing** → Webinar registrants join your email list",
  },
  "lead-magnet": {
    methodology: "**Framework: Value-First List Building**\n\nA Lead Magnet is a free, high-value resource that solves one specific problem for your target reader. In exchange, they give you their email address. The lead magnet must be immediately useful and directly related to your book's core promise.",
    market: "**Lead Magnet Benchmarks:** The best-performing lead magnets convert 20–50% of landing page visitors to subscribers. Checklists and templates outperform ebooks 3:1 for conversion rate. The ideal lead magnet takes less than 5 minutes to consume.",
    pricing: "**Value Ladder Position:** Free (Bait)\n\n**Revenue Model:** Free — the value is email addresses. Each email subscriber is worth $1–$5/month in future revenue across all products.",
    marketing: "**Auto-Generated Assets:**\n1. 3 lead magnet options (checklist, template, mini-guide) derived from your book\n2. Landing page for each lead magnet\n3. Thank-you page with immediate upsell (Workbook or Home Study)\n4. Welcome email sequence triggered by download",
    connected: "**Connected Products:**\n• **Email Marketing** → Lead magnets feed the email list\n• **Social Media** → Lead magnets promoted via social posts\n• **Webinars** → Lead magnet offered as webinar bonus\n• **Website** → Lead magnet popup on author website",
  },
  "media-outreach": {
    methodology: "**Framework: Authority Positioning Through Earned Media**\n\nMedia Outreach is a systematic campaign to get featured in podcasts, blogs, magazines, newspapers, and TV/radio relevant to your book's topic. Abby generates pitch templates, target media lists, and follow-up sequences.",
    market: "**Media Benchmarks:** A single feature in a major publication can drive 1,000–10,000 book sales. Authors with 5+ media features in the first 90 days sell 3x more books than those without.",
    pricing: "**Value Ladder Position:** Free (Credibility Building)\n\n**Revenue Model:** Media appearances are free — the value is credibility, audience reach, and social proof that enhances all other product sales.",
    marketing: "**Auto-Generated Assets:**\n1. Press kit (bio, headshot, book summary, interview topics)\n2. 20–30 target media outlet list\n3. Pitch email templates (3 angles)\n4. Follow-up sequence",
    connected: "**Connected Products:**\n• **Podcast Tour** → Media outreach includes podcast pitching\n• **Book Sales** → Media features drive book sales\n• **Social Media** → \"As featured in...\" social proof posts\n• **Keynotes** → Media credibility leads to speaking invitations",
  },
  "affiliates": {
    methodology: "**Framework: Partner-Driven Revenue Sharing**\n\nAn Affiliate Program lets other people (bloggers, influencers, other authors, coaches) sell your products and earn a commission. Abby sets up your affiliate program with tracking links, commission structures, and promotional assets.",
    market: "**Affiliate Benchmarks:** Affiliate marketing drives 15–30% of all e-commerce revenue. The average affiliate commission for digital products is 30–50%. Top affiliates can generate $1,000–$10,000/month per product.",
    pricing: "**Value Ladder Position:** Distribution Channel (applies to all products)\n\n**Commission Structure:** 30% for digital products (Workbook, Home Study, Course), 15% for physical products (Book, Special Editions), 20% for services (Coaching, Memberships).",
    marketing: "**Auto-Generated Assets:**\n1. Affiliate signup page\n2. Promotional swipe files (emails, social posts, banner ads)\n3. Tracking dashboard for affiliates\n4. Monthly affiliate newsletter template",
    connected: "**Connected Products:**\n• **All Products** → Affiliates can promote any product in your catalog\n• **Special Editions** → Higher commission on premium editions drives affiliate enthusiasm\n• **Online Course** → Course affiliates earn the highest absolute commissions",
  },
  "upsell": {
    methodology: "**Framework: Post-Purchase Value Maximization**\n\nUpsells are additional product offers presented immediately after a purchase. The psychology is simple: a buyer who just said \"yes\" is 60–70% more likely to say \"yes\" again within the next 5 minutes. Abby designs your upsell sequences based on your product catalog.",
    market: "**Upsell Benchmarks:** Post-purchase upsells convert at 10–25% (vs. 1–3% for cold traffic). The average upsell increases order value by 30–40%.",
    pricing: "**Value Ladder Position:** Multiplier (increases average order value)\n\n**Pricing Rule:** Upsell price should be 30–60% of the original purchase. If someone buys a $47 Home Study, the upsell should be $19–$29 (e.g., the Workbook).",
    marketing: "**Auto-Generated Sequences:**\n1. Book purchase → Workbook upsell ($14.99)\n2. Workbook purchase → Home Study upsell ($47)\n3. Home Study purchase → Online Course upsell ($197)\n4. Course purchase → Coaching upsell ($997)",
    connected: "**Connected Products:**\n• **All Products** → Every product has an upsell path to the next tier\n• **Email Marketing** → Abandoned upsell follow-up emails",
  },
  "revenue-share": {
    methodology: "**Framework: Strategic Partnership Revenue Splits**\n\nRevenue Sharing is a partnership model where you co-create or co-promote products with other authors, coaches, or organizations and split the revenue. This works especially well for cross-audience products (e.g., your book + another author's course = joint workshop).",
    market: "**Partnership Benchmarks:** Joint ventures between complementary authors generate 2–5x the revenue of solo launches. The standard revenue split is 50/50 for co-created products and 70/30 (creator/promoter) for promoted products.",
    pricing: "**Value Ladder Position:** Multiplier (leverages other people's audiences)\n\n**Revenue Split:** 50/50 for co-created products, 70/30 for promotion-only partnerships.",
    marketing: "**Auto-Generated Assets:**\n1. Partnership proposal template\n2. Revenue sharing agreement template\n3. Joint webinar promotion sequence\n4. Co-branded landing page template",
    connected: "**Connected Products:**\n• **Webinars** → Joint webinars with partners\n• **Online Course** → Co-taught courses\n• **Affiliates** → Revenue sharing is a deeper form of affiliate partnership",
  },

  // ── YIELD ──────────────────────────────────────────────
  "coaching": {
    methodology: "**Framework: Transformational Coaching Model (ICF-Aligned)**\n\n1-on-1 Coaching is a private, personalized engagement where you guide a client through the transformation your book promises. Sessions follow the GROW model: Goal (what do you want?), Reality (where are you now?), Options (what could you do?), Will (what will you do?).",
    market: "**Coaching Benchmarks:** The coaching industry is worth $20B globally. Non-fiction author coaches charge $150–$500/hour or $997–$5,000 per 3-month package. Authors with published books charge 2–3x more than non-published coaches.",
    pricing: "**Value Ladder Position:** High-Ticket\n\n**Recommended Pricing:** $997–$5,000 per 3-month package (8–12 sessions).",
    marketing: "Coaching is sold through **demonstration of expertise**: free webinars, book content, and social proof. Your book readers are pre-sold on your methodology — they just need a personal application. Convert through **Webinars** and **Email Marketing**.",
    connected: "**Connected Products:**\n• **Online Course** → Course graduates are pre-qualified coaching leads\n• **Home Study** → Home Study completers are warm coaching prospects\n• **Group Coaching** → 1-on-1 clients can be upgraded to group coaching facilitators",
  },
  "group-coaching": {
    methodology: "**Framework: Cohort-Based Peer Learning**\n\nGroup Coaching combines your expert guidance with peer accountability. Groups of 10–20 participants meet weekly for 8–12 weeks. The power is in the community — participants learn from each other's questions, challenges, and breakthroughs.",
    market: "**Group Coaching Benchmarks:** Group coaching programs sell for $297–$997 per participant. A group of 15 at $497 = $7,455 per cohort. Running 4 cohorts/year = $29,820.",
    pricing: "**Value Ladder Position:** Premium\n\n**Recommended Pricing:** $297–$997 per participant per cohort.",
    marketing: "Position group coaching as the **\"best of both worlds\"** — personal attention at a fraction of 1-on-1 pricing. Launch through **Webinars** showcasing the community aspect. Use FOMO: \"Only 12 spots per cohort.\"",
    connected: "**Connected Products:**\n• **Online Course** → Course + Group Coaching bundle\n• **Memberships** → Group coaching alumni join the membership community\n• **Masterminds** → Top group coaching participants graduate to Masterminds",
  },
  "membership": {
    methodology: "**Framework: Recurring Revenue Community Model**\n\nMemberships provide ongoing access to your content, community, and expertise for a monthly/annual fee. The key is continuous value delivery — new content monthly, live Q&A sessions, community discussions, and member-only resources.",
    market: "**Membership Benchmarks:** Author-led memberships charge $19–$97/month. Average retention is 4–8 months. A membership with 100 members at $47/month = $4,700/month = $56,400/year.",
    pricing: "**Value Ladder Position:** Recurring Revenue (Core)\n\n**Recommended Pricing:** $27/month or $247/year (annual discount).",
    marketing: "Memberships convert best from **existing customers** — book buyers, course students, webinar attendees. The value proposition: ongoing access to you and your community. Use free trials (7–14 days) to reduce signup friction.",
    connected: "**Connected Products:**\n• **All Products** → Membership includes discounts on all products\n• **Group Coaching** → Membership is the \"lite\" version of group coaching\n• **Reading Club** → Reading Club members are natural membership prospects",
  },
  "consulting": {
    methodology: "**Framework: Expert Advisory for Organizations**\n\nConsulting applies your book's methodology to organizations (companies, non-profits, government). Unlike coaching (personal transformation), consulting delivers business outcomes — process improvements, strategy development, team training.",
    market: "**Consulting Benchmarks:** Author-consultants charge $2,000–$10,000/day or $10,000–$50,000 per project. Authors with published books are perceived as 3–5x more credible than non-published consultants.",
    pricing: "**Value Ladder Position:** High-Ticket (B2B)\n\n**Recommended Pricing:** $5,000–$15,000 per engagement.",
    marketing: "Consulting is sold through **credibility and case studies**. Your book establishes methodology. Speaking engagements demonstrate expertise. Client results prove ROI. The sales cycle is 30–90 days with decision-makers.",
    connected: "**Connected Products:**\n• **Keynotes** → Speaking engagements lead to consulting contracts\n• **Training** → Consulting often includes training components\n• **Certification** → Consultants can certify client teams",
  },
  "keynotes": {
    methodology: "**Framework: Signature Talk Development**\n\nA Keynote is a 45–60 minute signature talk based on your book's core message. Abby helps you develop 3 signature talk outlines with different angles for different audiences (corporate, association, university).",
    market: "**Speaking Benchmarks:** First-time author speakers earn $2,500–$5,000 per keynote. Established author speakers earn $10,000–$25,000+. The speaking industry is worth $2B annually.",
    pricing: "**Value Ladder Position:** High-Ticket + Lead Generation\n\n**Recommended Pricing:** $5,000–$25,000 per keynote.",
    marketing: "Keynotes are **sold through speaker bureaus, your website's speaking page, and direct outreach** to event organizers. Your book is your speaker demo reel. Include a sizzle reel, testimonials, and 3 talk titles on your speaking page.",
    connected: "**Connected Products:**\n• **Consulting** → Keynotes lead to consulting contracts\n• **Training** → Keynotes lead to training program sales\n• **Book Sales** → Back-of-room book sales at events (200–500 copies per event)",
  },
  "training-programs": {
    methodology: "**Framework: Organizational Learning Design (ADDIE Model)**\n\nTraining Programs are multi-week engagements where you teach your book's methodology to teams within organizations. Unlike keynotes (inspiration) or consulting (strategy), training focuses on skill transfer — participants leave with new capabilities.",
    market: "**Training Benchmarks:** Corporate training programs sell for $10,000–$50,000 per engagement. The corporate training market is worth $370B globally.",
    pricing: "**Value Ladder Position:** High-Ticket (B2B)\n\n**Recommended Pricing:** $10,000–$50,000 per program.",
    marketing: "Sell training programs to **HR directors, L&D managers, and conference organizers**. Your book is the proof of concept. Offer a free 90-minute preview workshop to demonstrate the methodology. Use **LinkedIn** and **Consulting** relationships for lead generation.",
    connected: "**Connected Products:**\n• **Keynotes** → Training is the \"deep dive\" follow-up to a keynote\n• **Certification** → Training participants can pursue certification\n• **Consulting** → Training + Consulting bundled for enterprise clients",
  },
  "masterminds": {
    methodology: "**Framework: Peer Advisory Group Model (Napoleon Hill's Think and Grow Rich)**\n\nMasterminds are small groups (8–15) of high-achieving individuals who meet regularly to share challenges, insights, and accountability. You facilitate, but the group's collective intelligence is the primary value.",
    market: "**Mastermind Benchmarks:** Author-led masterminds charge $5,000–$25,000/year per member. A mastermind with 10 members at $10,000/year = $100,000/year from a single group.",
    pricing: "**Value Ladder Position:** Ultra-Premium\n\n**Recommended Pricing:** $5,000–$25,000/year per member.",
    marketing: "Masterminds are **invitation-only or application-based**. Market to your best coaching clients, course graduates, and high-engagement email subscribers. Scarcity is real, not manufactured — you genuinely limit the group size.",
    connected: "**Connected Products:**\n• **Group Coaching** → Mastermind is the premium upgrade from group coaching\n• **Retreats** → Mastermind members get priority access to retreats\n• **Consulting** → Mastermind members often become consulting clients",
  },
  "retreats": {
    methodology: "**Framework: Immersive Transformation Experience**\n\nRetreats are 2–5 day immersive experiences in a curated location. They combine teaching, workshops, networking, and personal reflection in an environment removed from daily distractions.",
    market: "**Retreat Benchmarks:** Author-led retreats charge $1,500–$5,000 per participant (excluding travel/accommodation). A retreat with 20 participants at $2,500 = $50,000 per event.",
    pricing: "**Value Ladder Position:** Premium Experience\n\n**Recommended Pricing:** $1,500–$5,000 per participant.",
    marketing: "Market retreats to your **highest-engagement audience**: mastermind members, coaching clients, and course graduates. Use FOMO (limited spots), social proof (past attendee testimonials), and aspirational imagery of the venue and experience.",
    connected: "**Connected Products:**\n• **Masterminds** → Retreats are annual events for mastermind members\n• **Coaching** → Retreat attendees are warm coaching leads\n• **Certification** → Retreats can include certification components",
  },
  "certification": {
    methodology: "**Framework: Licensed Methodology Replication**\n\nCertification allows others to teach your methodology. Certified practitioners pay for training, pass an assessment, and receive a license to deliver your content to their own audiences. This is the ultimate leverage — your methodology scales without your time.",
    market: "**Certification Benchmarks:** Author certification programs charge $2,000–$10,000 per certifee. Programs with 50+ certified practitioners generate $100,000–$500,000/year in licensing fees alone.",
    pricing: "**Value Ladder Position:** Ultra-Premium (Leveraged)\n\n**Recommended Pricing:** $2,000–$10,000 per certification.",
    marketing: "Market certification to your **most successful students** — coaching clients, training program graduates, and mastermind members. Position it as a career advancement tool: \"Become a Certified [Your Method] Practitioner.\"",
    connected: "**Connected Products:**\n• **Online Course** → Course completion is a prerequisite for certification\n• **Training** → Certified practitioners deliver your training programs\n• **Consulting** → Certified practitioners consult using your methodology",
  },
  "conventions": {
    methodology: "**Framework: Community Gathering + Multi-Speaker Event**\n\nConventions are large-scale events (100–1,000+ attendees) built around your book's topic. You're the host/headliner, with additional speakers, workshops, networking, and an expo floor.",
    market: "**Convention Benchmarks:** Author-hosted conventions charge $297–$1,997 per ticket. A convention with 300 attendees at $497 = $149,100 in ticket revenue, plus sponsor revenue.",
    pricing: "**Value Ladder Position:** Premium Event + Brand Building\n\n**Recommended Pricing:** $297–$1,997 per ticket.",
    marketing: "Position your convention as the **\"must-attend event\"** in your niche. Secure 2–3 headline speakers to drive registrations. Early-bird pricing (30% discount) creates urgency and early cash flow. Use **Email Marketing** for the primary promotion channel.",
    connected: "**Connected Products:**\n• **Keynotes** → You keynote your own convention\n• **Exhibitors** → Sponsors and exhibitors pay for booth space\n• **All Products** → Convention is a sales event for your entire catalog",
  },
  "fundraising": {
    methodology: "**Framework: Cause-Aligned Revenue Generation**\n\nFund Raising uses your book and platform to raise money for causes aligned with your message. This builds goodwill, media coverage, and audience loyalty while generating revenue through charity editions, benefit events, and cause-marketing campaigns.",
    market: "**Cause Marketing Benchmarks:** 87% of consumers will purchase a product because a company advocated for an issue they cared about. Charity editions and benefit events generate 15–30% more media coverage than standard launches.",
    pricing: "**Value Ladder Position:** Brand Building + Revenue\n\n**Revenue Model:** Percentage of sales donated to cause (typically 10–25%), or full charity events with ticket sales.",
    marketing: "Fundraising campaigns leverage **storytelling and urgency**: \"Help us reach our goal of $X by [date].\" Partner with established charities for credibility. Use matching gifts to double impact. Share progress publicly to maintain momentum.",
    connected: "**Connected Products:**\n• **Special Editions** → Charity editions (portion of proceeds donated)\n• **Conventions** → Benefit galas and charity events\n• **Media Outreach** → Cause-aligned stories get more media coverage",
  },
  "exhibitors": {
    methodology: "**Framework: Trade Show and Expo Presence**\n\nExhibiting at trade shows, book fairs, and industry conferences puts your book and products in front of targeted audiences. Abby identifies the most relevant events, designs your booth strategy, and creates promotional materials.",
    market: "**Exhibitor Benchmarks:** Book fair booths cost $500–$5,000 depending on the event. Authors who exhibit at 3+ events/year sell 2–4x more books than those who don't. The ROI comes from direct sales, media contacts, and bulk orders.",
    pricing: "**Value Ladder Position:** Distribution + Networking\n\n**Revenue Model:** Direct book sales at events, plus bulk order leads from corporate buyers and bookstores.",
    marketing: "Recruit exhibitors through **direct outreach** to companies serving your audience. Provide attendee demographics, past event data, and expected foot traffic. Position exhibition as a customer acquisition channel, not just brand awareness.",
    connected: "**Connected Products:**\n• **Book Sales** → Direct sales at events\n• **Special Editions** → Signed copies sold at booth\n• **Conventions** → Exhibiting at your own convention\n• **Media Outreach** → Press contacts at events",
  },
  // Additional builder IDs that may be used
  "in-house-speaker": {
    methodology: "**Framework: Corporate Alignment Approach**\n\nIn-house speaking engagements customize your book's message to address the client organization's specific challenges, culture, and strategic objectives. Abby helps you create modular talk components that can be mixed and matched for different corporate audiences.",
    market: "**Corporate Speaking Benchmarks:** Companies book 3–5 external speakers annually. Authors with published methodology command $5,000–$20,000 per engagement, with repeat bookings at 35% rate.",
    pricing: "**Value Ladder Position:** High-Ticket (B2B)\n\n**Recommended Pricing:** $3,000–$15,000 per engagement. Half-day workshops: $5,000–$20,000.",
    marketing: "Target **HR leaders, event coordinators, and C-suite executives** through LinkedIn outreach, speaker bureaus, and referrals from past clients. Your book serves as a leave-behind that extends the impact of your talk.",
    connected: "**Connected Products:**\n• **Training Programs** → Speaking leads to multi-day engagements\n• **Consulting** → Speaking leads to strategic advisory\n• **Book Sales** → Audience members purchase books\n• **Online Course** → Attendees enroll in courses",
  },
  "jv-partnerships": {
    methodology: "**Framework: Complementary Audience Strategy**\n\nJoint venture partnerships pair you with authors, speakers, and experts whose audiences overlap 30–50% with yours. Abby identifies ideal partners based on your genre, audience demographics, and product suite.",
    market: "**JV Benchmarks:** JV partnerships generate $10,000–$100,000+ per collaboration. A partner with 5,000 engaged subscribers can drive more sales than one with 50,000 passive followers.",
    pricing: "**Revenue Structure:** 50/50 revenue split for joint products, 40–50% commission for promotions, or flat fee ($2,000–$10,000) for list access.",
    marketing: "Build JV relationships through **genuine value exchange**: promote their products first, offer exclusive content for their audience, and make the partnership easy (provide all marketing materials).",
    connected: "**Connected Products:**\n• **Webinars** → Joint webinars with partners\n• **Online Courses** → Co-taught courses\n• **Revenue Sharing** → JVs evolve into revenue sharing arrangements",
  },
  "big-ticket": {
    methodology: "**Framework: High-Touch Transformation Model**\n\nBig-ticket offerings use premium pricing justified by personalized attention, guaranteed outcomes, and exclusive access. Abby packages your expertise into comprehensive solutions that solve major problems for high-net-worth clients.",
    market: "**High-Ticket Benchmarks:** Programs at $5,000–$50,000+ serve the top 1–5% of your audience. These clients value time over money and want the fastest path to results. A single big-ticket sale can equal 100+ book sales.",
    pricing: "**Value Ladder Position:** Ultra-Premium\n\n**Recommended Pricing:** $5,000–$50,000 per engagement. Include 1:1 coaching, VIP experiences, done-for-you services, and lifetime access to your content library.",
    marketing: "Sell big-ticket through **personal relationships, referrals, and application processes**. Never use buy buttons — use \"Apply Now\" to maintain exclusivity. The sales process includes a discovery call, proposal, and onboarding experience.",
    connected: "**Connected Products:**\n• Big-ticket clients are the pinnacle of your product suite\n• They've typically purchased **Books**, completed **Courses**, participated in **Coaching**, and attended **Retreats**",
  },
  "licensing": {
    methodology: "**Framework: Intellectual Property Monetization**\n\nYour book's methodology, frameworks, and branded content are licensed to organizations for internal use, training, or co-branded products. Abby structures deals that protect your IP while maximizing distribution.",
    market: "**Licensing Benchmarks:** Content licensing generates $5,000–$100,000+ annually per licensee. Organizations prefer licensed, proven content over developing their own.",
    pricing: "**Value Ladder Position:** Ultra-Premium (Leveraged)\n\n**Recommended Pricing:** $5,000–$50,000/year depending on scope, exclusivity, and organization size. Per-use fees ($50–$500 per participant) for training applications.",
    marketing: "Target **L&D departments, franchise organizations, and educational institutions** that need scalable, proven content. Your book is the proof of concept.",
    connected: "**Connected Products:**\n• **Training Programs** → Licensed content extends your training\n• **Certification** → Licensees become certification program sponsors\n• **Consulting** → Consulting engagements reveal licensing opportunities",
  },
  "community": {
    methodology: "**Framework: Belonging + Growth Model**\n\nPeople stay in communities that make them feel seen (belonging) and help them improve (growth). Abby structures community spaces with weekly rituals, member spotlights, and progressive challenges tied to your book's methodology.",
    market: "**Community Benchmarks:** Online communities have a 78% member retention rate when properly managed vs. 15% for passive groups. Members who participate buy 2.5x more products.",
    pricing: "**Value Ladder Position:** Free tier (basic discussion) + Premium tier ($9.99–$27/month with live sessions, exclusive content, and networking).",
    marketing: "Communities are **self-marketing engines**: satisfied members invite peers, share wins, and create user-generated content. Launch with a founding members cohort of 50–100.",
    connected: "**Connected Products:**\n• **Social Media** → Community discussions surface content\n• **Coaching** → Active members upgrade to coaching\n• **Online Course** → Member Q&As improve your course",
  },
  "white-label": {
    methodology: "**Framework: Brand Extension Model**\n\nYour proven methodology is repackaged under a client's brand for their internal use or resale. Abby creates modular content that can be easily customized with different branding while maintaining your IP protection.",
    market: "**White-Label Benchmarks:** White-label content licensing is a $10B+ industry. Organizations pay premium for proven, ready-to-deploy content rather than developing from scratch.",
    pricing: "**Value Ladder Position:** Ultra-Premium\n\n**Recommended Pricing:** $10,000–$100,000 per deal. Per-seat models ($100–$500/user) scale with the client's organization.",
    marketing: "Target **training companies, coaches, and consultants** who need proven content for their clients. Your book establishes the methodology's credibility.",
    connected: "**Connected Products:**\n• **Workbook** and **Online Course** content used in white-label products\n• **Certification** → White-label clients become certification candidates",
  },
  "events": {
    methodology: "**Framework: Experience Design**\n\nEvery element — from venue selection to agenda flow — serves the dual purpose of delivering value and creating shareable moments. Abby designs events that transform attendees while generating content for your marketing.",
    market: "**Event Benchmarks:** Live events have an 85% satisfaction rate vs. 45% for virtual experiences. Event attendees spend 3x more on products than non-attendees.",
    pricing: "**Value Ladder Position:** Premium Experience\n\n**Recommended Pricing:** $97–$497 for day events, $497–$2,997 for multi-day. VIP upgrades ($500–$2,000 premium).",
    marketing: "Events are **relationship accelerators** that deepen connections with your audience. Promote through **Email Marketing**, **Social Media**, and **Affiliate** partners.",
    connected: "**Connected Products:**\n• **Books** → Back-of-room sales\n• **Coaching** → VIP upgrades\n• **Community** and **Membership** → Attendees join post-event",
  },
  "franchise": {
    methodology: "**Framework: Replication System**\n\nDocument every process, create training materials, and establish quality standards so your methodology can be delivered consistently by licensed operators. Abby helps you build the operations manual.",
    market: "**Franchise Benchmarks:** Franchise-model educational programs generate $500,000–$5M+ in annual system-wide revenue. Each franchisee extends your brand reach to new markets.",
    pricing: "**Value Ladder Position:** Ultra-Premium (Maximum Leverage)\n\n**Recommended Pricing:** $10,000–$50,000 initial investment, plus 5–8% ongoing royalties.",
    marketing: "Market franchises to **successful Certification graduates** who want to build a business around your methodology. Provide proven business models and ongoing operational support.",
    connected: "**Connected Products:**\n• **Certification** → Entry point for franchisees\n• **Training Programs** → Franchisees deliver your training\n• **Conventions** → Franchisee success stories at events",
  },
};

// Fallback for any unmapped product
const FALLBACK: BehindTheDesignData = {
  methodology: "Abby uses proven pedagogical and business frameworks tailored to your book's unique content and audience. Every design decision is grounded in research-backed best practices for knowledge transfer and engagement.",
  market: "Market analysis considers your genre, audience size, competitor pricing, and seasonal demand patterns to position your product for maximum impact and discoverability.",
  pricing: "Pricing is calibrated using competitive analysis, perceived value benchmarks, and your audience's willingness to pay. The goal is to maximize revenue while maintaining accessibility for your target market.",
  marketing: "Your marketing strategy integrates with your existing products and audience touchpoints. Every promotional element is designed to drive measurable conversions across your product ecosystem.",
  connected: "This product connects to your broader author business suite — feeding leads, content, and revenue into complementary offerings. Each product strengthens the others in a self-reinforcing ecosystem.",
};

export function getBehindTheDesignContent(builderId: string): BehindTheDesignData {
  return CONTENT[builderId] || FALLBACK;
}
