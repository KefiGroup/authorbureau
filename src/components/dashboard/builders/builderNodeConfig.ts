import type { SubscriptionTier } from "@/hooks/useAuth";

export interface BuilderStep {
  id: string;
  label: string;
  description: string;
  abbyTip: string;
  act?: 1 | 2 | 3; // 1=Analyse, 2=Build, 3=Bridge
}

export interface BuilderNodeConfig {
  id: string;
  label: string;
  category: "build" | "bridge" | "yield";
  requiredTier: SubscriptionTier;
  dbTable: string;
  steps: BuilderStep[];
  abbyGreeting: string;
  abbyPublishMessage: string;
  icon: string;
  color: string;
  customRenderer?: string;
  loadingMessages: string[];
}

const workbookBuilder: BuilderNodeConfig = {
  id: "workbook",
  label: "Workbook Builder",
  category: "build",
  requiredTier: "brand",
  dbTable: "workbooks",
  icon: "FileText",
  color: "text-emerald-500",
  customRenderer: "workbook",
  abbyGreeting: "Your business plan recommends this workbook as your first product — it's a quick win that builds your email list. Let's make it great.",
  abbyPublishMessage: "Great work! Your workbook is live. Next up in your plan: the Online Course. Want to start building it?",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying practical exercises in your chapters",
    "Mapping chapter themes to workbook sections",
    "Designing reflection prompts and action items",
    "Creating your Workbook Blueprint",
    "Preparing your Workbook Proposal",
  ],
  steps: [
    { id: "setup", label: "Workbook Creation", description: "Create your workbook on PublishNow.io", abbyTip: "Your business plan positions this workbook as a free lead magnet. Free workbooks with a strong CTA on the last page convert 15-25% of readers to your email list." },
    { id: "upload", label: "Upload Final Workbook", description: "Upload your completed workbook PDF for distribution", abbyTip: "Once your workbook is ready, upload it here so Abby can help you distribute, price, and market it to your audience." },
  ],
};

const socialMediaBuilder: BuilderNodeConfig = {
  id: "social-media",
  label: "Social Media Calendar",
  category: "build",
  requiredTier: "brand",
  dbTable: "social_media_content",
  icon: "Share2",
  color: "text-emerald-500",
  customRenderer: "social-media",
  abbyGreeting: "A consistent social media presence is key to building your author brand. Let's create a 90-day content calendar from your book.",
  abbyPublishMessage: "Your social media kit is ready! All 20 posts are saved to your Social Calendar in Marketing Hub — copy, post, and mark them done as you go.",
  loadingMessages: [
    "Reading your manuscript",
    "Extracting quotable insights and key themes",
    "Analyzing your target audience and best platforms",
    "Designing content pillars from your book's themes",
    "Creating a 90-day posting calendar",
    "Preparing your Social Media Strategy",
  ],
  steps: [
    { id: "setup", label: "Social Media Setup", description: "Select platforms, frequency, content pillars, tone, and duration", abbyTip: "For non-fiction authors, LinkedIn and Instagram drive the most course sales. I recommend 3x/week on each. Your book's themes naturally create 4 content pillars." },
    { id: "generate", label: "Content Generation", description: "AI generates the full calendar with platform-specific posts", abbyTip: "I'm pulling key quotes, insights, and talking points from your strongest chapters. Each post is optimized for its platform." },
    { id: "graphics", label: "Visual Assets", description: "AI-generated graphics and templates for each post", abbyTip: "Consistent visual branding builds recognition. All graphics use your book's color palette for brand consistency." },
    { id: "hashtags", label: "Hashtag & CTA Strategy", description: "Platform-specific hashtags and CTA rotation", abbyTip: "Best posting times: LinkedIn 9-11am, Instagram 11am-1pm, X 8-10am. Rotate CTAs to drive traffic across all your products." },
    { id: "publish", label: "Preview & Publish", description: "Preview calendar, export CSV, or publish", abbyTip: "Consistent posting for 90 days typically grows an author's following by 30-50% and drives significant traffic to your product pages." },
  ],
};

const emailMarketingBuilder: BuilderNodeConfig = {
  id: "email-flows",
  label: "Email Marketing",
  category: "build",
  requiredTier: "brand",
  dbTable: "email_flows",
  icon: "Mail",
  color: "text-emerald-500",
  customRenderer: "email-marketing",
  abbyGreeting: "Email is where the money is. Let's build a complete email marketing system that nurtures readers into customers — all derived from your book content.",
  abbyPublishMessage: "Your email marketing system is live! Welcome sequences, nurture campaigns, and automation rules are all ready. Next: build your Home Study Course.",
  loadingMessages: [
    "Reading your manuscript",
    "Mapping your reader-to-buyer journey",
    "Designing email sequences from your book's key insights",
    "Creating automation triggers and segmentation rules",
    "Writing subject lines and email copy in your voice",
    "Preparing your Email Marketing Strategy",
  ],
  steps: [
    { id: "setup", label: "Email Strategy", description: "Set list name, lead magnet, frequency, tone, and primary goal", abbyTip: "Your workbook is the perfect lead magnet. I'll create a welcome sequence that warms subscribers up to your Online Course over 14 days." },
    { id: "sequences", label: "Sequence Builder", description: "AI generates welcome, nurture, launch, and re-engagement sequences", abbyTip: "I'll create 4 interconnected sequences from your book. Each serves a different purpose in your reader-to-buyer journey." },
    { id: "content", label: "Email Content", description: "Edit subject lines, body, CTAs, and timing for each email", abbyTip: "Subject lines under 50 characters get 12% higher open rates. Make them curiosity-driven. Every email needs a clear single CTA." },
    { id: "automation", label: "Automation Rules", description: "Visual flowchart of triggers, conditions, and actions", abbyTip: "Automations turn your email system into a 24/7 sales machine. Connect sequences so subscribers flow naturally through your funnel." },
    { id: "publish", label: "Preview & Publish", description: "Preview emails, test send, and publish", abbyTip: "A well-crafted welcome sequence converts 5-10% of subscribers to buyers. With consistent list building, this system pays for itself." },
  ],
};

const homeStudyCourseBuilder: BuilderNodeConfig = {
  id: "home-study-course",
  label: "Home Study Course",
  category: "build",
  requiredTier: "brand",
  dbTable: "home_study_courses",
  icon: "GraduationCap",
  color: "text-emerald-500",
  customRenderer: "home-study",
  abbyGreeting: "A self-paced course is perfect for readers who want to go deeper. Let's turn your book into a structured learning experience.",
  abbyPublishMessage: "Your home study course is ready! This is a great passive income product. Consider adding a Workbook companion next.",
  loadingMessages: [
    "Analyzing your book for a self-paced study program",
    "Designing a daily reading and exercise schedule",
    "Mapping chapters to daily themes and lessons",
    "Creating practical exercises and reflection prompts",
    "Designing your Value Ladder positioning",
    "Preparing your Home Study Program Proposal",
  ],
  steps: [
    { id: "setup", label: "Program Setup", description: "Abby analyzes your manuscript and generates the full program", abbyTip: "A 21-day program at 15–30 minutes/day has the highest completion rate for self-help books. I recommend this format for your audience." },
    { id: "edit", label: "Edit & Publish", description: "Review and edit all days, then publish to your website", abbyTip: "Review each day's reading, exercise, reflection, and action plan. Edit anything you'd like, then hit Publish when ready." },
  ],
};

