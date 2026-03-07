import type { SubscriptionTier } from "@/hooks/useAuth";

export interface BuilderStep {
  id: string;
  label: string;
  description: string;
  abbyTip: string;
}

export interface BuilderNodeConfig {
  id: string;
  label: string;
  category: "build" | "bridge" | "yield";
  requiredTier: SubscriptionTier;
  dbTable: string; // The table this product writes to
  steps: BuilderStep[];
  abbyGreeting: string;
  abbyPublishMessage: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  customRenderer?: string; // Optional: use a custom step renderer instead of the generic placeholder
}

// ─── B·BUILD (11 nodes) ───────────────────────────────────────────────

const workbookBuilder: BuilderNodeConfig = {
  id: "workbook",
  label: "Workbook Builder",
  category: "build",
  requiredTier: "starter",
  dbTable: "workbooks",
  icon: "FileText",
  color: "text-emerald-500",
  customRenderer: "workbook",
  abbyGreeting: "Your business plan recommends this workbook as your first product — it's a quick win that builds your email list. Let's make it great.",
  abbyPublishMessage: "Great work! Your workbook is live. Next up in your plan: the Online Course. Want to start building it?",
  steps: [
    { id: "setup", label: "Workbook Setup", description: "Set title, purpose, pricing, and design template", abbyTip: "Your business plan positions this workbook as a free lead magnet. Free workbooks with a strong CTA on the last page convert 15-25% of readers to your email list." },
    { id: "mapping", label: "Chapter Mapping", description: "Map book chapters to workbook sections", abbyTip: "I've mapped your chapters into workbook sections. Chapters with practical advice get more exercises; reflective chapters get more journal prompts." },
    { id: "content", label: "Content Generator", description: "Generate exercises, prompts, and checklists per section", abbyTip: "Each element should connect back to a specific chapter concept. Mix content types for variety — reflection → exercise → checklist keeps engagement high." },
    { id: "design", label: "Design Preview", description: "Preview pages and switch design templates", abbyTip: "Clean, minimal designs with plenty of writing space perform best. Make sure your cover matches your book's visual identity." },
    { id: "publish", label: "Preview & Publish", description: "Final review, download PDF, and publish", abbyTip: "Double-check your call-to-action on the last page — it should lead to your online course or website." },
  ],
};

const socialMediaBuilder: BuilderNodeConfig = {
  id: "social-media",
  label: "Social Media Calendar",
  category: "build",
  requiredTier: "starter",
  dbTable: "social_media_content",
  icon: "Share2",
  color: "text-emerald-500",
  customRenderer: "social-media",
  abbyGreeting: "A consistent social media presence is key to building your author brand. Let's create a 90-day content calendar from your book.",
  abbyPublishMessage: "Your social media calendar is ready! Export it to Buffer or schedule manually. Consider building your Email Marketing next.",
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
  requiredTier: "starter",
  dbTable: "email_flows",
  icon: "Mail",
  color: "text-emerald-500",
  abbyGreeting: "Email is where the money is. Let's build an automated sequence that nurtures readers into customers.",
  abbyPublishMessage: "Your email sequence is ready! Connect it to your email provider to start automating. Next: build your Home Study Course.",
  steps: [
    { id: "configure", label: "Configure", description: "Set flow type, audience, and goals", abbyTip: "A welcome sequence of 5-7 emails converts 3x better than a single newsletter." },
    { id: "generate", label: "AI Generate", description: "Generate email sequence from your book", abbyTip: "I'll create emails that give value first, then naturally introduce your products." },
    { id: "edit", label: "Edit Emails", description: "Customize subject lines and content", abbyTip: "Subject lines under 50 characters get 12% higher open rates. Make them curiosity-driven." },
    { id: "schedule", label: "Timing & Triggers", description: "Set delays and automation triggers", abbyTip: "Space emails 2-3 days apart. Too frequent = unsubscribes, too sparse = forgotten." },
    { id: "preview", label: "Preview & Activate", description: "Test and launch your email flow", abbyTip: "Always send yourself a test email first. Check it looks good on mobile." },
  ],
};

