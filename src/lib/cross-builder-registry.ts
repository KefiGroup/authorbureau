/**
 * Cross-Builder Output Registry
 * 
 * Defines what outputs each builder generates and where they should be pushed.
 * Based on the ABBY 28-Node Ecosystem Cross-Builder Integration Map (v3).
 * 
 * Each entry maps: sourceBuilder → array of push definitions
 * Push definitions include: destination builder, push type, label, and
 * an optional content transformer key.
 */

export interface CrossBuilderPushDef {
  /** ID of the destination builder (matches builderNodeConfig keys) */
  destinationBuilder: string;
  /** Type of content being pushed (used as category key) */
  pushType: string;
  /** Human-readable label shown in notifications */
  label: string;
  /** Description of what gets pushed */
  description: string;
  /** The destination table where a draft record would be created */
  destinationTable?: string;
}

export interface CrossBuilderOutputMap {
  [sourceBuilder: string]: CrossBuilderPushDef[];
}

/**
 * Master registry of all cross-builder output flows.
 * Source: ABBY 27-Node Ecosystem document §1.3
 */
export const CROSS_BUILDER_REGISTRY: CrossBuilderOutputMap = {
  // ─── LEAD MAGNETS (BP-02) ─────────────────────────────────────────
  "lead-magnet": [
    { destinationBuilder: "social-media", pushType: "quiz-promo-posts", label: "Quiz Promotion Posts", description: "Posts promoting the quiz/lead magnet with teaser questions and CTA to take the quiz" },
    { destinationBuilder: "social-media", pushType: "quiz-insight-posts", label: "Quiz Insight Posts", description: "Standalone posts sharing insights from quiz content to drive engagement" },
    { destinationBuilder: "email-marketing", pushType: "lead-nurture", label: "Lead Nurture Sequence", description: "Post-quiz email nurture sequence based on quiz results", destinationTable: "email_flows" },
    { destinationBuilder: "website", pushType: "quiz-page", label: "Quiz Landing Page", description: "Embeddable quiz page on author microsite" },
  ],

  // ─── BUILDER 1: ONLINE COURSES (Self-Paced) ────────────────────────
  "online-course": [
    { destinationBuilder: "email-marketing", pushType: "nurture-sequence", label: "7-Email Nurture Sequence", description: "Full sequence with subject lines, body, timing — appears as a ready-to-activate campaign", destinationTable: "email_flows" },
    { destinationBuilder: "website", pushType: "sales-page", label: "Course Sales Page", description: "Complete sales page auto-added to the author's microsite product catalog" },
    { destinationBuilder: "workbook", pushType: "companion-outline", label: "Companion Workbook Outline", description: "Pre-filled workbook structure mapped to course modules", destinationTable: "generated_assets" },
    { destinationBuilder: "webinar", pushType: "pitch-script", label: "Webinar Pitch Script", description: "'Sell your course via webinar' script pre-loaded in Webinar Builder", destinationTable: "generated_assets" },
    { destinationBuilder: "social-media", pushType: "launch-calendar", label: "30-Day Launch Calendar", description: "Course launch social media calendar pre-loaded in Social Media Builder" },
    { destinationBuilder: "training-programs", pushType: "upgrade-curriculum", label: "Training Program Upgrade", description: "Upgrade this course to a premium facilitated training program", destinationTable: "training_programs" },
    { destinationBuilder: "coaching", pushType: "coaching-pathway", label: "Coaching Pathway", description: "Course graduates → coaching program structure", destinationTable: "coaching_packages" },
    { destinationBuilder: "affiliates", pushType: "affiliate-swipe", label: "Affiliate Swipe Copy", description: "Promote this course affiliate materials" },
  ],

  // ─── BUILDER 1B: TRAINING PROGRAMS (Facilitated Workshop) ─────────
  "training-programs": [
    { destinationBuilder: "email-marketing", pushType: "nurture-sequence", label: "7-Email Nurture Sequence", description: "Full sequence with subject lines, body, timing for workshop enrollment", destinationTable: "email_flows" },
    { destinationBuilder: "website", pushType: "sales-page", label: "Training Program Sales Page", description: "Complete sales page for the author's microsite" },
    { destinationBuilder: "workbook", pushType: "companion-outline", label: "Companion Workbook Outline", description: "Pre-filled workbook structure mapped to training modules", destinationTable: "generated_assets" },
    { destinationBuilder: "webinar", pushType: "pitch-script", label: "Webinar Pitch Script", description: "'Sell your training via webinar' script", destinationTable: "generated_assets" },
    { destinationBuilder: "social-media", pushType: "launch-calendar", label: "30-Day Launch Calendar", description: "Training program launch social media calendar" },
    { destinationBuilder: "coaching", pushType: "coaching-pathway", label: "Post-Training Coaching", description: "Training graduates → coaching program structure", destinationTable: "coaching_packages" },
    { destinationBuilder: "group-coaching", pushType: "group-curriculum", label: "Group Coaching Curriculum", description: "Premium tier group coaching pre-loaded" },
    { destinationBuilder: "podcast-scripts", pushType: "episode-ideas", label: "Podcast Episode Ideas", description: "Teach your training content on podcast episodes" },
    { destinationBuilder: "affiliates", pushType: "affiliate-swipe", label: "Affiliate Swipe Copy", description: "Promote this training program affiliate materials" },
  ],

  // ─── BUILDER 2: HOME STUDY COURSES ────────────────────────
  "home-study": [
    { destinationBuilder: "email-marketing", pushType: "daily-drip", label: "Daily Email Drip Content", description: "Daily lesson delivery emails for the study duration", destinationTable: "email_flows" },
    { destinationBuilder: "website", pushType: "sales-page", label: "Home Study Sales Page", description: "Home study course sales page" },
    { destinationBuilder: "workbook", pushType: "companion-workbook", label: "Daily Exercise Workbook", description: "Daily exercise workbook structure", destinationTable: "generated_assets" },
    { destinationBuilder: "social-media", pushType: "promo-posts", label: "Promotional Posts", description: "'Join my home study' promotional posts" },
    { destinationBuilder: "upsell", pushType: "course-upsell", label: "Upsell to Full Course", description: "Upgrade from home study to full course offer" },
  ],

  // ─── BUILDER 3: WORKBOOKS ─────────────────────────────────
  "workbook": [
    { destinationBuilder: "email-marketing", pushType: "opt-in-sequence", label: "Opt-in Email Sequence", description: "Download free workbook opt-in sequence", destinationTable: "email_flows" },
    { destinationBuilder: "website", pushType: "product-listing", label: "Workbook Product Listing", description: "Workbook product listing on microsite" },
    { destinationBuilder: "social-media", pushType: "teaser-posts", label: "Sneak Peek Posts", description: "Sneak peek workbook page posts" },
    { destinationBuilder: "online-course", pushType: "course-bonus", label: "Course Bonus Material", description: "Linked as course bonus material" },
  ],

  // ─── BUILDER 4: AUDIOBOOK ─────────────────────────────────
  "audiobook": [
    { destinationBuilder: "social-media", pushType: "audio-teasers", label: "Audio Sample Clips", description: "'Listen to a chapter' teaser clips" },
    { destinationBuilder: "website", pushType: "product-page", label: "Audiobook Product Page", description: "Audiobook product listing with audio player" },
    { destinationBuilder: "email-marketing", pushType: "launch-emails", label: "Launch Announcement Emails", description: "'My audiobook is live' 3-email announcement sequence", destinationTable: "email_flows" },
    { destinationBuilder: "podcast-scripts", pushType: "behind-scenes", label: "Behind-the-Scenes Episode", description: "'How I turned my book into an audiobook' episode" },
  ],

  // ─── BUILDER 5: MONTHLY MEMBERSHIPS ───────────────────────
  "membership": [
    { destinationBuilder: "email-marketing", pushType: "welcome-sequence", label: "Member Welcome Sequence", description: "Member onboarding drip", destinationTable: "email_flows" },
    { destinationBuilder: "website", pushType: "tier-sales-pages", label: "Membership Sales Pages", description: "Sales pages per tier on microsite" },
    { destinationBuilder: "social-media", pushType: "teaser-posts", label: "Member Teaser Posts", description: "'Members got this today' teaser posts" },
    { destinationBuilder: "upsell", pushType: "post-course-offer", label: "Post-Course Membership Offer", description: "'Join the membership' post-course offer" },
    { destinationBuilder: "webinar", pushType: "member-webinar", label: "Monthly Member Webinar Scripts", description: "Monthly member-only webinar scripts" },
  ],

  // ─── BUILDER 6: UPSELLS/DOWNSELLS ─────────────────────────
  "upsell": [
    { destinationBuilder: "website", pushType: "funnel-pages", label: "Checkout Flow Pages", description: "Funnel pages for checkout flow" },
    { destinationBuilder: "email-marketing", pushType: "follow-up-emails", label: "Post-Purchase Emails", description: "Post-purchase and abandoned cart sequences", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "social-proof", label: "Social Proof Posts", description: "'X people upgraded today' social posts" },
  ],

  // ─── BUILDER 7: SOCIAL MEDIA ──────────────────────────────
  "social-media": [
    { destinationBuilder: "email-marketing", pushType: "lead-ctas", label: "Lead Magnet CTAs", description: "Social-to-email conversion tracking" },
    { destinationBuilder: "webinar", pushType: "webinar-promo", label: "Webinar Promotion Posts", description: "'Register for my free webinar' posts" },
    { destinationBuilder: "retreats", pushType: "event-promo", label: "Event Promotion Posts", description: "Event awareness posts for retreats and conventions" },
  ],

  // ─── BUILDER 8: WEBINARS ──────────────────────────────────
  "webinar": [
    { destinationBuilder: "website", pushType: "registration-page", label: "Registration Page", description: "Webinar registration page on microsite" },
    { destinationBuilder: "email-marketing", pushType: "reminder-emails", label: "Reminder Email Sequence", description: "Pre-webinar reminder sequence (8 emails total)", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "highlight-posts", label: "Key Insights Posts", description: "'Key insights from my webinar' carousel posts" },
    { destinationBuilder: "online-course", pushType: "replay-module", label: "Webinar Replay Module", description: "Webinar replay as bonus course module" },
    { destinationBuilder: "upsell", pushType: "special-offer", label: "Attendee Special Offer", description: "'Webinar special offer' upsell page" },
  ],

  // ─── BUILDER 9: PODCAST SCRIPTS ───────────────────────────
  "podcast-scripts": [
    { destinationBuilder: "website", pushType: "show-notes", label: "Show Notes Pages", description: "Blog-style show notes pages on microsite" },
    { destinationBuilder: "social-media", pushType: "promo-clips", label: "Promotional Clips", description: "Audiogram/quote card posts" },
    { destinationBuilder: "email-marketing", pushType: "guest-outreach", label: "Guest Outreach Emails", description: "Guest booking email templates", destinationTable: "email_flows" },
  ],

  // ─── BUILDER 10: EMAIL MARKETING ──────────────────────────
  "email-marketing": [
    { destinationBuilder: "social-media", pushType: "launch-coordination", label: "Coordinated Launch Posts", description: "Coordinated email + social launches" },
    { destinationBuilder: "upsell", pushType: "automation-triggers", label: "Trigger-Based Upsell Emails", description: "Automation rules for trigger-based upsell emails" },
    { destinationBuilder: "webinar", pushType: "subscriber-targeting", label: "Warm Lead Targeting", description: "'Invite warm leads to webinar' targeting" },
  ],

  // ─── BUILDER 11: WEBSITE/MICROSITE ────────────────────────
  "website": [
    { destinationBuilder: "email-marketing", pushType: "lead-capture", label: "Lead Capture Forms", description: "Form submissions → email list" },
    { destinationBuilder: "social-media", pushType: "blog-repurpose", label: "Blog Content Repurposed", description: "Blog posts repurposed as social content" },
    { destinationBuilder: "coaching", pushType: "booking-pages", label: "Booking Integration", description: "Service booking integration for coaching" },
  ],

  // ─── BUILDER 12: 1-ON-1 COACHING ──────────────────────────
  "coaching": [
    { destinationBuilder: "website", pushType: "coaching-page", label: "Coaching Sales Page", description: "'Work with me 1-on-1' premium page" },
    { destinationBuilder: "webinar", pushType: "strategy-call", label: "Free Strategy Call Webinar", description: "'Book a free call' mini-webinar script" },
    { destinationBuilder: "social-media", pushType: "testimonial-posts", label: "Client Testimonial Posts", description: "Client success story posts (with permission)" },
    { destinationBuilder: "email-marketing", pushType: "post-call-nurture", label: "Post-Call Nurture Emails", description: "Post-discovery-call 3-email nurture", destinationTable: "email_flows" },
    { destinationBuilder: "upsell", pushType: "graduate-coaching", label: "Graduate to Coaching Offer", description: "'Graduate to coaching' post-course upsell" },
  ],

  // ─── BUILDER 13: GROUP COACHING ───────────────────────────
  "group-coaching": [
    { destinationBuilder: "website", pushType: "enrollment-page", label: "Enrollment Page", description: "Group program sales page" },
    { destinationBuilder: "email-marketing", pushType: "launch-emails", label: "Cohort Launch Campaign", description: "Cohort enrollment campaign (5 emails)", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "cohort-posts", label: "Cohort Launch Posts", description: "'Cohort X just started' posts" },
    { destinationBuilder: "online-course", pushType: "shared-modules", label: "Shared Module Structure", description: "Shared curriculum modules as self-paced companion" },
    { destinationBuilder: "upsell", pushType: "coaching-upsell", label: "Group Coaching Upsell", description: "'Add group coaching to your course' offer" },
    { destinationBuilder: "coaching", pushType: "upgrade-pathway", label: "1-on-1 Upgrade Path", description: "'Graduate to 1-on-1 coaching' pathway" },
  ],

  // ─── BUILDER 14: BIG TICKET CONSULTING ────────────────────
  "big-ticket": [
    { destinationBuilder: "website", pushType: "premium-page", label: "Premium 'Work With Me' Page", description: "'Work with me' premium consulting page" },
    { destinationBuilder: "email-marketing", pushType: "application-follow-up", label: "Application Follow-Up Emails", description: "Application follow-up sequence", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "case-studies", label: "Case Study Posts", description: "Authority-building case study content" },
    { destinationBuilder: "keynotes", pushType: "consulting-cta", label: "Post-Keynote Consulting Path", description: "'Hire me after the keynote' pathway" },
    { destinationBuilder: "upsell", pushType: "vip-offer", label: "VIP Backend Offer", description: "Backend high-ticket consulting upsell" },
  ],

  // ─── BUILDER 15: REVENUE SHARING / JV ─────────────────────
  "jv-partnerships": [
    { destinationBuilder: "affiliates", pushType: "partner-materials", label: "Partner Commission Structure", description: "Shared commission structure with partners" },
    { destinationBuilder: "social-media", pushType: "co-marketing", label: "Joint Promotional Campaigns", description: "Co-marketing plan social campaigns" },
    { destinationBuilder: "email-marketing", pushType: "co-marketing-emails", label: "Joint Email Campaigns", description: "Co-marketing email campaigns" },
    { destinationBuilder: "website", pushType: "partner-page", label: "'Partner With Me' Page", description: "Partner with me page on microsite" },
    { destinationBuilder: "webinar", pushType: "jv-webinar", label: "JV Webinar Scripts", description: "Joint venture webinar scripts" },
  ],

  // ─── BUILDER 16: KEYNOTES ─────────────────────────────────
  "keynotes": [
    { destinationBuilder: "website", pushType: "speaking-page", label: "Speaking Page", description: "Speaking page with topics, one-sheet download, and fees" },
    { destinationBuilder: "social-media", pushType: "talk-highlights", label: "Talk Highlight Posts", description: "'Key insight from my talk' posts and video clips" },
    { destinationBuilder: "email-marketing", pushType: "post-event-nurture", label: "Post-Event Nurture Emails", description: "Post-event audience nurture sequence", destinationTable: "email_flows" },
    { destinationBuilder: "book-sales", pushType: "event-materials", label: "Book Sales Materials", description: "'Buy my book at the event' materials" },
    { destinationBuilder: "big-ticket", pushType: "consulting-pathway", label: "Consulting Pathway", description: "'Hire me for consulting' post-keynote pathway" },
  ],

  // ─── BUILDER 17: IN-HOUSE SPEAKER ─────────────────────────
  "in-house-speaker": [
    { destinationBuilder: "website", pushType: "corporate-page", label: "Corporate Services Page", description: "Corporate services page on microsite" },
    { destinationBuilder: "training-programs", pushType: "workshop-materials", label: "Shared Workshop Materials", description: "Shared curriculum components with training programs" },
    { destinationBuilder: "big-ticket", pushType: "roi-calculator", label: "Consulting ROI Calculator", description: "Consulting value proposition with ROI calculator" },
    { destinationBuilder: "email-marketing", pushType: "post-workshop-nurture", label: "Post-Workshop Nurture", description: "Post-workshop nurture to corporate contacts", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "corporate-proof", label: "Corporate Social Proof", description: "'Company X trained with me' posts" },
  ],

  // ─── BUILDER 18: TRAINING PROGRAMS (duplicate removed — defined above as Builder 1B)

  // ─── BUILDER 19: AFFILIATES ───────────────────────────────
  "affiliates": [
    { destinationBuilder: "website", pushType: "affiliate-signup", label: "Affiliate Signup Page", description: "'Become an affiliate' page on microsite" },
    { destinationBuilder: "email-marketing", pushType: "swipe-emails", label: "Affiliate Swipe Emails", description: "Ready-to-send affiliate email templates", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "social-templates", label: "Affiliate Social Templates", description: "Affiliate social post templates" },
    { destinationBuilder: "jv-partnerships", pushType: "jv-affiliates", label: "JV Affiliate Partnerships", description: "JV affiliate partnership framework" },
  ],

  // ─── BUILDER 20: RETREATS & BOOTCAMPS ─────────────────────
  "retreats": [
    { destinationBuilder: "website", pushType: "event-page", label: "Event Registration Page", description: "Event registration page on microsite" },
    { destinationBuilder: "email-marketing", pushType: "launch-emails", label: "Event Promotion Emails", description: "Event promotion email sequence", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "countdown-posts", label: "Countdown & Teaser Posts", description: "Countdown and teaser posts for event" },
    { destinationBuilder: "upsell", pushType: "premium-offer", label: "Premium Retreat Offer", description: "'Join the retreat' premium offer" },
    { destinationBuilder: "masterminds", pushType: "graduate-pathway", label: "Mastermind Graduate Path", description: "'Retreat graduates → mastermind' pathway" },
  ],

  // ─── BUILDER 21: CERTIFICATION ────────────────────────────
  "certification": [
    { destinationBuilder: "website", pushType: "program-page", label: "Certification Program Page", description: "Certification program listing on microsite" },
    { destinationBuilder: "email-marketing", pushType: "enrollment-emails", label: "Enrollment Campaign Emails", description: "Application and enrollment email sequence", destinationTable: "email_flows" },
    { destinationBuilder: "website", pushType: "directory", label: "Certified Practitioner Directory", description: "Public directory of certified practitioners" },
    { destinationBuilder: "social-media", pushType: "announcements", label: "Certification Announcements", description: "'Congratulations to our new certified...' posts" },
    { destinationBuilder: "training-programs", pushType: "capstone", label: "Training Program Capstone", description: "Certification as training program capstone" },
    { destinationBuilder: "coaching", pushType: "overflow-referrals", label: "Practitioner Referrals", description: "Overflow referrals to certified practitioners" },
  ],

  // ─── BUILDER 22: MASTERMINDS ──────────────────────────────
  "masterminds": [
    { destinationBuilder: "website", pushType: "application-page", label: "Mastermind Application Page", description: "'Apply for the mastermind' exclusive page" },
    { destinationBuilder: "email-marketing", pushType: "invitation-emails", label: "Exclusive Invitation Emails", description: "Exclusive invitation sequence to qualified leads", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "behind-scenes", label: "Behind-the-Scenes Posts", description: "'Inside the mastermind' behind-the-scenes exclusivity posts" },
    { destinationBuilder: "upsell", pushType: "top-ladder", label: "Top of Value Ladder Offer", description: "Post-coaching/retreat upgrade to mastermind" },
    { destinationBuilder: "retreats", pushType: "quarterly-event", label: "Quarterly In-Person Event", description: "Shared event logistics for quarterly in-person days" },
  ],

  // ─── BUILDER 23: SPECIAL EDITIONS ─────────────────────────
  "special-editions": [
    { destinationBuilder: "website", pushType: "pre-order-page", label: "Pre-Order Page", description: "Limited edition sales page on microsite" },
    { destinationBuilder: "email-marketing", pushType: "launch-emails", label: "Limited Edition Campaign", description: "'Limited edition available' email campaign", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "scarcity-posts", label: "Scarcity-Driven Posts", description: "Scarcity-driven countdown posts" },
    { destinationBuilder: "book-sales", pushType: "event-tie-in", label: "Signed Copies at Events", description: "'Signed copies at the event' materials" },
  ],

  // ─── BUILDER 24: BOOK SALES EVENTS ────────────────────────
  "book-sales": [
    { destinationBuilder: "website", pushType: "event-page", label: "'Meet the Author' Page", description: "'Meet the author' event page" },
    { destinationBuilder: "email-marketing", pushType: "follow-up-emails", label: "Post-Event Nurture Emails", description: "Post-event email capture nurture", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "event-posts", label: "Event Announcement Posts", description: "Event announcement social posts" },
  ],

  // ─── BUILDER 25: CONVENTIONS/CONFERENCES ──────────────────
  "conventions": [
    { destinationBuilder: "keynotes", pushType: "speaker-proposal", label: "Shared Speaking Materials", description: "Speaker proposal shared with keynotes builder" },
    { destinationBuilder: "website", pushType: "conference-page", label: "Conference Landing Page", description: "Conference-specific landing page" },
    { destinationBuilder: "email-marketing", pushType: "post-conference", label: "Post-Conference Nurture", description: "Post-conference contact nurture", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "live-coverage", label: "Live Event Coverage", description: "Live event posts and recaps" },
  ],

  // ─── BUILDER 26: FUND RAISING ─────────────────────────────
  "fundraising": [
    { destinationBuilder: "website", pushType: "campaign-page", label: "Campaign/Donation Page", description: "Donation/campaign page on microsite" },
    { destinationBuilder: "email-marketing", pushType: "fundraising-emails", label: "Fundraising Campaign Emails", description: "Fundraising email campaign", destinationTable: "email_flows" },
    { destinationBuilder: "social-media", pushType: "cause-posts", label: "Cause-Driven Posts", description: "Cause-driven social posts" },
    { destinationBuilder: "jv-partnerships", pushType: "sponsor-proposals", label: "Sponsor Proposals", description: "Sponsor and partner proposals" },
  ],

  // ─── BUILDER 27: EXHIBITORS/JV ────────────────────────────
  "exhibitors": [
    { destinationBuilder: "jv-partnerships", pushType: "partnership-proposal", label: "Partnership Proposal", description: "Shared partnership framework" },
    { destinationBuilder: "social-media", pushType: "joint-campaigns", label: "Joint Campaign Posts", description: "Joint promotional campaign posts" },
    { destinationBuilder: "email-marketing", pushType: "co-marketing", label: "Co-Marketing Emails", description: "Joint email marketing campaigns" },
    { destinationBuilder: "conventions", pushType: "exhibition-assets", label: "Exhibition Assets", description: "Booth/display materials and assets" },
  ],
};