const bookSalesBuilder: BuilderNodeConfig = {
  id: "book-sales",
  label: "Book Sales (Events)",
  category: "build",
  requiredTier: "brand",
  dbTable: "books",
  icon: "ShoppingBag",
  color: "text-emerald-500",
  customRenderer: "book-sales",
  abbyGreeting: "Selling books at events can be highly profitable with the right setup. Let's create your event sales kit.",
  abbyPublishMessage: "Your event sales kit is ready! Print your materials and start booking speaking gigs.",
  loadingMessages: [
    "Reading your manuscript",
    "Analyzing your book's target audience and events",
    "Designing your event sales kit and materials",
    "Creating QR codes and lead capture strategy",
    "Preparing your Event Sales Plan",
  ],
  steps: [
    { id: "setup", label: "Event Sales Setup", description: "Set event type, attendance, books to bring, pricing, and payment methods", abbyTip: "Back-of-room book sales after a keynote convert at 30-50% of the audience. For a 200-person event, bring 60-100 books." },
    { id: "materials", label: "Sales Materials", description: "Table display, QR codes, business cards, bundle offers, and email capture cards", abbyTip: "A one-page sell sheet with testimonials and a QR code to purchase is essential." },
    { id: "logistics", label: "Logistics", description: "Inventory tracker, shipping calculator, packing checklist, and post-event follow-up", abbyTip: "Track which events convert best so you can prioritize future appearances." },
    { id: "preview", label: "Preview & Publish", description: "Review all materials and revenue projection", abbyTip: "At a 200-person event with 40% conversion, you'd sell 80 books — plus capture emails for your funnel." },
  ],
};

const onlineCourseBuilder: BuilderNodeConfig = {
  id: "online-course",
  label: "Online Course",
  category: "bridge",
  requiredTier: "build",
  dbTable: "courses",
  icon: "PlayCircle",
  color: "text-violet-500",
  customRenderer: "course",
  abbyGreeting: "Let's build a self-paced online course your readers can take on their own schedule. I'll structure your book's content into engaging modules with video lessons, exercises, and quizzes.",
  abbyPublishMessage: "Your online course is ready! Students can enroll and learn at their own pace. Next: consider upgrading to a facilitated Training Program for premium pricing.",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying key teaching points and frameworks",
    "Structuring modules from your chapters",
    "Designing lesson flow and exercises",
    "Creating quiz questions for each module",
    "Building your course outline",
    "Preparing your Course Proposal",
  ],
  steps: [
    { id: "foundation", label: "Course Setup", description: "Title, description, target student, pricing, and module structure", abbyTip: "Self-paced courses work best at $97-$297. I'll analyze your book and recommend the ideal structure and price point." },
    { id: "curriculum", label: "Modules & Lessons", description: "Organize chapters into modules with video lessons and exercises", abbyTip: "Group 2-3 related chapters per module. Each lesson should deliver one clear skill or concept." },
    { id: "content", label: "Lesson Content", description: "Abby generates scripts, exercises, and quizzes for each module", abbyTip: "Strong lessons follow the Teach → Show → Do → Review pattern. Include a quiz after each module." },
    { id: "sales-page", label: "Sales Page", description: "Abby generates a complete sales page for your course", abbyTip: "Lead with the transformation. 'You will...' beats 'This course includes...'" },
    { id: "email-sequence", label: "Email Sequence", description: "Abby generates a launch and nurture email sequence", abbyTip: "A well-crafted launch sequence can double your enrollment rate." },
    { id: "preview", label: "Preview & Publish", description: "Preview the student experience and publish", abbyTip: "Consider offering an early-bird discount to your email list for the first 48 hours." },
  ],
};

const audiobookBuilder: BuilderNodeConfig = {
  id: "audiobook",
  label: "Audiobook Studio",
  category: "bridge",
  requiredTier: "build",
  dbTable: "audiobooks",
  icon: "Headphones",
  color: "text-violet-500",
  customRenderer: "audiobook",
  abbyGreeting: "Audiobooks are the fastest-growing format. Let's create a professional narration from your manuscript.",
  abbyPublishMessage: "Your audiobook is ready! Distribute it on your platform, Audible, or Google Play. Consider your Podcast next.",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying text that needs audio adaptation",
    "Converting visual references to verbal descriptions",
    "Optimizing tables and charts for spoken format",
    "Designing chapter production plan and voice notes",
    "Preparing your Audiobook Production Plan",
  ],
  steps: [
    { id: "setup", label: "Audiobook Setup", description: "Set title, narration style, distribution, and pricing", abbyTip: "Audiobooks generate passive income with zero ongoing effort. Author-narrated audiobooks convert 40% better for non-fiction." },
    { id: "optimize", label: "Manuscript Optimization", description: "AI creates an audio-optimized version of your text", abbyTip: "I found passages that reference visual elements. I've rewritten them for audio. Review each one — some may need your personal touch." },
    { id: "voice", label: "Voice Selection", description: "Choose AI voice, get recording tips, or find a narrator", abbyTip: "For self-help books, warm and conversational voices perform best. Listen to how each sounds with your Chapter 1 opening." },
    { id: "production", label: "Chapter Production", description: "Generate or upload audio chapter-by-chapter", abbyTip: "Generate chapters sequentially for consistent audio quality. Review each one before moving to the next." },
    { id: "publish", label: "Preview & Publish", description: "Full audiobook player preview and distribution", abbyTip: "Price audiobooks at $14.99-$24.99. They have excellent margins with zero shipping costs." },
  ],
};

const podcastBuilder: BuilderNodeConfig = {
  id: "podcast",
  label: "Podcast Scripts",
  category: "bridge",
  requiredTier: "build",
  dbTable: "podcasts",
  icon: "Mic",
  color: "text-violet-500",
  customRenderer: "podcast-scripts",
  abbyGreeting: "Podcasts build authority and audience like nothing else. Let's create production-ready scripts, show notes, and guest guides from your book.",
  abbyPublishMessage: "Your podcast scripts are ready! A consistent podcast builds authority faster than any other channel. Consider your Webinar next.",
  loadingMessages: [
    "Reading your manuscript",
    "Mapping chapters to episode topics",
    "Identifying key quotes and stories for each episode",
    "Designing your episode roadmap with CTAs",
    "Researching potential guests for interview episodes",
    "Preparing your Podcast Strategy",
  ],
  steps: [
    { id: "setup", label: "Podcast Setup", description: "Set name, tagline, format, episode length, and schedule", abbyTip: "Your book has multiple chapters — that's a perfect multi-episode season. I recommend 20-30 minute solo episodes for non-fiction. Launch with 3 episodes, then weekly." },
    { id: "roadmap", label: "Episode Roadmap", description: "AI generates an episode plan with titles, topics, and special episodes", abbyTip: "I'll map your chapters to episodes with a launch trailer, mid-season recap, and season finale with CTA." },
    { id: "script", label: "Script Generator", description: "Generate structured scripts with timestamps, quotes, and show notes", abbyTip: "Each script includes a cold open hook, highlighted book quotes, listener action items, and platform-specific CTAs." },
    { id: "guests", label: "Guest Interview Guides", description: "Research briefs, questions, and outreach templates", abbyTip: "AI suggests relevant guests based on your book topics with pre-interview research and 10-15 tailored questions." },
    { id: "publish", label: "Preview & Publish", description: "Read through scripts, export, and publish", abbyTip: "A consistent podcast builds authority faster than any other channel. After 20 episodes, most authors see a 200-400% increase in website traffic." },
  ],
};

const webinarBuilder: BuilderNodeConfig = {
  id: "webinar",
  label: "Webinar Builder",
  category: "bridge",
  requiredTier: "build",
  dbTable: "webinars",
  icon: "Video",
  color: "text-violet-500",
  customRenderer: "webinar",
  abbyGreeting: "Webinars are the #1 conversion tool for authors. Let's create a complete webinar package from your book.",
  abbyPublishMessage: "Your webinar package is ready! Schedule it and promote to your email list. Each webinar can generate $1K-$10K.",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying your strongest teachable frameworks",
    "Designing the Perfect Webinar structure",
    "Creating the offer stack and Value Ladder",
    "Writing registration page and follow-up emails",
    "Preparing your Webinar Package",
  ],
  steps: [
    { id: "configure", label: "Webinar Setup", description: "Set title, type, duration, format, and primary CTA", abbyTip: "Free webinars are the #1 lead generation tool for authors. I recommend a 60-minute format: 40 minutes of value, 15 minutes of pitch, 5 minutes of Q&A." },
    { id: "script", label: "Script Generator", description: "AI generates a structured webinar script with time markers", abbyTip: "I'll create a script with Hook → Story → Content → Transition → Offer → Close structure with engagement prompts throughout." },
    { id: "slides", label: "Slide Deck", description: "Generate slides matching your script sections", abbyTip: "Aim for 30-40 slides. One key point per slide. Use your book quotes as visual breaks." },
    { id: "registration", label: "Registration & Follow-up", description: "Build registration page and email sequences", abbyTip: "Include 3 bullet points of what they'll learn. Reminder + follow-up sequences boost attendance by 40%." },
    { id: "preview", label: "Preview & Publish", description: "Preview everything and publish your webinar package", abbyTip: "Tuesdays and Wednesdays at 12pm or 7pm get the highest attendance rates." },
  ],
};