const homeStudyCourseBuilder: BuilderNodeConfig = {
  id: "home-study-course",
  label: "Home Study Course",
  category: "build",
  requiredTier: "starter",
  dbTable: "home_study_courses",
  icon: "GraduationCap",
  color: "text-emerald-500",
  customRenderer: "home-study",
  abbyGreeting: "A self-paced course is perfect for readers who want to go deeper. Let's turn your book into a structured learning experience.",
  abbyPublishMessage: "Your home study course is ready! This is a great passive income product. Consider adding a Workbook companion next.",
  steps: [
    { id: "setup", label: "Program Setup", description: "Set title, duration, commitment, and pricing", abbyTip: "A 30-day program at 30 minutes/day has the highest completion rate for self-help books. I recommend this format for your audience." },
    { id: "schedule", label: "Daily Schedule", description: "AI generates a day-by-day plan from your manuscript", abbyTip: "I've grouped your days into weeks, each building on the last. Week 1 is awareness, Week 2 is skills, Week 3 is practice, Week 4 is mastery." },
    { id: "content", label: "Daily Content", description: "Generate readings, exercises, and reflections for each day", abbyTip: "Keep daily lessons to 15-20 minutes. Shorter is better for completion rates. Add reflection prompts to boost engagement." },
    { id: "materials", label: "Materials & Packaging", description: "PDF layout, progress tracker, certificate, and upsells", abbyTip: "Students who complete this program are perfect candidates for your Online Course. Include an upsell on the final page." },
    { id: "preview", label: "Preview & Publish", description: "Flip through the guide and publish", abbyTip: "Offer a 'Day 1 Preview' as a lead magnet to build your email list before launching." },
  ],
};

const bookSalesBuilder: BuilderNodeConfig = {
  id: "book-sales",
  label: "Book Sales (Events)",
  category: "build",
  requiredTier: "starter",
  dbTable: "books",
  icon: "ShoppingBag",
  color: "text-emerald-500",
  abbyGreeting: "Selling books at events can be highly profitable with the right setup. Let's create your event sales kit.",
  abbyPublishMessage: "Your event sales kit is ready! Print your materials and start booking speaking gigs. Consider your Speaking Profile next.",
  steps: [
    { id: "configure", label: "Configure", description: "Set event type and sales goals", abbyTip: "Back-of-room sales convert at 20-40% when tied to your talk content." },
    { id: "materials", label: "Sales Materials", description: "Generate sales sheets and QR codes", abbyTip: "A one-page sell sheet with testimonials and a QR code to purchase is essential." },
    { id: "bundles", label: "Bundle Offers", description: "Create book + product bundles", abbyTip: "Bundle your book + workbook at a slight discount — average order value jumps 60%." },
    { id: "tracking", label: "Order Tracking", description: "Set up inventory and order management", abbyTip: "Track which events convert best so you can prioritize future appearances." },
    { id: "preview", label: "Preview & Export", description: "Review materials and export", abbyTip: "Print test copies and practice your pitch. First impressions matter at events." },
  ],
};

const onlineCourseBuilder: BuilderNodeConfig = {
  id: "online-course",
  label: "Online Course Builder",
  category: "build",
  requiredTier: "pro",
  dbTable: "courses",
  icon: "PlayCircle",
  color: "text-emerald-500",
  customRenderer: "course",
  abbyGreeting: "Online courses are where authors build real recurring revenue. Let's transform your expertise into a structured learning experience.",
  abbyPublishMessage: "Your course is ready to launch! Connect it to Teachable or host it on your microsite. Next: consider your Audiobook.",
  steps: [
    { id: "foundation", label: "Course Foundation", description: "Set title, audience, pricing, and format", abbyTip: "Your business plan positions this as your flagship digital product. I recommend pricing based on your audience and genre." },
    { id: "curriculum", label: "Curriculum Builder", description: "AI generates a module-lesson tree from your manuscript", abbyTip: "I've mapped your chapters into modules. Chapters that naturally combine are grouped together. Does this structure feel right?" },
    { id: "content", label: "Lesson Content", description: "Generate scripts, exercises, quizzes for each lesson", abbyTip: "Strong lessons follow the Teach → Show → Do → Review pattern. I've structured each lesson this way." },
    { id: "materials", label: "Course Materials", description: "Welcome video, workbook, certificate, and bonuses", abbyTip: "A companion workbook increases perceived value by 40%. Link it to your Workbook Builder." },
    { id: "sales-page", label: "Sales Page", description: "AI generates a complete high-converting sales page", abbyTip: "Lead with the transformation, not the features. 'You will...' beats 'This course includes...'" },
    { id: "email-sequence", label: "Email Sequence", description: "Generate a 7-email nurture and launch sequence", abbyTip: "A well-crafted launch sequence can double your enrollment rate. Subject lines under 50 characters get 12% higher open rates." },
    { id: "preview", label: "Preview & Publish", description: "Simulate the student experience and publish", abbyTip: "Consider offering an early-bird discount to your email list for the first 48 hours." },
  ],
};

