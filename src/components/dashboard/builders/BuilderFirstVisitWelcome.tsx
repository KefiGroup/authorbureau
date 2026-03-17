import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BuilderFirstVisitConfig {
  emoji: string;
  category: "BRAND" | "BUILD" | "YIELD";
  revenue: string;
  connectsTo: string[];
  connectLabels: string[];
  pitch: string;
}

export const BUILDER_FIRST_VISIT: Record<string, BuilderFirstVisitConfig> = {
  // BRAND (9)
  workbook: {
    emoji: "📝",
    category: "BRAND",
    revenue: "$1,000–$8,000/yr",
    connectsTo: ["email-flows", "website", "upsell"],
    connectLabels: ["Email Marketing — I'll create a sales sequence", "Website — I'll add a product page", "Upsells — I'll design a premium upgrade offer"],
    pitch: "Workbooks are the easiest digital product to create. I'll turn your book's exercises into a downloadable workbook in minutes.",
  },
  "home-study-course": {
    emoji: "📦",
    category: "BUILD",
    revenue: "$1,500–$12,000/yr",
    connectsTo: ["email-flows", "website", "online-course"],
    connectLabels: ["Email Marketing — I'll create a nurture sequence", "Website — I'll add a sales page", "Online Course — natural upgrade path"],
    pitch: "Home Study Courses are premium self-paced kits. Think of it as a 'box set' version of your book with videos, worksheets, and templates.",
  },
  "online-course": {
    emoji: "🎓",
    category: "BUILD",
    revenue: "$2,000–$15,000/yr",
    connectsTo: ["email-flows", "website", "upsell", "workbook"],
    connectLabels: ["Email Marketing — I'll create a 7-email sales sequence", "Website — I'll add a sales page", "Upsells — I'll design a premium upgrade", "Workbook — companion product"],
    pitch: "Online courses are the #1 revenue stream for non-fiction authors. I'll design the entire curriculum from your book.",
  },
  "book-sales": {
    emoji: "📚",
    category: "BUILD",
    revenue: "$500–$5,000/yr",
    connectsTo: ["website", "email-flows", "special-editions"],
    connectLabels: ["Website — I'll add a purchase page", "Email Marketing — event follow-up sequences", "Special Editions — premium versions"],
    pitch: "Let's maximize your book sales with strategic pricing, bundles, and event sales strategies.",
  },
  "special-editions": {
    emoji: "✨",
    category: "BUILD",
    revenue: "$500–$4,000/yr",
    connectsTo: ["website", "book-sales", "email-flows"],
    connectLabels: ["Website — I'll showcase premium versions", "Book Sales — bundle with standard editions", "Email Marketing — VIP announcement emails"],
    pitch: "Special editions command premium prices. I'll help you create signed, annotated, or collector's versions.",
  },
  "social-media": {
    emoji: "📱",
    category: "BUILD",
    revenue: "Indirect (drives traffic)",
    connectsTo: ["website", "email-flows", "lead-magnet"],
    connectLabels: ["Website — drives traffic to your hub", "Email Marketing — grows your subscriber list", "Lead Magnet — promotes free downloads"],
    pitch: "I'll create a 90-day content calendar that promotes all your products across every platform.",
  },
  "email-flows": {
    emoji: "📧",
    category: "BUILD",
    revenue: "$1,940/yr+ (amplifier)",
    connectsTo: ["online-course", "webinar", "coaching-1on1", "membership"],
    connectLabels: ["Online Courses — launch sequences", "Webinars — registration sequences", "Coaching — nurture to high-ticket", "Memberships — onboarding flows"],
    pitch: "Email is the engine that sells everything else. I'll build nurture sequences for every product you create.",
  },
  website: {
    emoji: "🌐",
    category: "BUILD",
    revenue: "Indirect (hub)",
    connectsTo: [],
    connectLabels: ["All Products — central sales hub for everything you build"],
    pitch: "Your website is the hub where all traffic converts. I'll build your author site with sales pages for every product.",
  },
  "lead-magnet": {
    emoji: "🧲",
    category: "BUILD",
    revenue: "Indirect (list building)",
    connectsTo: ["email-flows", "website", "online-course"],
    connectLabels: ["Email Marketing — feeds your subscriber list", "Website — opt-in form integration", "Online Course — free-to-paid funnel"],
    pitch: "I'll create an irresistible free download from your book that builds your email list on autopilot.",
  },
  // BRIDGE (8)
  audiobook: {
    emoji: "🎧",
    category: "BRIDGE",
    revenue: "$1,000–$8,000/yr",
    connectsTo: ["book-sales", "website", "email-flows"],
    connectLabels: ["Book Sales — cross-promote formats", "Website — audio player embed", "Email Marketing — launch announcement"],
    pitch: "Audiobooks are the fastest-growing format. I'll prepare your manuscript for professional narration.",
  },
  podcast: {
    emoji: "🎙️",
    category: "BRIDGE",
    revenue: "Indirect (authority)",
    connectsTo: ["website", "email-flows", "book-sales"],
    connectLabels: ["Website — episode player and show notes", "Email Marketing — subscriber growth", "Book Sales — listener conversions"],
    pitch: "I'll create your podcast pitch kit — bio, talking points, and a list of relevant shows to pitch.",
  },
  webinar: {
    emoji: "📹",
    category: "BRIDGE",
    revenue: "$3,000–$25,000/yr",
    connectsTo: ["online-course", "email-flows", "upsell"],
    connectLabels: ["Online Courses — webinar sells your course", "Email Marketing — registration + follow-up", "Upsells — one-time offers during webinar"],
    pitch: "Webinars convert at 5–15% — the highest of any channel. I'll write your webinar script and slide deck.",
  },
  membership: {
    emoji: "🔄",
    category: "BRIDGE",
    revenue: "$3,000–$36,000/yr",
    connectsTo: ["email-flows", "online-course", "group-coaching"],
    connectLabels: ["Email Marketing — onboarding sequences", "Online Course — premium tier content", "Group Coaching — upgrade path"],
    pitch: "Monthly memberships create predictable recurring revenue. I'll design your membership tiers and content calendar.",
  },
  "coaching-1on1": {
    emoji: "👤",
    category: "YIELD",
    revenue: "$6,000–$48,000/yr",
    connectsTo: ["group-coaching", "big-ticket", "email-flows"],
    connectLabels: ["Group Coaching — scale your time", "Consulting — premium engagements", "Email Marketing — nurture high-ticket leads"],
    pitch: "1-on-1 coaching is the highest per-hour revenue stream. I'll design your coaching packages and intake process.",
  },
  "group-coaching": {
    emoji: "👥",
    category: "YIELD",
    revenue: "$6,000–$50,000/yr",
    connectsTo: ["membership", "mastermind", "online-course"],
    connectLabels: ["Memberships — community upsell", "Masterminds — premium peer groups", "Online Course — self-paced alternative"],
    pitch: "Group coaching scales your time. I'll design your program structure, pricing, and enrollment funnel.",
  },
  speaking: {
    emoji: "🎤",
    category: "YIELD",
    revenue: "$5,000–$60,000/yr",
    connectsTo: ["big-ticket", "corporate-training", "book-sales"],
    connectLabels: ["Consulting — back-of-room consulting offer", "Training Programs — follow-up corporate pitch", "Book Sales — bulk sales for event organizers"],
    pitch: "Keynote speakers earn $5K–$25K per talk. I'll write your signature keynote and speaker one-sheet.",
  },
  "corporate-training": {
    emoji: "🏫",
    category: "YIELD",
    revenue: "$5,000–$50,000/yr",
    connectsTo: ["big-ticket", "certification", "speaking"],
    connectLabels: ["Consulting — premium follow-on", "Certification — license your methodology", "Keynotes — opens corporate doors"],
    pitch: "Corporate training programs are high-value, repeatable engagements. I'll design your curriculum and pricing.",
  },
  "training-programs": {
    emoji: "🏫",
    category: "YIELD",
    revenue: "$5,000–$50,000/yr",
    connectsTo: ["big-ticket", "certification", "speaking"],
    connectLabels: ["Consulting — premium follow-on", "Certification — license your methodology", "Keynotes — opens corporate doors"],
    pitch: "Training programs create recurring revenue through licensing. I'll design your program and materials.",
  },
  mastermind: {
    emoji: "🧠",
    category: "YIELD",
    revenue: "$10,000–$120,000/yr",
    connectsTo: ["retreat", "certification", "big-ticket"],
    connectLabels: ["Retreats — in-person mastermind gatherings", "Certification — license to facilitators", "Consulting — premium 1-on-1 engagements"],
    pitch: "Masterminds are the highest-leverage group format. I'll design your structure, pricing, and application process.",
  },
  retreat: {
    emoji: "🏝️",
    category: "YIELD",
    revenue: "$5,000–$80,000/yr",
    connectsTo: ["mastermind", "certification", "speaking"],
    connectLabels: ["Masterminds — immersive gatherings", "Certification — training intensives", "Keynotes — retreat keynote sessions"],
    pitch: "Retreats create transformational experiences. I'll plan your retreat agenda, venue requirements, and pricing.",
  },
  certification: {
    emoji: "🎓",
    category: "YIELD",
    revenue: "$3,000–$50,000/yr",
    connectsTo: ["training-programs", "mastermind", "big-ticket"],
    connectLabels: ["Training Programs — certified facilitators", "Masterminds — certified peer leaders", "Consulting — certified practitioners"],
    pitch: "License your methodology to others. I'll design your certification program, curriculum, and agreement.",
  },
  "big-ticket": {
    emoji: "💼",
    category: "YIELD",
    revenue: "$5,000–$75,000/yr",
    connectsTo: ["speaking", "training-programs", "website"],
    connectLabels: ["Keynotes — speaking leads to consulting", "Training Programs — organizational engagements", "Website — premium services page"],
    pitch: "Big ticket consulting turns your expertise into premium engagements. I'll create your consulting packages and proposals.",
  },
  conventions: {
    emoji: "🏛️",
    category: "YIELD",
    revenue: "$5,000–$60,000/yr",
    connectsTo: ["speaking", "exhibitors-jv", "book-sales"],
    connectLabels: ["Keynotes — headline your own event", "Exhibitors — booth fee revenue", "Book Sales — event merchandise"],
    pitch: "Host your own conference or convention. I'll plan the event structure, sponsorship packages, and ticket pricing.",
  },
  fundraising: {
    emoji: "❤️",
    category: "YIELD",
    revenue: "Variable",
    connectsTo: ["conventions", "book-sales", "email-flows"],
    connectLabels: ["Conventions — fundraising galas", "Book Sales — cause-driven campaigns", "Email Marketing — donor engagement"],
    pitch: "Turn your book's mission into a cause. I'll design your fundraising campaign and donor engagement strategy.",
  },
  "exhibitors-jv": {
    emoji: "🎪",
    category: "YIELD",
    revenue: "$2,000–$30,000/yr",
    connectsTo: ["conventions", "affiliate", "partnership"],
    connectLabels: ["Conventions — booth exhibition", "Affiliates — partner cross-promotion", "Revenue Sharing — JV partnerships"],
    pitch: "Exhibitor booths and JV partnerships at events. I'll create your booth strategy and partner outreach.",
  },
  affiliate: {
    emoji: "🤝",
    category: "BRIDGE",
    revenue: "$1,000–$10,000/yr",
    connectsTo: ["online-course", "membership", "website"],
    connectLabels: ["Online Courses — affiliate promotion", "Memberships — referral commissions", "Website — tracking integration"],
    pitch: "Let others sell your products for a commission. I'll set up tracking links and partner outreach templates.",
  },
  partnership: {
    emoji: "💰",
    category: "BRIDGE",
    revenue: "$1,000–$15,000/yr",
    connectsTo: ["affiliate", "webinar", "online-course"],
    connectLabels: ["Affiliates — mutual promotion", "Webinars — co-hosted events", "Online Courses — bundled offerings"],
    pitch: "I'll identify complementary authors for joint ventures and create partnership proposals.",
  },
  upsell: {
    emoji: "⬆️",
    category: "BRIDGE",
    revenue: "$2,000–$20,000/yr",
    connectsTo: ["online-course", "coaching-1on1", "membership"],
    connectLabels: ["Online Courses — premium tier upgrade", "Coaching — checkout upsell to sessions", "Memberships — annual plan upgrade"],
    pitch: "I'll design your checkout upsells using Russell Brunson's proven Value Ladder model.",
  },
  licensing: {
    emoji: "📄",
    category: "YIELD",
    revenue: "$3,000–$50,000/yr",
    connectsTo: ["certification", "training-programs", "big-ticket"],
    connectLabels: ["Certification — licensed practitioners", "Training — organizational licenses", "Consulting — IP licensing deals"],
    pitch: "License your intellectual property for passive income. I'll design licensing agreements and pricing.",
  },
  community: {
    emoji: "🫂",
    category: "BRIDGE",
    revenue: "$1,000–$20,000/yr",
    connectsTo: ["membership", "group-coaching", "email-flows"],
    connectLabels: ["Memberships — community hub", "Group Coaching — support community", "Email Marketing — engagement driver"],
    pitch: "Build a thriving community around your book's ideas. I'll design your community structure and engagement strategy.",
  },
  "revenue-share": {
    emoji: "💰",
    category: "YIELD",
    revenue: "$1,000–$15,000/yr",
    connectsTo: ["affiliate", "partnership", "online-course"],
    connectLabels: ["Affiliates — revenue split", "Partnerships — JV deals", "Online Courses — co-created products"],
    pitch: "Revenue sharing agreements create win-win partnerships. I'll design your deal structure and terms.",
  },
  "white-label": {
    emoji: "🏷️",
    category: "YIELD",
    revenue: "$5,000–$50,000/yr",
    connectsTo: ["certification", "licensing", "training-programs"],
    connectLabels: ["Certification — branded delivery", "Licensing — white-label agreements", "Training — branded programs"],
    pitch: "White-label your content for organizations to rebrand. I'll design the package and pricing.",
  },
  events: {
    emoji: "📅",
    category: "YIELD",
    revenue: "$3,000–$40,000/yr",
    connectsTo: ["speaking", "retreat", "conventions"],
    connectLabels: ["Keynotes — event headliner", "Retreats — immersive events", "Conventions — large-scale gatherings"],
    pitch: "Host events that bring your community together. I'll design the event format, pricing, and marketing.",
  },
  franchise: {
    emoji: "🏢",
    category: "YIELD",
    revenue: "$10,000–$100,000/yr",
    connectsTo: ["certification", "training-programs", "licensing"],
    connectLabels: ["Certification — franchisee training", "Training — delivery standards", "Licensing — franchise agreements"],
    pitch: "A franchise model scales your methodology through trained practitioners. This is legacy-building territory.",
  },
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  BUILD: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/30" },
  BRIDGE: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/30" },
  YIELD: { bg: "bg-[hsl(45,50%,54%)]/10", text: "text-[hsl(45,50%,54%)]", border: "border-[hsl(45,50%,54%)]/30" },
};