const membershipBuilder: BuilderNodeConfig = {
  id: "membership",
  label: "Monthly Membership",
  category: "bridge",
  requiredTier: "build",
  dbTable: "courses",
  icon: "CreditCard",
  color: "text-violet-500",
  customRenderer: "membership",
  abbyGreeting: "Recurring revenue through memberships is the holy grail. Let's design a membership program your readers will love.",
  abbyPublishMessage: "Your membership program is designed! Connect payment processing and start enrolling founding members.",
  loadingMessages: [
    "Reading your manuscript",
    "Analyzing your reader community potential",
    "Designing membership tiers and benefits",
    "Creating a 3-month content calendar per tier",
    "Writing onboarding and retention sequences",
    "Preparing your Membership Program Proposal",
  ],
  steps: [
    { id: "setup", label: "Membership Setup", description: "Set name, tagline, and number of tiers", abbyTip: "3 tiers is the sweet spot. Your Reader Circle (free/low-cost) builds the community, Pro ($27-$47/mo) delivers ongoing value, and VIP ($97-$197/mo) gives access to you personally." },
    { id: "tiers", label: "Tier Builder", description: "Configure tier names, pricing, and benefits", abbyTip: "Make the middle tier the obvious choice by giving it 80% of the VIP value at 40% of the price. This is the decoy pricing strategy." },
    { id: "content-calendar", label: "Content Calendar", description: "AI generates a 3-month content calendar per tier", abbyTip: "Members stay for consistency — aim for 2 live sessions + 4 content drops per month. Recurring content builds habits." },
    { id: "sales-onboarding", label: "Sales & Onboarding", description: "Sales page, welcome emails, onboarding checklist, and cancellation prevention", abbyTip: "A strong sales page + onboarding flow reduces churn by 40%. Welcome sequences per tier are essential." },
    { id: "publish", label: "Preview & Publish", description: "Preview the membership experience and publish", abbyTip: "Launch with a founding member discount (50% off first 3 months) to build critical mass." },
  ],
};

const websiteBuilder: BuilderNodeConfig = {
  id: "website",
  label: "Website / Microsite",
  category: "build",
  requiredTier: "brand",
  dbTable: "generated_assets",
  icon: "Globe",
  color: "text-emerald-500",
  customRenderer: "website",
  abbyGreeting: "Your microsite is the hub that connects all your products. Let's build a beautiful, conversion-optimized author website.",
  abbyPublishMessage: "Your website is live! Share the URL everywhere — social profiles, email signature, book bio. Next: drive traffic with Social Media.",
  loadingMessages: [
    "Reading your manuscript",
    "Analyzing your author brand and positioning",
    "Designing site structure and page hierarchy",
    "Auto-populating product catalog from existing products",
    "Generating SEO-optimized page content",
    "Preparing your Website Blueprint",
  ],
  steps: [
    { id: "setup", label: "Site Setup", description: "Choose site type, template, colors, and fonts", abbyTip: "Your microsite is the hub that connects all your products. I recommend starting with a landing page that captures emails, then expanding to a full site as you add products." },
    { id: "pages", label: "Page Builder", description: "AI generates pages from your book and business plan", abbyTip: "I'll create pages with pre-built sections: Hero, About, Products, Testimonials, and Email Capture. Drag and drop to reorder." },
    { id: "products", label: "Product Integration", description: "Auto-populate product cards from all built products", abbyTip: "Products are organized by ABBY category. Each card shows image, title, price, and a buy/enroll button." },
    { id: "seo", label: "SEO & Analytics", description: "AI-generated meta titles, descriptions, and tracking", abbyTip: "Good SEO means your site shows up when readers search for topics in your book. Meta titles under 60 characters perform best." },
    { id: "publish", label: "Preview & Publish", description: "Full site preview and publish", abbyTip: "Check your site on desktop, tablet, and mobile. Make sure email capture is above the fold on every page." },
  ],
};

const leadMagnetBuilder: BuilderNodeConfig = {
  id: "lead-magnet",
  label: "Lead Magnet Builder",
  category: "build",
  requiredTier: "brand",
  dbTable: "generated_assets",
  icon: "Magnet",
  color: "text-emerald-500",
  customRenderer: "lead-magnet",
  abbyGreeting: "A compelling lead magnet is the foundation of your email list. Let's create one that converts visitors into subscribers.",
  abbyPublishMessage: "Your lead magnet is ready! Add it to your microsite and start building your email list.",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying your most actionable advice",
    "Designing a high-value free resource",
    "Creating opt-in page copy",
    "Preparing your Lead Magnet",
  ],
  steps: [
    { id: "configure", label: "Configure", description: "Choose type and target audience", abbyTip: "Checklists and cheat sheets convert best. They promise a quick win with minimal effort." },
    { id: "generate", label: "Let Abby Build", description: "Generate lead magnet content", abbyTip: "I'll pull your book's most actionable advice into a compact, high-value format." },
    { id: "edit", label: "Edit Content", description: "Customize and polish content", abbyTip: "Include your photo and a short bio. It builds trust and leads to book sales." },
    { id: "design", label: "Design", description: "Choose template and branding", abbyTip: "Professional design increases perceived value. Use your book's color palette." },
    { id: "preview", label: "Preview & Publish", description: "Review and add to your microsite", abbyTip: "Place the opt-in form above the fold on your microsite for maximum conversions." },
  ],
};

// ─── B·BUILD CHANNELS (9 nodes) ──────────────────────────────────────────────

const coachingBuilder: BuilderNodeConfig = {
  id: "coaching-1on1",
  label: "1-on-1 Coaching",
  category: "bridge",
  requiredTier: "build",
  dbTable: "coaching_packages",
  icon: "UserCheck",
  color: "text-violet-500",
  customRenderer: "coaching",
  abbyGreeting: "1-on-1 coaching is your highest-value offer. Let's design a complete coaching package — session structure, client materials, pricing, and booking system.",
  abbyPublishMessage: "Your coaching packages are live! Share them on your microsite and start booking discovery calls.",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying coachable frameworks and methodologies",
    "Designing session-by-session program structure",
    "Creating client intake and onboarding materials",
    "Analyzing premium pricing for your niche",
    "Preparing your Coaching Program Proposal",
  ],
  steps: [
    { id: "packages", label: "Package Setup", description: "Set package name, structure, duration, pricing, and delivery method", abbyTip: "Your book's transformation maps perfectly to a 12-week coaching program. I recommend packaging it at $1,997–$2,997 — that's the sweet spot for author-coaches in your genre." },
    { id: "intake", label: "Session Framework", description: "AI generates a session-by-session framework mapped to your book chapters", abbyTip: "Each session maps to a chapter in your book with objectives, discussion questions, exercises, and homework." },
    { id: "curriculum", label: "Client Materials", description: "Generate intake form, welcome packet, session notes, progress tracker, agreement, and certificate", abbyTip: "Professional client materials set the tone for your coaching relationship. I'll generate all 6 documents customized to your book's methodology." },
    { id: "sales-page", label: "Booking & Sales", description: "Booking page, discovery call script, sales page, application form, and follow-up emails", abbyTip: "A free 15-minute discovery call qualifies leads and builds trust. High-ticket packages should require an application form." },
    { id: "preview", label: "Preview & Publish", description: "Preview booking page, sales page, and publish your coaching package", abbyTip: "Start with 3-5 clients max. Refine your process before scaling. At your price point, even 2 clients/month generates significant revenue." },
  ],
};