const audiobookBuilder: BuilderNodeConfig = {
  id: "audiobook",
  label: "Audiobook Studio",
  category: "build",
  requiredTier: "pro",
  dbTable: "audiobooks",
  icon: "Headphones",
  color: "text-emerald-500",
  customRenderer: "audiobook",
  abbyGreeting: "Audiobooks are the fastest-growing format. Let's create a professional narration from your manuscript.",
  abbyPublishMessage: "Your audiobook is ready! Distribute it on your platform, Audible, or Google Play. Consider your Podcast next.",
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
  category: "build",
  requiredTier: "pro",
  dbTable: "podcasts",
  icon: "Mic",
  color: "text-emerald-500",
  customRenderer: "podcast-scripts",
  abbyGreeting: "Podcasts build authority and audience like nothing else. Let's create production-ready scripts, show notes, and guest guides from your book.",
  abbyPublishMessage: "Your podcast scripts are ready! A consistent podcast builds authority faster than any other channel. Consider your Webinar next.",
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
  category: "build",
  requiredTier: "pro",
  dbTable: "webinars",
  icon: "Video",
  color: "text-emerald-500",
  customRenderer: "webinar",
  abbyGreeting: "Webinars are the #1 conversion tool for authors. Let's create a complete webinar package from your book.",
  abbyPublishMessage: "Your webinar package is ready! Schedule it and promote to your email list. Each webinar can generate $1K-$10K.",
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
  category: "build",
  requiredTier: "pro",
  dbTable: "courses", // reuse courses with membership type
  icon: "CreditCard",
  color: "text-emerald-500",
  customRenderer: "membership",
  abbyGreeting: "Recurring revenue through memberships is the holy grail. Let's design a membership program your readers will love.",
  abbyPublishMessage: "Your membership program is designed! Connect payment processing and start enrolling founding members.",
  steps: [
    { id: "setup", label: "Membership Setup", description: "Set name, tagline, and number of tiers", abbyTip: "3 tiers is the sweet spot. Your Reader Circle (free/low-cost) builds the community, Pro ($27-$47/mo) delivers ongoing value, and VIP ($97-$197/mo) gives access to you personally." },
    { id: "tiers", label: "Tier Builder", description: "Configure tier names, pricing, and benefits", abbyTip: "Make the middle tier the obvious choice by giving it 80% of the VIP value at 40% of the price. This is the decoy pricing strategy." },
    { id: "content-calendar", label: "Content Calendar", description: "AI generates a 3-month content calendar per tier", abbyTip: "Members stay for consistency — aim for 2 live sessions + 4 content drops per month. Recurring content builds habits." },
    { id: "sales-onboarding", label: "Sales & Onboarding", description: "Sales page, welcome emails, onboarding checklist, and cancellation prevention", abbyTip: "A strong sales page + onboarding flow reduces churn by 40%. Welcome sequences per tier are essential." },
    { id: "publish", label: "Preview & Publish", description: "Preview the membership experience and publish", abbyTip: "Launch with a founding member discount (50% off first 3 months) to build critical mass." },
  ],
};

const leadMagnetBuilder: BuilderNodeConfig = {
  id: "lead-magnet",
  label: "Lead Magnet Builder",
  category: "build",
  requiredTier: "starter",
  dbTable: "generated_assets",
  icon: "Magnet",
  color: "text-emerald-500",
  abbyGreeting: "A compelling lead magnet is the foundation of your email list. Let's create one that converts visitors into subscribers.",
  abbyPublishMessage: "Your lead magnet is ready! Add it to your microsite and start building your email list.",
  steps: [
    { id: "configure", label: "Configure", description: "Choose type and target audience", abbyTip: "Checklists and cheat sheets convert best. They promise a quick win with minimal effort." },
    { id: "generate", label: "AI Generate", description: "Generate lead magnet content", abbyTip: "I'll pull your book's most actionable advice into a compact, high-value format." },
    { id: "edit", label: "Edit Content", description: "Customize and polish content", abbyTip: "Include your photo and a short bio. It builds trust and leads to book sales." },
    { id: "design", label: "Design", description: "Choose template and branding", abbyTip: "Professional design increases perceived value. Use your book's color palette." },
    { id: "preview", label: "Preview & Publish", description: "Review and add to your microsite", abbyTip: "Place the opt-in form above the fold on your microsite for maximum conversions." },
  ],
};

