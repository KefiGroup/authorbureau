// Single source of truth for the per-node Marketing Asset Pack.
// Used by generate-asset-pack (server) and AuthorLibrary UI (mirrored in src/lib).

export interface AssetPackSpec {
  node_id: string;
  node_name: string;
  bonus_type: string;        // machine key for the bonus asset
  bonus_label: string;       // human label shown in Library
  bonus_prompt: string;      // appended to AI prompt for the bonus asset
  social_tone: string;       // tone hint for the 3 social posts
}

export const ASSET_PACK_REGISTRY: Record<string, AssetPackSpec> = {
  // ---- BRAND PRODUCTS ----
  "BP-01": { node_id: "BP-01", node_name: "Email Marketing", bonus_type: "welcome_sequence_calendar", bonus_label: "30-Day Email Calendar", bonus_prompt: "Produce a 30-day email send calendar (subject + one-line angle per day) for promoting this email program.", social_tone: "value-first, list-building" },
  "BP-02": { node_id: "BP-02", node_name: "Lead Magnet", bonus_type: "opt_in_swipe", bonus_label: "Opt-in Ad Swipe Pack", bonus_prompt: "Produce 5 paid-ad headlines + 5 ad body copies (Meta + Google) tailored to this lead magnet.", social_tone: "curiosity-driven, free-resource" },
  "BP-03": { node_id: "BP-03", node_name: "Social Media", bonus_type: "30_day_content_calendar", bonus_label: "30-Day Social Calendar", bonus_prompt: "Produce a 30-day social content calendar with one post idea per day across LinkedIn, Instagram, and X.", social_tone: "personality-led, platform-native" },
  "BP-04": { node_id: "BP-04", node_name: "Author Website", bonus_type: "homepage_cro_review", bonus_label: "Homepage Conversion Tips", bonus_prompt: "Produce a 7-point homepage conversion-rate optimization checklist tailored to this author's positioning.", social_tone: "credibility, brand-building" },
  "BP-05": { node_id: "BP-05", node_name: "Webinar", bonus_type: "webinar_promo_sequence", bonus_label: "5-Email Webinar Promo Sequence", bonus_prompt: "Produce a 5-email registration sequence (T-7, T-3, T-1, day-of, replay) for promoting this webinar.", social_tone: "event-driven, FOMO" },
  "BP-06": { node_id: "BP-06", node_name: "Workbook", bonus_type: "5_day_challenge", bonus_label: "5-Day Email Challenge", bonus_prompt: "Produce a 5-day email mini-challenge that walks readers through the workbook, one chapter per day.", social_tone: "transformation, action-oriented" },
  "BP-07": { node_id: "BP-07", node_name: "Coaching Package", bonus_type: "discovery_call_script", bonus_label: "Discovery Call Script", bonus_prompt: "Produce a 30-minute discovery call script (questions + objection responses + close) for selling this coaching package.", social_tone: "transformational, premium" },
  "BP-08": { node_id: "BP-08", node_name: "Mastermind", bonus_type: "application_funnel_pack", bonus_label: "Application Funnel Pack", bonus_prompt: "Produce a 7-question application form + auto-responder email + scheduling page copy for this mastermind.", social_tone: "exclusive, peer-elevation" },
  "BP-09": { node_id: "BP-09", node_name: "Speaking Topics", bonus_type: "speaker_one_pager", bonus_label: "Speaker One-Pager", bonus_prompt: "Produce a printable speaker one-pager: photo placeholder, 3 signature topics, bio, fee range hint, contact CTA.", social_tone: "authority, stage-presence" },

  // ---- BUILD AUTHORITY ----
  "BA-10": { node_id: "BA-10", node_name: "Online Course", bonus_type: "course_launch_sequence", bonus_label: "7-Email Course Launch Sequence", bonus_prompt: "Produce a 7-email open-cart launch sequence (announce, story, content, FAQ, social proof, scarcity, last call).", social_tone: "transformation, results-led" },
  "BA-11": { node_id: "BA-11", node_name: "Audiobook", bonus_type: "audiogram_brief", bonus_label: "Audiogram Brief", bonus_prompt: "Produce 3 x 60-second audiogram scripts (hook + key idea + CTA) plus a cover-art image prompt for each.", social_tone: "intimate, listener-first" },
  "BA-12": { node_id: "BA-12", node_name: "Membership", bonus_type: "founding_members_invite", bonus_label: "Founding Members Invite Pack", bonus_prompt: "Produce a founding-members invitation email + 3 DM templates + a 'why join now' one-pager.", social_tone: "community, belonging" },
  "BA-13": { node_id: "BA-13", node_name: "Group Coaching", bonus_type: "cohort_launch_pack", bonus_label: "Cohort Launch Pack", bonus_prompt: "Produce a cohort-launch email sequence (5 emails) + an enrollment FAQ + one cart-close email.", social_tone: "transformation, peer-cohort" },
  "BA-14": { node_id: "BA-14", node_name: "Podcast", bonus_type: "podcast_launch_kit", bonus_label: "Podcast Launch Kit", bonus_prompt: "Produce a podcast launch kit: trailer script, episode-1 show notes, 5 guest pitch templates, 3 audiograms briefs.", social_tone: "conversational, expertise" },
  "BA-15": { node_id: "BA-15", node_name: "Affiliate Program", bonus_type: "affiliate_swipe_pack", bonus_label: "Affiliate Swipe Pack", bonus_prompt: "Produce 3 affiliate-recruitment emails + 5 ready-to-post social messages your affiliates can copy-paste.", social_tone: "partnership, revenue-share" },
  "BA-16": { node_id: "BA-16", node_name: "Media & PR", bonus_type: "press_kit_one_pager", bonus_label: "Press Kit One-Pager", bonus_prompt: "Produce a printable press one-pager: bio, 3 interview topics, 5 sample interview questions, contact block.", social_tone: "credibility, newsroom-ready" },
  "BA-17": { node_id: "BA-17", node_name: "Upsells", bonus_type: "upsell_offer_stack", bonus_label: "Upsell Offer Stack", bonus_prompt: "Produce a 3-tier upsell offer stack (order bump + OTO1 + OTO2) with copy for each.", social_tone: "value-stack, ROI" },
  "BA-18": { node_id: "BA-18", node_name: "JV Partnerships", bonus_type: "jv_pitch_pack", bonus_label: "JV Pitch Pack", bonus_prompt: "Produce a JV pitch deck outline + a 'what's in it for you' email + a 1-page deal sheet.", social_tone: "B2B, win-win" },

  // ---- YIELD REVENUE ----
  "YR-19": { node_id: "YR-19", node_name: "1:1 Coaching", bonus_type: "premium_intake_pack", bonus_label: "Premium Intake Pack", bonus_prompt: "Produce a high-touch intake questionnaire + welcome email + onboarding call agenda for a $5K+ engagement.", social_tone: "premium, results-guarantee" },
  "YR-20": { node_id: "YR-20", node_name: "Big-Ticket / B2B", bonus_type: "b2b_one_pager", bonus_label: "B2B One-Pager (PDF brief)", bonus_prompt: "Produce a B2B one-pager: problem, solution, deliverables, case study placeholder, pricing band, contact.", social_tone: "executive, ROI-focused" },
  "YR-21": { node_id: "YR-21", node_name: "Speaking", bonus_type: "speaker_reel_storyboard", bonus_label: "Speaker Reel Storyboard", bonus_prompt: "Produce a 90-second speaker reel storyboard (shot list + voice-over) plus a one-page sizzle pitch.", social_tone: "stage-presence, authority" },
  "YR-22": { node_id: "YR-22", node_name: "Corporate Training", bonus_type: "rfp_brief", bonus_label: "Procurement / RFP Brief", bonus_prompt: "Produce a procurement-ready RFP-response brief: outcomes, modules, durations, certifications, pricing logic.", social_tone: "L&D, enterprise" },
  "YR-23": { node_id: "YR-23", node_name: "Mastermind (Premium)", bonus_type: "premium_application_pack", bonus_label: "Premium Application Pack", bonus_prompt: "Produce an application form + private invite email + member agreement summary for a $25K+ mastermind.", social_tone: "elite, peer-circle" },
  "YR-24": { node_id: "YR-24", node_name: "Retreat", bonus_type: "retreat_brochure_outline", bonus_label: "Retreat Brochure Outline", bonus_prompt: "Produce a retreat brochure outline: location, daily agenda, what's included, transformation promise, deposit terms.", social_tone: "experiential, transformational" },
  "YR-25": { node_id: "YR-25", node_name: "Certification", bonus_type: "certification_curriculum_brief", bonus_label: "Certification Curriculum Brief", bonus_prompt: "Produce a certification overview brief: levels, hours, exam format, accreditation language, pricing tiers.", social_tone: "credential, career-impact" },
  "YR-26": { node_id: "YR-26", node_name: "Conference", bonus_type: "conference_promo_pack", bonus_label: "Conference Promo Pack", bonus_prompt: "Produce 3 promo emails + 5 social posts + a sponsor one-pager for the conference.", social_tone: "event, community" },
  "YR-27": { node_id: "YR-27", node_name: "Fundraising", bonus_type: "donor_appeal_pack", bonus_label: "Donor Appeal Pack", bonus_prompt: "Produce a 3-email donor appeal sequence + a one-page case-for-support brief.", social_tone: "mission-driven, impact" },
  "YR-28": { node_id: "YR-28", node_name: "Sponsors", bonus_type: "sponsor_prospectus", bonus_label: "Sponsor Prospectus", bonus_prompt: "Produce a sponsor prospectus outline: audience demographics, package tiers, deliverables, pricing, sample logos block.", social_tone: "B2B sponsorship, brand-alignment" },
};

export function getAssetPackSpec(nodeId: string): AssetPackSpec | null {
  return ASSET_PACK_REGISTRY[nodeId] ?? null;
}