const groupCoachingBuilder: BuilderNodeConfig = {
  id: "group-coaching",
  label: "Group Coaching",
  category: "bridge",
  requiredTier: "build",
  dbTable: "coaching_packages",
  icon: "Users",
  color: "text-violet-500",
  customRenderer: "group-coaching",
  abbyGreeting: "Group coaching is your highest-leverage coaching product. At $497 per person with 20 participants, that's $9,940 per cohort — and you only run it once.",
  abbyPublishMessage: "Your group coaching program is designed! Start promoting to your email list for the next cohort.",
  loadingMessages: [
    "Reading your manuscript",
    "Designing cohort structure and group dynamics",
    "Creating week-by-week curriculum from your book",
    "Building community engagement prompts and exercises",
    "Designing enrollment and facilitation guides",
    "Preparing your Group Coaching Program",
  ],
  steps: [
    { id: "setup", label: "Group Program Setup", description: "Set program name, cohort size, duration, frequency, format, and pricing", abbyTip: "Group coaching is your highest-leverage coaching product. At $497 per person with 20 participants, that's $9,940 per cohort — and you only run it once." },
    { id: "curriculum", label: "Curriculum Builder", description: "AI generates week-by-week curriculum with themes, exercises, and accountability", abbyTip: "I'll create weekly themes from your book with group exercises, community prompts, and accountability partner pairing." },
    { id: "materials", label: "Group Materials", description: "Welcome guide, community guidelines, worksheets, facilitation guide, and graduation materials", abbyTip: "Pre-work before each session increases engagement. Keep it to 15 minutes max." },
    { id: "sales", label: "Sales & Enrollment", description: "Cohort enrollment page, application form, sales page, and email sequence", abbyTip: "Include a countdown timer and limited spots messaging. Scarcity drives enrollment." },
    { id: "preview", label: "Preview & Publish", description: "Preview enrollment page, curriculum, and revenue calculator", abbyTip: "Run a free workshop first to warm up your audience, then pitch the paid program at the end." },
  ],
};

const speakingBuilder: BuilderNodeConfig = {
  id: "speaking",
  label: "Keynotes",
  category: "bridge",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Presentation",
  color: "text-violet-500",
  customRenderer: "keynotes",
  abbyGreeting: "Your book naturally supports 3 keynote topics. I recommend starting with the broadest topic for maximum booking potential, then adding niche topics as you build your speaking reputation.",
  abbyPublishMessage: "Your speaking materials are live! Submit to speaker bureaus and start pitching to conferences.",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying your 3 strongest keynote topics",
    "Designing signature talk outlines with stories and frameworks",
    "Creating speaker positioning and bio versions",
    "Building speaker one-sheet and booking materials",
    "Preparing your Keynote Speaker Package",
  ],
  steps: [
    { id: "setup", label: "Keynote Setup", description: "Set number of keynote topics, titles, durations, audiences, and speaker fee range", abbyTip: "Your book naturally supports 3 keynote topics. I recommend starting with the broadest topic for maximum booking potential." },
    { id: "talks", label: "Talk Builder", description: "AI generates talk outlines with time markers, hooks, key points, and interactive elements", abbyTip: "Great talks follow: Opening Hook → 3-5 Key Points with Stories → Interactive Element → Closing CTA. I've structured yours this way." },
    { id: "materials", label: "Speaker Materials", description: "Speaker one-sheet, bio versions, intro script, tech requirements, and travel rider", abbyTip: "A professional speaker one-sheet is your calling card. Include your photo, topics, testimonials, and contact info." },
    { id: "booking", label: "Booking System", description: "Speaker inquiry form, response emails, confirmation template, pre-event questionnaire", abbyTip: "A free 15-minute discovery call qualifies event organizers and builds trust. Follow up with a testimonial request after every gig." },
    { id: "preview", label: "Preview & Publish", description: "Preview speaker one-sheet, profile page, and revenue projection", abbyTip: "Speaking is the highest-ROI activity for authors. One $5,000 keynote often leads to $10,000+ in back-of-room book sales and coaching inquiries." },
  ],
};

const corporateTrainingBuilder: BuilderNodeConfig = {
  id: "corporate-training",
  label: "In-House Speaker",
  category: "bridge",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Building2",
  color: "text-violet-500",
  customRenderer: "in-house-speaker",
  abbyGreeting: "Corporate workshops are your highest per-hour revenue. A full-day workshop at $10,000 often leads to repeat bookings and training program contracts.",
  abbyPublishMessage: "Your corporate training program is ready! Create proposals for 3-5 target companies this month.",
  loadingMessages: [
    "Reading your manuscript",
    "Analyzing how your content solves corporate problems",
    "Identifying target industry verticals",
    "Designing corporate programs (Lunch & Learn, Half-Day, Full-Day)",
    "Creating corporate proposal and ROI calculator",
    "Preparing your Corporate Speaking Package",
  ],
  steps: [
    { id: "setup", label: "Corporate Package Setup", description: "Set package types, topics, target organizations, and pricing", abbyTip: "Corporate workshops are your highest per-hour revenue. A full-day workshop at $10,000 often leads to repeat bookings and training program contracts." },
    { id: "workshop", label: "Workshop Builder", description: "AI generates detailed agendas, participant workbooks, facilitator guides, and exercises", abbyTip: "Include interactive exercises, case studies, and takeaway materials. Corporate buyers value engagement." },
    { id: "proposal", label: "Corporate Proposal", description: "Proposal template, case study, ROI calculator, and follow-up program options", abbyTip: "Quantify ROI. 'Teams that complete this training show 30% improvement in X metric.'" },
    { id: "preview", label: "Preview & Publish", description: "Preview all materials and finalize", abbyTip: "Start by offering a free lunch-and-learn to build relationships with HR decision makers." },
  ],
};

const affiliateBuilder: BuilderNodeConfig = {
  id: "affiliate",
  label: "Affiliate Program",
  category: "bridge",
  requiredTier: "build",
  dbTable: "generated_assets",
  icon: "Link",
  color: "text-violet-500",
  customRenderer: "affiliates",
  abbyGreeting: "Affiliates are your unpaid sales team. I recommend 30-40% commission on digital products — it's generous enough to motivate promotion and you still profit.",
  abbyPublishMessage: "Your affiliate program is designed! Start recruiting your first 10 affiliates from your email list.",
  loadingMessages: [
    "Analyzing your product registry",
    "Designing commission structure per product tier",
    "Creating affiliate swipe copy and email templates",
    "Building social media templates for affiliates",
    "Designing affiliate recruitment strategy",
    "Preparing your Affiliate Program",
  ],
  steps: [
    { id: "setup", label: "Affiliate Program Setup", description: "Set program name, products, commission structure, cookie duration, payout schedule", abbyTip: "Affiliates are your unpaid sales team. I recommend 30-40% commission on digital products — it's generous enough to motivate promotion and you still profit." },
    { id: "materials", label: "Affiliate Materials", description: "Signup page, email swipe copy, social posts, banners, review templates", abbyTip: "Provide ready-to-use email templates, social posts, and banner ads for your affiliates." },
    { id: "dashboard", label: "Affiliate Dashboard", description: "Dashboard mockup, leaderboard, commission tracking, and payout history", abbyTip: "Use unique coupon codes per affiliate for easy tracking and attribution." },
    { id: "preview", label: "Preview & Publish", description: "Preview signup page, dashboard, and revenue projection", abbyTip: "10 active affiliates each making 5 sales per month at $197 = $9,850/month in additional revenue." },
  ],
};