// ─── B·BRIDGE (8 nodes) ──────────────────────────────────────────────

const coachingBuilder: BuilderNodeConfig = {
  id: "coaching-1on1",
  label: "1-on-1 Coaching",
  category: "bridge",
  requiredTier: "pro",
  dbTable: "coaching_packages",
  icon: "UserCheck",
  color: "text-violet-500",
  abbyGreeting: "1-on-1 coaching is your highest-value offer. Let's design packages that reflect your expertise.",
  abbyPublishMessage: "Your coaching packages are live! Share them on your microsite and start booking discovery calls.",
  steps: [
    { id: "packages", label: "Design Packages", description: "Create coaching packages and pricing", abbyTip: "Offer 3 tiers: Single Session ($297), 4-Pack ($997), VIP Quarter ($2,497)." },
    { id: "intake", label: "Intake Form", description: "Create client intake questionnaire", abbyTip: "Ask about goals, timeline, budget, and previous attempts. This qualifies leads." },
    { id: "curriculum", label: "Session Framework", description: "Design your coaching methodology", abbyTip: "Structure sessions: 10min check-in, 30min deep work, 10min action items, 10min Q&A." },
    { id: "sales-page", label: "Sales Page", description: "Generate coaching sales copy", abbyTip: "Include testimonials and specific outcomes. 'My clients achieve X in Y weeks.'" },
    { id: "preview", label: "Preview & Publish", description: "Review and launch coaching", abbyTip: "Start with 3-5 clients max. Refine your process before scaling." },
  ],
};

const groupCoachingBuilder: BuilderNodeConfig = {
  id: "group-coaching",
  label: "Group Coaching",
  category: "bridge",
  requiredTier: "pro",
  dbTable: "coaching_packages",
  icon: "Users",
  color: "text-violet-500",
  abbyGreeting: "Group coaching scales your impact without scaling your time. Let's design an 8-week program.",
  abbyPublishMessage: "Your group coaching program is designed! Start promoting to your email list for the next cohort.",
  steps: [
    { id: "configure", label: "Configure", description: "Set group size, duration, and pricing", abbyTip: "8-12 people per cohort at $497-$997 is the sweet spot for engagement and revenue." },
    { id: "curriculum", label: "AI Curriculum", description: "Generate 8-week group curriculum", abbyTip: "I'll create weekly themes from your book with group exercises and accountability partners." },
    { id: "materials", label: "Session Materials", description: "Create worksheets and discussion guides", abbyTip: "Pre-work before each session increases engagement. Keep it to 15 minutes max." },
    { id: "sales-page", label: "Sales Page", description: "Generate enrollment page", abbyTip: "Include a countdown timer and limited spots messaging. Scarcity drives enrollment." },
    { id: "preview", label: "Preview & Launch", description: "Review and open enrollment", abbyTip: "Run a free workshop first to warm up your audience, then pitch the paid program at the end." },
  ],
};

const speakingBuilder: BuilderNodeConfig = {
  id: "speaking",
  label: "Speaking Profile",
  category: "bridge",
  requiredTier: "enterprise",
  dbTable: "speaking_topics",
  icon: "Presentation",
  color: "text-violet-500",
  abbyGreeting: "Speaking is the fastest path to authority and premium clients. Let's build your professional speaking profile.",
  abbyPublishMessage: "Your speaking profile is live! Submit it to speaker bureaus and start pitching to conferences.",
  steps: [
    { id: "topics", label: "Speaking Topics", description: "Create signature talk topics", abbyTip: "Create 2-3 signature talks. One keynote (45min), one workshop (2hr), one panel topic." },
    { id: "bio", label: "Speaker Bio", description: "Generate professional speaker bio", abbyTip: "Lead with outcomes and credibility markers. Include media appearances and audience sizes." },
    { id: "media-kit", label: "Media Kit", description: "Create speaker media kit", abbyTip: "Include professional photos, testimonials from event organizers, and a sizzle reel link." },
    { id: "pricing", label: "Fee Structure", description: "Set speaking fees and packages", abbyTip: "Start at $2,500-$5,000 for keynotes. Bundle with book sales for event organizers." },
    { id: "preview", label: "Preview & Publish", description: "Review and publish your profile", abbyTip: "List on SpeakerHub and reach out directly to 10 conferences in your niche this month." },
  ],
};

