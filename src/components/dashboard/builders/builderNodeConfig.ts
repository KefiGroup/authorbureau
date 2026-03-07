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
  customRenderer: "email-marketing",
  abbyGreeting: "Email is where the money is. Let's build a complete email marketing system that nurtures readers into customers — all derived from your book content.",
  abbyPublishMessage: "Your email marketing system is live! Welcome sequences, nurture campaigns, and automation rules are all ready. Next: build your Home Study Course.",
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
  customRenderer: "book-sales",
  abbyGreeting: "Selling books at events can be highly profitable with the right setup. Let's create your event sales kit.",
  abbyPublishMessage: "Your event sales kit is ready! Print your materials and start booking speaking gigs.",
  steps: [
    { id: "setup", label: "Event Sales Setup", description: "Set event type, attendance, books to bring, pricing, and payment methods", abbyTip: "Back-of-room book sales after a keynote convert at 30-50% of the audience. For a 200-person event, bring 60-100 books." },
    { id: "materials", label: "Sales Materials", description: "Table display, QR codes, business cards, bundle offers, and email capture cards", abbyTip: "A one-page sell sheet with testimonials and a QR code to purchase is essential." },
    { id: "logistics", label: "Logistics", description: "Inventory tracker, shipping calculator, packing checklist, and post-event follow-up", abbyTip: "Track which events convert best so you can prioritize future appearances." },
    { id: "preview", label: "Preview & Publish", description: "Review all materials and revenue projection", abbyTip: "At a 200-person event with 40% conversion, you'd sell 80 books — plus capture emails for your funnel." },
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

const websiteBuilder: BuilderNodeConfig = {
  id: "website",
  label: "Website / Microsite",
  category: "build",
  requiredTier: "starter",
  dbTable: "generated_assets",
  icon: "Globe",
  color: "text-emerald-500",
  customRenderer: "website",
  abbyGreeting: "Your microsite is the hub that connects all your products. Let's build a beautiful, conversion-optimized author website.",
  abbyPublishMessage: "Your website is live! Share the URL everywhere — social profiles, email signature, book bio. Next: drive traffic with Social Media.",
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
  customRenderer: "coaching",
  abbyGreeting: "1-on-1 coaching is your highest-value offer. Let's design a complete coaching package — session structure, client materials, pricing, and booking system.",
  abbyPublishMessage: "Your coaching packages are live! Share them on your microsite and start booking discovery calls.",
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
  requiredTier: "pro",
  dbTable: "coaching_packages",
  icon: "Users",
  color: "text-violet-500",
  customRenderer: "group-coaching",
  abbyGreeting: "Group coaching is your highest-leverage coaching product. At $497 per person with 20 participants, that's $9,940 per cohort — and you only run it once.",
  abbyPublishMessage: "Your group coaching program is designed! Start promoting to your email list for the next cohort.",
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
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Presentation",
  color: "text-violet-500",
  customRenderer: "keynotes",
  abbyGreeting: "Your book naturally supports 3 keynote topics. I recommend starting with the broadest topic for maximum booking potential, then adding niche topics as you build your speaking reputation.",
  abbyPublishMessage: "Your speaking materials are live! Submit to speaker bureaus and start pitching to conferences.",
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
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Building2",
  color: "text-violet-500",
  customRenderer: "in-house-speaker",
  abbyGreeting: "Corporate workshops are your highest per-hour revenue. A full-day workshop at $10,000 often leads to repeat bookings and training program contracts.",
  abbyPublishMessage: "Your corporate training program is ready! Create proposals for 3-5 target companies this month.",
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
  requiredTier: "pro",
  dbTable: "generated_assets",
  icon: "Link",
  color: "text-violet-500",
  customRenderer: "affiliates",
  abbyGreeting: "Affiliates are your unpaid sales team. I recommend 30-40% commission on digital products — it's generous enough to motivate promotion and you still profit.",
  abbyPublishMessage: "Your affiliate program is designed! Start recruiting your first 10 affiliates from your email list.",
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
  requiredTier: "pro",
  dbTable: "generated_assets",
  icon: "Handshake",
  color: "text-violet-500",
  customRenderer: "jv-partnerships",
  abbyGreeting: "JV partnerships are the fastest way to reach new audiences. I recommend starting with cross-promotions (free) before moving to revenue shares.",
  abbyPublishMessage: "Your partnership playbook is ready! Reach out to your top 5 potential partners this week.",
  steps: [
    { id: "setup", label: "Partnership Setup", description: "Set partnership type, revenue split, partner criteria, and products available", abbyTip: "JV partnerships are the fastest way to reach new audiences. I recommend starting with cross-promotions (free) before moving to revenue shares." },
    { id: "materials", label: "Partner Materials", description: "Proposal template, revenue sharing agreement, co-promotion swipe copy, and social templates", abbyTip: "Lead with what you can offer them. Always propose a specific, low-risk first collaboration." },
    { id: "onboarding", label: "Partner Onboarding", description: "Welcome sequence, resource page, reporting template, and communication cadence", abbyTip: "Transparent tracking builds trust. Share dashboards with partners monthly." },
    { id: "preview", label: "Preview & Publish", description: "Preview partner proposal, resource page, and revenue projection", abbyTip: "A single JV partner with a 10,000-person email list could generate significant sales with the right conversion rate." },
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
  customRenderer: "retreats",
  abbyGreeting: "Retreats are your highest per-person revenue product. A 3-day retreat at $2,997 with 20 participants is $59,940 — minus venue costs, you could net $30,000-$40,000.",
  abbyPublishMessage: "Your retreat program is designed! Start scouting venues and promoting to your VIP list.",
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
  requiredTier: "enterprise",
  dbTable: "courses",
  icon: "Award",
  color: "text-amber-500",
  customRenderer: "certification",
  abbyGreeting: "Certification is the ultimate authority builder. Certified practitioners become your ambassadors AND a recurring revenue stream through renewal fees.",
  abbyPublishMessage: "Your certification program is designed! This is a premium offering that builds your legacy.",
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
  requiredTier: "enterprise",
  dbTable: "generated_assets",
  icon: "Brain",
  color: "text-amber-500",
  customRenderer: "masterminds",
  abbyGreeting: "Masterminds are your highest-value recurring product. 8 members at $10,000/year = $80,000 — and the community creates its own retention.",
  abbyPublishMessage: "Your mastermind program is designed! Start with an application process to curate the right group.",
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
  websiteBuilder,
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