const partnershipBuilder: BuilderNodeConfig = {
  id: "partnerships",
  label: "Revenue Sharing / JV",
  category: "bridge",
  requiredTier: "build",
  dbTable: "generated_assets",
  icon: "Handshake",
  color: "text-violet-500",
  customRenderer: "jv-partnerships",
  abbyGreeting: "JV partnerships are the fastest way to reach new audiences. I recommend starting with cross-promotions (free) before moving to revenue shares.",
  abbyPublishMessage: "Your partnership playbook is ready! Reach out to your top 5 potential partners this week.",
  loadingMessages: [
    "Analyzing your product ecosystem",
    "Identifying ideal partner profiles and audience overlap",
    "Designing JV models (affiliate, co-created, bundle, licensing)",
    "Creating partner outreach email templates",
    "Building partnership proposal and agreement templates",
    "Preparing your JV Partnership Strategy",
  ],
  steps: [
    { id: "setup", label: "Partnership Setup", description: "Set partnership type, revenue split, partner criteria, and products available", abbyTip: "JV partnerships are the fastest way to reach new audiences. I recommend starting with cross-promotions (free) before moving to revenue shares." },
    { id: "materials", label: "Partner Materials", description: "Proposal template, revenue sharing agreement, co-promotion swipe copy, and social templates", abbyTip: "Lead with what you can offer them. Always propose a specific, low-risk first collaboration." },
    { id: "onboarding", label: "Partner Onboarding", description: "Welcome sequence, resource page, reporting template, and communication cadence", abbyTip: "Transparent tracking builds trust. Share dashboards with partners monthly." },
    { id: "preview", label: "Preview & Publish", description: "Preview partner proposal, resource page, and revenue projection", abbyTip: "A single JV partner with a 10,000-person email list could generate significant sales with the right conversion rate." },
  ],
};

const upsellBuilder: BuilderNodeConfig = {
  id: "upsell-downsell",
  label: "Upsells / Downsells",
  category: "bridge",
  requiredTier: "build",
  dbTable: "generated_assets",
  icon: "ArrowUpDown",
  color: "text-violet-500",
  customRenderer: "upsell",
  abbyGreeting: "Upsells and downsells are the easiest way to increase revenue without more traffic. Let's build conversion sequences for your checkout flow.",
  abbyPublishMessage: "Your upsell funnel is live! Every purchase now has a chance to generate additional revenue automatically.",
  loadingMessages: [
    "Analyzing your existing product registry",
    "Mapping your Value Ladder and conversion paths",
    "Designing order bumps, upsells, and downsells per product",
    "Calculating revenue per customer projections",
    "Creating funnel page copy and email follow-ups",
    "Preparing your Funnel Strategy",
  ],
  steps: [
    { id: "setup", label: "Funnel Setup", description: "Select primary product and funnel type", abbyTip: "Your workbook buyers are the perfect audience for an upsell to the Online Course. I recommend a 'Special offer: Get the full course for 40% off — only available now' upsell." },
    { id: "offer", label: "Offer Builder", description: "AI generates the upsell/downsell offer with pricing and urgency", abbyTip: "The best upsells feel like a natural extension of what was just purchased. Connect your primary product to a logical next step." },
    { id: "design", label: "Page Design", description: "Design upsell, downsell, and order bump pages", abbyTip: "One CTA, clear pricing, and urgency. Remove all navigation — the only choices should be 'Yes' or 'No thanks.'" },
    { id: "publish", label: "Preview & Publish", description: "Walk through the funnel and publish", abbyTip: "Based on a 15-25% upsell conversion rate, this could add significant monthly revenue with zero additional traffic." },
  ],
};

const licensingBuilder: BuilderNodeConfig = {
  id: "licensing",
  label: "Content Licensing",
  category: "bridge",
  requiredTier: "build",
  dbTable: "generated_assets",
  icon: "FileKey",
  color: "text-violet-500",
  customRenderer: "licensing",
  abbyGreeting: "Licensing your content creates passive income from work you've already done. Let's structure your licensing offerings.",
  abbyPublishMessage: "Your licensing packages are ready! Start approaching organizations in your niche.",
  loadingMessages: [
    "Cataloging your licensable content",
    "Designing licensing tiers and pricing",
    "Creating license agreement templates",
    "Building sales materials for licensing",
    "Preparing your Licensing Strategy",
  ],
  steps: [
    { id: "inventory", label: "Content Inventory", description: "Catalog licensable content", abbyTip: "Your frameworks, assessments, and training materials are your most licensable assets." },
    { id: "packages", label: "License Packages", description: "Create licensing tiers", abbyTip: "Offer Individual ($297/yr), Team ($997/yr), and Enterprise ($4,997/yr) licenses." },
    { id: "terms", label: "License Terms", description: "Define usage rights and restrictions", abbyTip: "Be clear on what licensees can and cannot do. Include attribution requirements." },
    { id: "sales", label: "Sales Materials", description: "Create licensing sales page", abbyTip: "Position licensing as a way to save the buyer time and money vs. creating from scratch." },
    { id: "preview", label: "Preview & Publish", description: "Review and make available", abbyTip: "Approach industry associations and training companies first — they're natural licensees." },
  ],
};

const communityBuilder: BuilderNodeConfig = {
  id: "community",
  label: "Community Hub",
  category: "bridge",
  requiredTier: "build",
  dbTable: "generated_assets",
  icon: "MessageCircle",
  color: "text-violet-500",
  customRenderer: "community",
  abbyGreeting: "A community turns readers into lifelong advocates. Let's design an engaging community experience.",
  abbyPublishMessage: "Your community blueprint is ready! Launch on Circle, Discord, or Facebook Groups.",
  loadingMessages: [
    "Analyzing your reader community potential",
    "Designing channels and categories",
    "Creating engagement and content calendar",
    "Building community guidelines",
    "Preparing your Community Blueprint",
  ],
  steps: [
    { id: "configure", label: "Configure", description: "Set community type and platform", abbyTip: "Circle or Discord for premium communities. Facebook Groups for free communities." },
    { id: "structure", label: "Community Structure", description: "Design channels and categories", abbyTip: "Keep it simple: General, Wins, Q&A, Resources, and one topic-specific channel." },
    { id: "content-plan", label: "Engagement Plan", description: "Create content and engagement calendar", abbyTip: "Weekly: 1 live session, 1 challenge, 1 resource share, 1 celebration thread." },
    { id: "guidelines", label: "Guidelines", description: "Create community guidelines", abbyTip: "Clear rules create safe spaces. Include expectations for tone, self-promotion, and conflicts." },
    { id: "preview", label: "Preview & Launch", description: "Review and launch community", abbyTip: "Invite your top 20 most engaged email subscribers as founding members." },
  ],
};

// ─── Y·YIELD (8+ nodes) ──────────────────────────────────────────────

const retreatBuilder: BuilderNodeConfig = {
  id: "retreat",
  label: "Retreats & Bootcamps",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Mountain",
  color: "text-amber-500",
  customRenderer: "retreats",
  abbyGreeting: "Retreats are your highest per-person revenue product. A 3-day retreat at $2,997 with 20 participants is $59,940 — minus venue costs, you could net $30,000-$40,000.",
  abbyPublishMessage: "Your retreat program is designed! Start scouting venues and promoting to your VIP list.",
  loadingMessages: [
    "Reading your manuscript",
    "Designing transformational retreat experience",
    "Creating day-by-day, hour-by-hour agenda",
    "Building pricing tiers and logistics checklist",
    "Designing 12-week marketing countdown",
    "Preparing your Retreat Program",
  ],
  steps: [
    { id: "setup", label: "Event Setup", description: "Set event type, name, capacity, pricing, and location type", abbyTip: "Retreats are your highest per-person revenue product. A 3-day retreat at $2,997 with 20 participants is $59,940." },
    { id: "itinerary", label: "Itinerary Builder", description: "AI generates day-by-day schedule with sessions, activities, and ceremonies", abbyTip: "I'll create a transformative arc: Day 1 = Awareness, Day 2 = Action, Day 3 = Accountability." },
    { id: "marketing", label: "Marketing Materials", description: "Sales page, brochure, email sequence, social posts, and pricing strategy", abbyTip: "Sell the transformation, not the schedule. 'Leave with a complete business plan' > 'Day 1: Introduction.'" },
    { id: "logistics", label: "Logistics Planning", description: "Venue requirements, equipment, welcome packet, travel info, and waivers", abbyTip: "All-inclusive pricing simplifies the decision for attendees and increases perceived value." },
    { id: "preview", label: "Preview & Publish", description: "Preview sales page, itinerary, and break-even analysis", abbyTip: "Offer a $500 early-bird discount and a payment plan option to maximize enrollment." },
  ],
};