const corporateTrainingBuilder: BuilderNodeConfig = {
  id: "corporate-training",
  label: "Corporate Training",
  category: "bridge",
  requiredTier: "enterprise",
  dbTable: "courses",
  icon: "Building2",
  color: "text-violet-500",
  abbyGreeting: "Corporate training commands premium fees. Let's design programs that HR departments will love.",
  abbyPublishMessage: "Your corporate training program is ready! Create proposals for 3-5 target companies this month.",
  steps: [
    { id: "configure", label: "Configure", description: "Set program type and audience", abbyTip: "Half-day workshops ($3K-$8K) are easiest to sell. Full-day programs ($8K-$15K) for established clients." },
    { id: "curriculum", label: "AI Curriculum", description: "Generate training curriculum", abbyTip: "Include interactive exercises, case studies, and takeaway materials. Corporate buyers value engagement." },
    { id: "materials", label: "Participant Materials", description: "Create handouts and worksheets", abbyTip: "Brand everything professionally. Include pre-work and post-training action plans." },
    { id: "proposal", label: "Proposal Template", description: "Generate corporate proposal", abbyTip: "Quantify ROI. 'Teams that complete this training show 30% improvement in X metric.'" },
    { id: "preview", label: "Preview & Publish", description: "Review and finalize", abbyTip: "Start by offering a free lunch-and-learn to build relationships with HR decision makers." },
  ],
};

const affiliateBuilder: BuilderNodeConfig = {
  id: "affiliate",
  label: "Affiliate Program",
  category: "bridge",
  requiredTier: "pro",
  dbTable: "generated_assets",
  icon: "Link",
  color: "text-violet-500",
  abbyGreeting: "An affiliate program turns your readers and peers into a sales force. Let's set one up.",
  abbyPublishMessage: "Your affiliate program is designed! Start recruiting your first 10 affiliates from your email list.",
  steps: [
    { id: "configure", label: "Configure", description: "Set commission rates and terms", abbyTip: "30-50% commission on digital products is standard. Higher rates attract better affiliates." },
    { id: "materials", label: "Affiliate Materials", description: "Create swipe copy and banners", abbyTip: "Provide ready-to-use email templates, social posts, and banner ads for your affiliates." },
    { id: "tracking", label: "Tracking Setup", description: "Configure affiliate link tracking", abbyTip: "Use unique coupon codes per affiliate for easy tracking and attribution." },
    { id: "recruitment", label: "Recruitment Plan", description: "Create affiliate recruitment strategy", abbyTip: "Your best affiliates are your best customers. Invite them first." },
    { id: "preview", label: "Preview & Launch", description: "Review and launch your program", abbyTip: "Set up monthly payouts via PayPal or Stripe. Consistency builds trust with affiliates." },
  ],
};

const partnershipBuilder: BuilderNodeConfig = {
  id: "partnerships",
  label: "JV Partnerships",
  category: "bridge",
  requiredTier: "pro",
  dbTable: "generated_assets",
  icon: "Handshake",
  color: "text-violet-500",
  abbyGreeting: "Strategic partnerships multiply your reach exponentially. Let's identify and structure the right collaborations.",
  abbyPublishMessage: "Your partnership playbook is ready! Reach out to your top 5 potential partners this week.",
  steps: [
    { id: "identify", label: "Identify Partners", description: "Find ideal JV partners", abbyTip: "Look for complementary (not competing) authors in adjacent niches with similar audience sizes." },
    { id: "proposal", label: "Partnership Proposals", description: "Create collaboration proposals", abbyTip: "Lead with what you can offer them. Always propose a specific, low-risk first collaboration." },
    { id: "structure", label: "Deal Structure", description: "Design revenue sharing models", abbyTip: "50/50 splits are standard for co-created products. Guest expert spots = affiliate commission." },
    { id: "materials", label: "Co-Marketing Plan", description: "Plan joint marketing activities", abbyTip: "Start with a joint webinar or podcast episode. Low effort, high exposure for both parties." },
    { id: "preview", label: "Review & Execute", description: "Finalize partnership playbook", abbyTip: "Always formalize agreements in writing, even with friends. It protects both parties." },
  ],
};