interface Props {
  builderId: string;
  builderLabel: string;
  onDismiss: () => void;
  onStartBuilding?: () => void;
}

export default function BuilderFirstVisitWelcome({ builderId, builderLabel, onDismiss, onStartBuilding }: Props) {
  const config = BUILDER_FIRST_VISIT[builderId];
  if (!config) return null;

  const colors = categoryColors[config.category];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-3`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-bold text-foreground">
          {config.emoji} Welcome to the {builderLabel}!
        </p>
        <button onClick={onDismiss} className="text-[10px] text-muted-foreground hover:text-foreground shrink-0">
          Dismiss
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{config.pitch}</p>

      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
        {config.category} · {config.revenue}
      </div>

      {config.connectLabels.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Auto-connects to:</p>
          <ul className="space-y-0.5">
            {config.connectLabels.map((label, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <span className="text-foreground/40 mt-0.5">•</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {onStartBuilding && (
          <Button size="sm" onClick={onStartBuilding} className="h-7 text-xs bg-[hsl(45,50%,54%)] hover:bg-[hsl(45,50%,46%)] text-[hsl(228,34%,16%)] font-bold rounded-lg">
            Let's Build It <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
        <a
          href="/how-it-works"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          Learn about 28 revenue streams <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="text-[9px] text-muted-foreground/50 italic">
        Projected revenue based on Authors Guild, Teachable, ICF &amp; NSA industry surveys. Individual results vary.
      </p>
    </div>
  );
}

/** Check if this builder's first visit has been seen */
export function hasSeenBuilderFirstVisit(builderId: string): boolean {
  return localStorage.getItem(`abby_builder_first_visit_${builderId}`) === "true";
}

/** Mark this builder's first visit as seen */
export function markBuilderFirstVisitSeen(builderId: string): void {
  localStorage.setItem(`abby_builder_first_visit_${builderId}`, "true");
}