/**
 * Get all push definitions for a given source builder
 */
export function getPushesForBuilder(builderId: string): CrossBuilderPushDef[] {
  return CROSS_BUILDER_REGISTRY[builderId] || [];
}

/**
 * Get all pending pushes targeting a specific destination builder
 */
export function getIncomingPushDefs(destinationBuilderId: string): { sourceBuilder: string; push: CrossBuilderPushDef }[] {
  const incoming: { sourceBuilder: string; push: CrossBuilderPushDef }[] = [];
  for (const [source, pushes] of Object.entries(CROSS_BUILDER_REGISTRY)) {
    for (const push of pushes) {
      if (push.destinationBuilder === destinationBuilderId) {
        incoming.push({ sourceBuilder: source, push });
      }
    }
  }
  return incoming;
}

/**
 * Get the total number of outgoing connections for a builder
 */
export function getOutgoingCount(builderId: string): number {
  return (CROSS_BUILDER_REGISTRY[builderId] || []).length;
}

/**
 * Get all unique builders that feed into a given builder
 */
export function getSourceBuilders(destinationBuilderId: string): string[] {
  const sources = new Set<string>();
  for (const [source, pushes] of Object.entries(CROSS_BUILDER_REGISTRY)) {
    if (pushes.some(p => p.destinationBuilder === destinationBuilderId)) {
      sources.add(source);
    }
  }
  return Array.from(sources);
}