const licensingBuilder: BuilderNodeConfig = {
  id: "licensing",
  label: "Content Licensing",
  category: "bridge",
  requiredTier: "pro",
  dbTable: "generated_assets",
  icon: "FileKey",
  color: "text-violet-500",
  abbyGreeting: "Licensing your content creates passive income from work you've already done. Let's structure your licensing offerings.",
  abbyPublishMessage: "Your licensing packages are ready! Start approaching organizations in your niche.",
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
  requiredTier: "pro",
  dbTable: "generated_assets",
  icon: "MessageCircle",
  color: "text-violet-500",
  abbyGreeting: "A community turns readers into lifelong advocates. Let's design an engaging community experience.",
  abbyPublishMessage: "Your community blueprint is ready! Launch on Circle, Discord, or Facebook Groups.",
  steps: [
    { id: "configure", label: "Configure", description: "Set community type and platform", abbyTip: "Circle or Discord for premium communities. Facebook Groups for free communities." },
    { id: "structure", label: "Community Structure", description: "Design channels and categories", abbyTip: "Keep it simple: General, Wins, Q&A, Resources, and one topic-specific channel." },
    { id: "content-plan", label: "Engagement Plan", description: "Create content and engagement calendar", abbyTip: "Weekly: 1 live session, 1 challenge, 1 resource share, 1 celebration thread." },
    { id: "guidelines", label: "Guidelines", description: "Create community guidelines", abbyTip: "Clear rules create safe spaces. Include expectations for tone, self-promotion, and conflicts." },
    { id: "preview", label: "Preview & Launch", description: "Review and launch community", abbyTip: "Invite your top 20 most engaged email subscribers as founding members." },
  ],
};

// ─── Y·YIELD (8 nodes) ──────────────────────────────────────────────

const retreatBuilder: BuilderNodeConfig = {
  id: "retreat",
  label: "Retreats & Bootcamps",
  category: "yield",
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Mountain",
  color: "text-amber-500",
  abbyGreeting: "Retreats create transformative experiences and premium revenue. Let's design an unforgettable 2-3 day program.",
  abbyPublishMessage: "Your retreat program is designed! Start scouting venues and promoting to your VIP list.",
  steps: [
    { id: "configure", label: "Configure", description: "Set format, dates, and pricing", abbyTip: "2-day retreats at $1,997-$4,997 with 15-20 attendees are the sweet spot." },
    { id: "agenda", label: "AI Agenda", description: "Generate detailed retreat agenda", abbyTip: "I'll create a transformative arc: Day 1 = Awareness, Day 2 = Action, Day 3 = Accountability." },
    { id: "logistics", label: "Logistics Plan", description: "Venue, catering, and materials planning", abbyTip: "All-inclusive pricing simplifies the decision for attendees and increases perceived value." },
    { id: "sales-page", label: "Sales Page", description: "Generate retreat sales copy", abbyTip: "Sell the transformation, not the schedule. 'Leave with a complete business plan' > 'Day 1: Introduction.'" },
    { id: "preview", label: "Preview & Launch", description: "Review and open registration", abbyTip: "Offer a $500 early-bird discount and a payment plan option to maximize enrollment." },
  ],
};