const certificationBuilder: BuilderNodeConfig = {
  id: "certification",
  label: "Certification Program",
  category: "yield",
  requiredTier: "yield",
  dbTable: "courses",
  icon: "Award",
  color: "text-amber-500",
  customRenderer: "certification",
  abbyGreeting: "Certification is the ultimate authority builder. Certified practitioners become your ambassadors AND a recurring revenue stream through renewal fees.",
  abbyPublishMessage: "Your certification program is designed! This is a premium offering that builds your legacy.",
  loadingMessages: [
    "Reading your manuscript",
    "Identifying certifiable methodologies and frameworks",
    "Designing 3-level certification structure",
    "Creating assessment systems and rubrics",
    "Building certified practitioner ecosystem",
    "Preparing your Certification Program",
  ],
  steps: [
    { id: "setup", label: "Certification Setup", description: "Set name, levels, duration, delivery, pricing, and renewal terms", abbyTip: "Certification is the ultimate authority builder. Certified practitioners become your ambassadors AND a recurring revenue stream." },
    { id: "curriculum", label: "Curriculum Builder", description: "AI generates module-by-module breakdown with theory, practice, and assessments", abbyTip: "8-12 modules with assessments at each stage. Include a capstone project for credibility." },
    { id: "assessment", label: "Assessment & Licensing", description: "Knowledge exams, practical rubrics, case studies, agreement, and renewal requirements", abbyTip: "Mix knowledge tests (60%) with practical application (40%). Include peer review components." },
    { id: "directory", label: "Certified Directory", description: "Practitioner profile template, public directory, badge, and referral system", abbyTip: "Professional certificates increase perceived value. Include verifiable digital badges." },
    { id: "preview", label: "Preview & Publish", description: "Preview sales page, curriculum, and revenue projection", abbyTip: "10 certified practitioners at $5,000 each = $50,000. Plus $500/year renewal fees = $5,000/year recurring." },
  ],
};

const mastermindBuilder: BuilderNodeConfig = {
  id: "mastermind",
  label: "Mastermind Groups",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Brain",
  color: "text-amber-500",
  customRenderer: "masterminds",
  abbyGreeting: "Masterminds are your highest-value recurring product. 8 members at $10,000/year = $80,000 — and the community creates its own retention.",
  abbyPublishMessage: "Your mastermind program is designed! Start with an application process to curate the right group.",
  loadingMessages: [
    "Reading your manuscript",
    "Designing exclusive mastermind experience",
    "Creating monthly meeting structure and hot seat format",
    "Building application and selection process",
    "Designing retention and renewal strategy",
    "Preparing your Mastermind Program",
  ],
  steps: [
    { id: "setup", label: "Mastermind Setup", description: "Set name, group size, duration, frequency, format, and pricing", abbyTip: "Masterminds are your highest-value recurring product. 8 members at $10,000/year = $80,000 — and the community creates its own retention." },
    { id: "structure", label: "Structure & Framework", description: "Meeting agenda template, intake, onboarding, quarterly planning, and retreat component", abbyTip: "Monthly 2-hour meetings: Hot seats (30min each), guest expert (30min), accountability check." },
    { id: "application", label: "Application & Sales", description: "Application form, sales page, interview script, and payment setup", abbyTip: "An application process increases perceived value and ensures group quality." },
    { id: "preview", label: "Preview & Publish", description: "Preview application page, member experience, and revenue projection", abbyTip: "Interview every applicant. Group chemistry is the #1 factor in mastermind success." },
  ],
};

const bigTicketBuilder: BuilderNodeConfig = {
  id: "big-ticket",
  label: "Big Ticket Consulting",
  category: "yield",
  requiredTier: "yield",
  dbTable: "coaching_packages",
  icon: "Gem",
  color: "text-amber-500",
  customRenderer: "big-ticket",
  abbyGreeting: "Big ticket offers are where your expertise commands premium pricing. A VIP Day at $5,000 with 2 clients per month is $10,000/month — and it positions you as the expert.",
  abbyPublishMessage: "Your consulting packages are designed! Start with a free strategy session funnel to attract qualified leads.",
  loadingMessages: [
    "Reading your manuscript",
    "Designing high-ticket consulting packages",
    "Creating proposal system and ROI calculator",
    "Building discovery questionnaire and intake process",
    "Designing delivery frameworks from your book",
    "Preparing your Consulting Practice Blueprint",
  ],
  steps: [
    { id: "setup", label: "Offer Setup", description: "Set offer type, name, target client, deliverables, and pricing", abbyTip: "Big ticket offers are where your expertise commands premium pricing. A VIP Day at $5,000 with 2 clients per month is $10,000/month." },
    { id: "package", label: "Package Builder", description: "AI generates pre-engagement, during, and post-engagement materials", abbyTip: "Include a kickoff session, regular check-ins, async support, and a final review." },
    { id: "proposal", label: "Proposal & Sales", description: "Proposal template, application page, sales page, discovery call script, and follow-up sequence", abbyTip: "Focus on ROI. 'Clients typically see a 10x return on their investment within 6 months.'" },
    { id: "preview", label: "Preview & Publish", description: "Preview all materials and revenue projection", abbyTip: "Start by converting your best coaching clients. They already trust your expertise." },
  ],
};

const specialEditionsBuilder: BuilderNodeConfig = {
  id: "special-editions",
  label: "Special Editions",
  category: "yield",
  requiredTier: "build",
  dbTable: "generated_assets",
  icon: "BookHeart",
  color: "text-amber-500",
  customRenderer: "special-editions",
  abbyGreeting: "Special editions create urgency and premium positioning. Choose an edition type, then theme it to an occasion like Valentine's Day or Christmas for gift-ready packaging with bonus content and targeted marketing.",
  abbyPublishMessage: "Your special edition is designed! Launch it to your email list for maximum impact.",
  loadingMessages: [
    "Reading your manuscript",
    "Designing special edition content and extras",
    "Creating bonus chapters and author's letter",
    "Building pre-order page and numbering system",
    "Designing launch email campaign",
    "Preparing your Special Edition",
  ],
  steps: [
    { id: "setup", label: "Edition Setup", description: "Set edition type, occasion theme, print run, pricing, and extras", abbyTip: "Special editions create urgency and premium positioning. A limited run of 100 signed copies at $49.99 sells out fast." },
    { id: "content", label: "Edition Content", description: "AI generates themed foreword, bonus chapter, reflection prompts, and companion resource", abbyTip: "New exclusive content makes the special edition feel truly special. An author's letter adds a personal touch." },
    { id: "sales", label: "Sales & Marketing", description: "Gift-buyer sales copy, bundles, marketing calendar, and fulfillment plan", abbyTip: "Gift-buyer copy shifts the CTA from 'Buy Now' to 'Give This Gift' — and converts at 2x the rate." },
    { id: "review", label: "Review & Edit", description: "7-tab editor: identity, bonus content, sales page, bundles, marketing, print specs, and preview", abbyTip: "Fine-tune every component. The tabbed editor lets you polish each piece before publishing." },
    { id: "preview", label: "Preview & Publish", description: "Final preview, revenue projection, and publish to your microsite", abbyTip: "Launch to your email list first for maximum conversion. Special editions reward your most loyal readers." },
  ],
};