const certificationBuilder: BuilderNodeConfig = {
  id: "certification",
  label: "Certification Program",
  category: "yield",
  requiredTier: "enterprise",
  dbTable: "courses",
  icon: "Award",
  color: "text-amber-500",
  abbyGreeting: "A certification program establishes you as THE authority in your field. Let's design a professional credential.",
  abbyPublishMessage: "Your certification program is designed! This is a premium offering that builds your legacy.",
  steps: [
    { id: "configure", label: "Configure", description: "Set levels, requirements, and pricing", abbyTip: "Start with one certification level at $2,997-$9,997. Add advanced levels later." },
    { id: "curriculum", label: "AI Curriculum", description: "Generate multi-module curriculum", abbyTip: "8-12 modules with assessments at each stage. Include a capstone project for credibility." },
    { id: "assessment", label: "Assessment Design", description: "Create exams and practical assessments", abbyTip: "Mix knowledge tests (60%) with practical application (40%). Include peer review components." },
    { id: "credentials", label: "Credential Design", description: "Design certificates and digital badges", abbyTip: "Professional certificates increase perceived value. Include verifiable digital badges." },
    { id: "preview", label: "Preview & Launch", description: "Review and open enrollment", abbyTip: "Launch to your coaching alumni first. They're already invested in your methodology." },
  ],
};

const mastermindBuilder: BuilderNodeConfig = {
  id: "mastermind",
  label: "Mastermind Groups",
  category: "yield",
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Brain",
  color: "text-amber-500",
  abbyGreeting: "Masterminds are the ultimate high-ticket, high-impact offering. Let's design an exclusive group experience.",
  abbyPublishMessage: "Your mastermind program is designed! Start with an application process to curate the right group.",
  steps: [
    { id: "configure", label: "Configure", description: "Set format, duration, and investment", abbyTip: "6-12 month programs with 6-10 members at $5K-$25K/year create deep transformation." },
    { id: "structure", label: "Meeting Structure", description: "Design meeting format and cadence", abbyTip: "Monthly 2-hour meetings: Hot seats (30min each), guest expert (30min), accountability check." },
    { id: "application", label: "Application Process", description: "Create screening and enrollment", abbyTip: "An application process increases perceived value and ensures group quality." },
    { id: "materials", label: "Member Resources", description: "Create welcome kit and resources", abbyTip: "Include a member directory, shared resource library, and private communication channel." },
    { id: "preview", label: "Preview & Launch", description: "Review and accept applications", abbyTip: "Interview every applicant. Group chemistry is the #1 factor in mastermind success." },
  ],
};

const bigTicketBuilder: BuilderNodeConfig = {
  id: "big-ticket",
  label: "Big Ticket Consulting",
  category: "yield",
  requiredTier: "enterprise",
  dbTable: "coaching_packages",
  icon: "Gem",
  color: "text-amber-500",
  abbyGreeting: "Premium consulting packages can generate $5K-$25K per client. Let's design your VIP offering.",
  abbyPublishMessage: "Your consulting packages are designed! Start with a free strategy session funnel to attract qualified leads.",
  steps: [
    { id: "packages", label: "Design Packages", description: "Create premium consulting packages", abbyTip: "Offer a VIP Day ($5K), Quarter Intensive ($10K), and Year-Long Partnership ($25K)." },
    { id: "process", label: "Delivery Process", description: "Map out the client journey", abbyTip: "Include a kickoff session, regular check-ins, async support, and a final review." },
    { id: "application", label: "Application Funnel", description: "Create application and qualification", abbyTip: "Use a 'Free Strategy Session' to qualify leads and pitch the paid engagement." },
    { id: "sales-page", label: "Sales Materials", description: "Generate premium sales copy", abbyTip: "Focus on ROI. 'Clients typically see a 10x return on their investment within 6 months.'" },
    { id: "preview", label: "Preview & Publish", description: "Review and launch", abbyTip: "Start by converting your best coaching clients. They already trust your expertise." },
  ],
};