const conventionsBuilder: BuilderNodeConfig = {
  id: "conventions",
  label: "Conventions & Conferences",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Landmark",
  color: "text-amber-500",
  customRenderer: "conventions",
  abbyGreeting: "Conferences are where you build your professional network. I recommend submitting speaker proposals to 5-10 conferences per year in your niche.",
  abbyPublishMessage: "Your conference materials are ready! Start submitting proposals and planning your conference strategy.",
  loadingMessages: [
    "Analyzing your niche conference landscape",
    "Designing speaker proposals and session descriptions",
    "Creating networking strategy and elevator pitches",
    "Building lead capture and follow-up system",
    "Preparing your Conference Strategy Kit",
  ],
  steps: [
    { id: "setup", label: "Conference Setup", description: "Set participation type, niche, goals, and budget", abbyTip: "Conferences are where you build your professional network. I recommend submitting speaker proposals to 5-10 conferences per year." },
    { id: "submissions", label: "Submission Materials", description: "Speaker proposal, session descriptions, exhibitor booth plan, and sponsorship proposal", abbyTip: "Strong speaker proposals focus on attendee takeaways, not your credentials. What will they learn?" },
    { id: "kit", label: "Conference Kit", description: "Networking strategy, elevator pitches, business cards, follow-up templates, and lead capture", abbyTip: "Prepare 30-second, 60-second, and 2-minute elevator pitches. Different situations need different lengths." },
    { id: "preview", label: "Preview & Publish", description: "Preview all materials and lead generation projection", abbyTip: "One conference typically generates 20-50 qualified leads. At a 10% conversion rate, that's 2-5 new clients." },
  ],
};

const fundraisingBuilder: BuilderNodeConfig = {
  id: "fundraising",
  label: "Fund Raising",
  category: "yield",
  requiredTier: "build",
  dbTable: "generated_assets",
  icon: "Heart",
  color: "text-amber-500",
  customRenderer: "fundraising",
  abbyGreeting: "Cause-aligned fundraising builds incredible goodwill and media coverage. Donating $1 per book sold to a relevant cause creates a compelling story.",
  abbyPublishMessage: "Your fundraising campaign is designed! Launch it and watch the community rally around your cause.",
  loadingMessages: [
    "Analyzing cause alignment with your book's message",
    "Designing donation tiers and reward structure",
    "Creating campaign page and press release",
    "Building email outreach and social campaign",
    "Preparing your Fundraising Campaign",
  ],
  steps: [
    { id: "setup", label: "Campaign Setup", description: "Set campaign type, cause alignment, fundraising goal, and duration", abbyTip: "Cause-aligned fundraising builds incredible goodwill and media coverage. Donating $1 per book sold creates a compelling story." },
    { id: "materials", label: "Campaign Materials", description: "Campaign page, donation tiers, press release, social posts, email sequence, and partner outreach", abbyTip: "Donation tiers with tangible rewards (signed book, coaching call, VIP access) dramatically increase average donation." },
    { id: "event", label: "Event Component", description: "Fundraising event plan, sponsorship packages, volunteer coordination, and thank-you materials", abbyTip: "A live fundraising event (even virtual) creates urgency and community. Pair it with your campaign for maximum impact." },
    { id: "preview", label: "Preview & Publish", description: "Preview campaign page and fundraising projection", abbyTip: "Fundraising campaigns with author involvement raise 3-5x more than standard campaigns." },
  ],
};

const exhibitorsBuilder: BuilderNodeConfig = {
  id: "exhibitors",
  label: "Exhibitors / JV",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Store",
  color: "text-amber-500",
  customRenderer: "exhibitors",
  abbyGreeting: "The best JV partnerships are where both parties bring something the other doesn't have. You bring expertise and content; they bring audience and distribution.",
  abbyPublishMessage: "Your exhibitor and JV materials are ready! Start reaching out to potential partners and event organizers.",
  loadingMessages: [
    "Analyzing your partnership potential",
    "Designing partnership proposals and co-marketing plans",
    "Creating booth design and lead capture system",
    "Building partnership agreement templates",
    "Preparing your Exhibitor & JV Kit",
  ],
  steps: [
    { id: "setup", label: "Partnership Setup", description: "Set partnership type, partner profile, what you bring, and what you want", abbyTip: "The best JV partnerships are where both parties bring something the other doesn't have." },
    { id: "materials", label: "Partnership Materials", description: "Partnership proposal, co-marketing plan, revenue sharing agreement, and co-branded templates", abbyTip: "Lead with what you can offer them. Always propose a specific, low-risk first collaboration." },
    { id: "kit", label: "Exhibitor Kit", description: "Booth design, product display, lead capture system, giveaway materials, and follow-up sequence", abbyTip: "A well-designed booth with clear messaging and a lead capture system maximizes your ROI at events." },
    { id: "preview", label: "Preview & Publish", description: "Preview all materials and partnership projection", abbyTip: "Start with one partnership, prove the model works, then scale to 5-10 active partnerships." },
  ],
};

const revenueShareBuilder: BuilderNodeConfig = {
  id: "revenue-share",
  label: "Revenue Sharing",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "TrendingUp",
  color: "text-amber-500",
  customRenderer: "revenue-share",
  abbyGreeting: "Revenue sharing aligns incentives and creates win-win partnerships. Let's structure your offers.",
  abbyPublishMessage: "Your revenue sharing framework is ready! Approach potential partners with a clear value proposition.",
  loadingMessages: [
    "Mapping revenue sharing opportunities",
    "Designing deal structures and splits",
    "Creating partnership agreements",
    "Building revenue tracking dashboards",
    "Preparing your Revenue Sharing Strategy",
  ],
  steps: [
    { id: "identify", label: "Opportunity Mapping", description: "Identify revenue share opportunities", abbyTip: "Look for partners with distribution but no content, or content but no audience." },
    { id: "structure", label: "Deal Structure", description: "Design revenue sharing models", abbyTip: "Standard splits: 60/40 (content creator/distributor) for digital, 70/30 for licensing." },
    { id: "agreements", label: "Agreement Templates", description: "Create partnership agreements", abbyTip: "Include performance benchmarks, reporting cadence, and clear termination clauses." },
    { id: "tracking", label: "Revenue Tracking", description: "Set up revenue tracking dashboards", abbyTip: "Transparent tracking builds trust. Share dashboards with partners monthly." },
    { id: "preview", label: "Review & Execute", description: "Finalize and start outreach", abbyTip: "Start with a small pilot project before committing to long-term revenue shares." },
  ],
};

const whitelabelBuilder: BuilderNodeConfig = {
  id: "white-label",
  label: "White-Label Products",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Layers",
  color: "text-amber-500",
  customRenderer: "white-label",
  abbyGreeting: "White-labeling your content lets others sell it under their brand — pure passive income for you.",
  abbyPublishMessage: "Your white-label packages are designed! Target coaching companies and training organizations.",
  loadingMessages: [
    "Inventorying your white-labelable products",
    "Designing customization options and branding",
    "Creating per-seat licensing tiers",
    "Building delivery packages and templates",
    "Preparing your White-Label Strategy",
  ],
  steps: [
    { id: "inventory", label: "Product Inventory", description: "Select products for white-labeling", abbyTip: "Workbooks, courses, and assessments are the easiest to white-label." },
    { id: "customize", label: "Customization Options", description: "Define what can be customized", abbyTip: "Allow branding changes but not content changes. Protect your methodology's integrity." },
    { id: "pricing", label: "License Pricing", description: "Set white-label pricing tiers", abbyTip: "Per-seat licensing ($50-$200/user) for courses, flat rate ($2K-$10K) for standalone products." },
    { id: "delivery", label: "Delivery System", description: "Create white-label package delivery", abbyTip: "Provide Canva templates, editable files, and a brand customization guide." },
    { id: "preview", label: "Preview & Launch", description: "Review and make available", abbyTip: "Approach companies that serve the same audience but in a different capacity." },
  ],
};

const eventsBuilder: BuilderNodeConfig = {
  id: "events",
  label: "Events & Summits",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Calendar",
  color: "text-amber-500",
  customRenderer: "events",
  abbyGreeting: "Hosting events positions you as a leader in your space. Let's plan a summit or conference.",
  abbyPublishMessage: "Your event blueprint is ready! Start with a virtual summit to test your concept before going live.",
  loadingMessages: [
    "Analyzing your event hosting potential",
    "Designing speaker lineup and session format",
    "Creating ticket tiers and sponsorship packages",
    "Building event marketing timeline",
    "Preparing your Event Blueprint",
  ],
  steps: [
    { id: "configure", label: "Configure", description: "Set event type, format, and dates", abbyTip: "Virtual summits are low-risk, high-reward. 3-5 days, 15-25 speakers, free with VIP pass upsell." },
    { id: "speakers", label: "Speaker Lineup", description: "Plan speaker outreach and content", abbyTip: "Each speaker promotes to their audience. 20 speakers × 5,000 each = 100,000 potential attendees." },
    { id: "content", label: "Event Content", description: "Design sessions and workshops", abbyTip: "Mix keynotes (30min), panels (45min), and workshops (60min) for variety." },
    { id: "monetization", label: "Monetization Plan", description: "Design ticket tiers and sponsorships", abbyTip: "Free access + VIP pass ($97-$197) + Sponsorships ($2K-$10K each). Multiple revenue streams." },
    { id: "preview", label: "Preview & Launch", description: "Review and start promotion", abbyTip: "Start promoting 8-12 weeks before the event. Speaker promotion begins 4 weeks out." },
  ],
};