const revenueShareBuilder: BuilderNodeConfig = {
  id: "revenue-share",
  label: "Revenue Sharing",
  category: "yield",
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "TrendingUp",
  color: "text-amber-500",
  abbyGreeting: "Revenue sharing aligns incentives and creates win-win partnerships. Let's structure your offers.",
  abbyPublishMessage: "Your revenue sharing framework is ready! Approach potential partners with a clear value proposition.",
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
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Layers",
  color: "text-amber-500",
  abbyGreeting: "White-labeling your content lets others sell it under their brand — pure passive income for you.",
  abbyPublishMessage: "Your white-label packages are designed! Target coaching companies and training organizations.",
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
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Calendar",
  color: "text-amber-500",
  abbyGreeting: "Hosting events positions you as a leader in your space. Let's plan a summit or conference.",
  abbyPublishMessage: "Your event blueprint is ready! Start with a virtual summit to test your concept before going live.",
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
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Network",
  color: "text-amber-500",
  abbyGreeting: "A franchise model scales your methodology through trained practitioners. This is legacy-building territory.",
  abbyPublishMessage: "Your franchise blueprint is designed! This is a long-term play that builds your legacy and impact.",
  steps: [
    { id: "model", label: "Franchise Model", description: "Design your franchise/license model", abbyTip: "Start with a 'licensed practitioner' model before full franchise. Lower barrier to entry." },
    { id: "training", label: "Practitioner Training", description: "Create facilitator training program", abbyTip: "Include initial certification (40hrs), ongoing development (quarterly), and quality standards." },
    { id: "operations", label: "Operations Manual", description: "Create franchise operations guide", abbyTip: "Document everything: branding, delivery, pricing, marketing, and customer service standards." },
    { id: "financials", label: "Financial Model", description: "Design pricing and revenue model", abbyTip: "License fee ($5K-$25K upfront) + ongoing royalties (10-15% of revenue) is standard." },
    { id: "preview", label: "Review & Plan", description: "Finalize franchise blueprint", abbyTip: "Pilot with 3-5 practitioners before scaling. Their feedback shapes the final model." },
  ],
};

const upsellBuilder: BuilderNodeConfig = {
  id: "upsell-downsell",
  label: "Upsells / Downsells",
  category: "bridge",
  requiredTier: "pro",
  dbTable: "generated_assets",
  icon: "ArrowUpDown",
  color: "text-violet-500",
  customRenderer: "upsell",
  abbyGreeting: "Upsells and downsells are the easiest way to increase revenue without more traffic. Let's build conversion sequences for your checkout flow.",
  abbyPublishMessage: "Your upsell funnel is live! Every purchase now has a chance to generate additional revenue automatically.",
  steps: [
    { id: "setup", label: "Funnel Setup", description: "Select primary product and funnel type", abbyTip: "Your workbook buyers are the perfect audience for an upsell to the Online Course. I recommend a 'Special offer: Get the full course for 40% off — only available now' upsell." },
    { id: "offer", label: "Offer Builder", description: "AI generates the upsell/downsell offer with pricing and urgency", abbyTip: "The best upsells feel like a natural extension of what was just purchased. Connect your primary product to a logical next step." },
    { id: "design", label: "Page Design", description: "Design upsell, downsell, and order bump pages", abbyTip: "One CTA, clear pricing, and urgency. Remove all navigation — the only choices should be 'Yes' or 'No thanks.'" },
    { id: "publish", label: "Preview & Publish", description: "Walk through the funnel and publish", abbyTip: "Based on a 15-25% upsell conversion rate, this could add significant monthly revenue with zero additional traffic." },
  ],
};

// ─── EXPORT ALL 27 NODES ─────────────────────────────────────────────

export const ALL_BUILDER_NODES: BuilderNodeConfig[] = [
  // B·Build (11)
  workbookBuilder,
  socialMediaBuilder,
  emailMarketingBuilder,
  homeStudyCourseBuilder,
  bookSalesBuilder,
  leadMagnetBuilder,
  onlineCourseBuilder,
  audiobookBuilder,
  podcastBuilder,
  webinarBuilder,
  membershipBuilder,
  // B·Bridge (8+1)
  coachingBuilder,
  groupCoachingBuilder,
  speakingBuilder,
  corporateTrainingBuilder,
  affiliateBuilder,
  partnershipBuilder,
  licensingBuilder,
  communityBuilder,
  upsellBuilder,
  // Y·Yield (8)
  retreatBuilder,
  certificationBuilder,
  mastermindBuilder,
  bigTicketBuilder,
  revenueShareBuilder,
  whitelabelBuilder,
  eventsBuilder,
  franchiseBuilder,
];

export const BUILDER_NODE_MAP: Record<string, BuilderNodeConfig> = {};
ALL_BUILDER_NODES.forEach((n) => {
  BUILDER_NODE_MAP[n.id] = n;
});

export const BUILD_NODES = ALL_BUILDER_NODES.filter((n) => n.category === "build");
export const BRIDGE_NODES = ALL_BUILDER_NODES.filter((n) => n.category === "bridge");
export const YIELD_NODES = ALL_BUILDER_NODES.filter((n) => n.category === "yield");