const franchiseBuilder: BuilderNodeConfig = {
  id: "franchise",
  label: "Franchise Model",
  category: "yield",
  requiredTier: "yield",
  dbTable: "generated_assets",
  icon: "Network",
  color: "text-amber-500",
  customRenderer: "franchise",
  abbyGreeting: "A franchise model scales your methodology through trained practitioners. This is legacy-building territory.",
  abbyPublishMessage: "Your franchise blueprint is designed! This is a long-term play that builds your legacy and impact.",
  loadingMessages: [
    "Analyzing your methodology for franchisability",
    "Designing franchise/license model structure",
    "Creating practitioner training program",
    "Building operations manual and brand standards",
    "Designing financial model and royalty structure",
    "Preparing your Franchise Blueprint",
  ],
  steps: [
    { id: "model", label: "Franchise Model", description: "Design your franchise/license model", abbyTip: "Start with a 'licensed practitioner' model before full franchise. Lower barrier to entry." },
    { id: "training", label: "Practitioner Training", description: "Create facilitator training program", abbyTip: "Include initial certification (40hrs), ongoing development (quarterly), and quality standards." },
    { id: "operations", label: "Operations Manual", description: "Create franchise operations guide", abbyTip: "Document everything: branding, delivery, pricing, marketing, and customer service standards." },
    { id: "financials", label: "Financial Model", description: "Design pricing and revenue model", abbyTip: "License fee ($5K-$25K upfront) + ongoing royalties (10-15% of revenue) is standard." },
    { id: "preview", label: "Review & Plan", description: "Finalize franchise blueprint", abbyTip: "Pilot with 3-5 practitioners before scaling. Their feedback shapes the final model." },
  ],
};

// ─── NEW BUILDERS (from spec) ────────────────────────────────────────

const trainingProgramsBuilder: BuilderNodeConfig = {
  id: "training-programs",
  label: "Training Program",
  category: "yield",
  requiredTier: "yield",
  dbTable: "training_programs",
  icon: "GraduationCap",
  color: "text-amber-600",
  customRenderer: "training-program",
  abbyGreeting: "Let's design a premium facilitated training program grounded in Bloom's Taxonomy and Kolb's Learning Cycle — the gold standard for transformational learning. I'll analyze your book, your profile, and the market to craft a high-ticket workshop.",
  abbyPublishMessage: "Your training program is ready to launch! Participants will receive a workbook, course slides, framework mindmap, and trainer's manual. This is your premium offering at $497-$2,997.",
  loadingMessages: [
    "Reading your manuscript deeply",
    "Analyzing your author profile and credentials",
    "Researching market pricing and competitor workshops",
    "Identifying teachable frameworks and mental models",
    "Mapping chapters to Bloom's Taxonomy levels",
    "Designing experiential activities using Kolb's Learning Cycle",
    "Defining target audience and learning objectives",
    "Creating facilitator activities and debrief questions",
    "Building your 7-module workshop curriculum",
    "Designing workbook pages and course slides",
    "Generating trainer's manual with speaking notes",
    "Preparing your Training Program Proposal",
  ],
  steps: [
    { id: "foundation", label: "Program Identity", description: "Title, subtitle, format (2/3-day), target participant, transformation promises, pricing", abbyTip: "I'll analyze your book, author profile, and market comparables to recommend the target audience, price point ($497-$2,997), and transformation promises." },
    { id: "curriculum", label: "7-Module Curriculum", description: "Learning objectives, facilitator activities, and debrief questions for each module", abbyTip: "Each module is mapped to Bloom's Taxonomy and Kolb's Learning Cycle — with experiential activities, debrief questions, and a workbook page." },
    { id: "content", label: "Module Content", description: "Generate detailed content, speaking notes, and activity instructions", abbyTip: "Strong modules follow the Experience → Reflect → Conceptualize → Experiment pattern for maximum learning transfer." },
    { id: "materials", label: "Deliverables", description: "Course Workbook, Course Slides, Framework Mindmap, and Trainer's Manual", abbyTip: "Four deliverables dramatically increase perceived value: a workbook, slides, visual mindmap, and a trainer's manual with speaking notes." },
    { id: "schedule", label: "Workshop Schedule", description: "Day-by-day, hour-by-hour timeline with breaks and energy management", abbyTip: "Energy management is critical. Alternate between high-focus modules and interactive activities. Schedule breaks every 75 minutes." },
    { id: "sales-page", label: "Sales Page", description: "Abby generates a complete high-converting sales page", abbyTip: "Lead with the transformation, not features. Emphasize the live facilitated experience and hands-on activities." },
    { id: "email-sequence", label: "Email Sequence", description: "Generate a 7-email nurture and launch sequence", abbyTip: "A well-crafted launch sequence can double your enrollment rate. Subject lines under 50 characters get 12% higher open rates." },
    { id: "preview", label: "Preview & Publish", description: "Preview the participant experience and publish", abbyTip: "Consider offering an early-bird discount. Limited seats create urgency for premium workshops." },
  ],
};

// ─── Auto-assign 3-Act phases to all steps ─────────────────────────
function assignActPhases(node: BuilderNodeConfig): BuilderNodeConfig {
  const steps = node.steps.map((step, i) => {
    if (step.act) return step; // already assigned
    const total = node.steps.length;
    let act: 1 | 2 | 3;
    if (i === 0) {
      act = 1; // First step is always Act 1 (Analyse)
    } else if (i === total - 1) {
      act = 3; // Last step is always Act 3 (Build/Yield)
    } else {
      act = 2; // Middle steps are Act 2 (Brand)
    }
    return { ...step, act };
  });
  return { ...node, steps };
}

// ─── EXPORT ALL NODES ────────────────────────────────────────────────

export const ALL_BUILDER_NODES: BuilderNodeConfig[] = [
  // B·Build (7)
  workbookBuilder,
  socialMediaBuilder,
  emailMarketingBuilder,
  homeStudyCourseBuilder,
  bookSalesBuilder,
  leadMagnetBuilder,
  websiteBuilder,
  // B·Build Channels (14)
  onlineCourseBuilder,
  audiobookBuilder,
  podcastBuilder,
  webinarBuilder,
  membershipBuilder,
  coachingBuilder,
  groupCoachingBuilder,
  speakingBuilder,
  corporateTrainingBuilder,
  trainingProgramsBuilder,
  affiliateBuilder,
  partnershipBuilder,
  upsellBuilder,
  licensingBuilder,
  communityBuilder,
  // Y·Yield (8+5)
  retreatBuilder,
  certificationBuilder,
  mastermindBuilder,
  bigTicketBuilder,
  specialEditionsBuilder,
  conventionsBuilder,
  fundraisingBuilder,
  exhibitorsBuilder,
  revenueShareBuilder,
  whitelabelBuilder,
  eventsBuilder,
  franchiseBuilder,
].map(assignActPhases);

export const BUILDER_NODE_MAP: Record<string, BuilderNodeConfig> = {};
ALL_BUILDER_NODES.forEach((n) => {
  BUILDER_NODE_MAP[n.id] = n;
});

export const BUILD_NODES = ALL_BUILDER_NODES.filter((n) => n.category === "build");
export const BRIDGE_NODES = ALL_BUILDER_NODES.filter((n) => n.category === "bridge");
export const YIELD_NODES = ALL_BUILDER_NODES.filter((n) => n.category === "yield");
