import { motion } from "framer-motion";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2, Award,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Globe, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Sparkles, Lock,
} from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";

interface Node {
  id: string;
  label: string;
  icon: typeof BookOpen;
  section?: DashboardSection;
  description: string;
  status: "live" | "coming-soon" | "planned";
}

interface Step {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  ringColor: string;
  gradientFrom: string;
  gradientTo: string;
  nodes: Node[];
}

const steps: Step[] = [
  {
    id: "step-1",
    label: "A · Automate",
    subtitle: "Digital Products",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    ringColor: "ring-blue-500/30",
    gradientFrom: "from-blue-500",
    gradientTo: "to-blue-600",
    nodes: [
      { id: "social-media", label: "Social Media", icon: Share2, section: "social-media", description: "90-day AI content calendar from your book chapters — drive traffic & build authority.", status: "live" },
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Affiliate tracking links with commission structures — grow through partnerships.", status: "planned" },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "AI-generated conversion sequences in your checkout flow — maximize every sale.", status: "planned" },
      { id: "podcast-script", label: "Podcast Scripts", icon: Podcast, description: "AI-generated podcast episode scripts from your book chapters — content marketing.", status: "planned" },
      { id: "workbooks", label: "Workbooks", icon: FileText, section: "workbooks", description: "Companion workbook PDFs (40-80 pages) with exercises, templates & action plans.", status: "live" },
      { id: "webinars", label: "Webinars", icon: Video, section: "webinars", description: "Complete webinar scripts + slide decks + registration pages — sell live or recorded.", status: "live" },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, description: "Self-paced study guide with daily schedules — a structured learning experience.", status: "coming-soon" },
      { id: "audiobook", label: "Audiobook", icon: Headphones, description: "AI-generated audiobook scripts — author records or uses AI narration.", status: "coming-soon" },
      { id: "memberships", label: "Monthly Memberships", icon: CreditCard, section: "memberships", description: "3-tier membership system — Reader Circle, Pro, VIP — with gated content drip.", status: "planned" },
      { id: "courses", label: "Online Courses", icon: GraduationCap, section: "courses", description: "8-12 module structured courses — the biggest digital product to build later.", status: "coming-soon" },
    ],
  },
  {
    id: "step-2",
    label: "B · Build",
    subtitle: "Coaching & Consulting",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    ringColor: "ring-amber-500/30",
    gradientFrom: "from-amber-500",
    gradientTo: "to-amber-600",
    nodes: [
      { id: "coaching-1on1", label: "1-on-1 Coaching", icon: UserCheck, section: "coaching", description: "AI generates 6/12-session coaching programs with session outlines & client materials.", status: "live" },
      { id: "group-coaching", label: "Group Coaching", icon: Users, section: "group-coaching", description: "8-week group coaching curriculum with session agendas & participant workbooks.", status: "coming-soon" },
      { id: "big-ticket", label: "Big Ticket", icon: Trophy, section: "big-ticket", description: "Premium consulting packages ($5K–$25K) with application forms & VIP delivery.", status: "planned" },
      { id: "revenue-sharing", label: "Revenue Sharing / JV", icon: Handshake, description: "Partnership matching + contract templates — grow through collaboration.", status: "planned" },
      { id: "coaching-membership", label: "Coaching Membership", icon: CreditCard, description: "Monthly coaching tier — recurring revenue from ongoing client relationships.", status: "planned" },
    ],
  },
  {
    id: "step-3",
    label: "B · Broadcast",
    subtitle: "Speaking",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    ringColor: "ring-rose-500/30",
    gradientFrom: "from-rose-500",
    gradientTo: "to-rose-600",
    nodes: [
      { id: "keynotes", label: "Keynotes", icon: Mic, section: "speaking", description: "AI generates 3-5 keynote topics with slide decks — your signature talks.", status: "live" },
      { id: "podcast-guest", label: "Podcast Pitches", icon: Podcast, section: "podcast", description: "AI-generated podcast pitch kit — get booked as a guest expert.", status: "planned" },
      { id: "corporate-training", label: "Corporate Training", icon: Building2, section: "corporate-training", description: "Half/full-day corporate training programs with facilitator guides.", status: "planned" },
      { id: "jvs-speaking", label: "Joint Ventures", icon: Handshake, description: "JV proposals for co-hosting speaking events — leverage each other's audiences.", status: "planned" },
      { id: "book-sales-events", label: "Book Sales at Events", icon: BookOpen, description: "QR code order pages for book sales at live events — capture impulse buyers.", status: "planned" },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, description: "AI generates special edition proposals — signed copies, bundles, collector's.", status: "planned" },
      { id: "in-house-speaker", label: "In-House Speaker", icon: Presentation, description: "Corporate speaker profile + booking system — get hired for internal events.", status: "planned" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Fundraising event templates — use your author authority for causes.", status: "planned" },
      { id: "conventions", label: "Conventions", icon: Calendar, description: "Conference submission generator — get accepted to speak at industry events.", status: "planned" },
    ],
  },
  {
    id: "step-4",
    label: "Y · Yield",
    subtitle: "Seminars & Events",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    ringColor: "ring-emerald-500/30",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-emerald-600",
    nodes: [
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, section: "retreats", description: "2-3 day retreat programs with agendas, materials & registration.", status: "planned" },
      { id: "certification", label: "Certification Programs", icon: ShieldCheck, section: "certification", description: "Multi-module curriculum + exam + digital certificates — build an academy.", status: "planned" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, section: "masterminds", description: "Quarterly mastermind group programs with hot-seat format & accountability.", status: "planned" },
      { id: "exhibitors", label: "Exhibitors / JV", icon: Megaphone, description: "Exhibitor prospectus + partnership matching for your events.", status: "planned" },
    ],
  },
];

const statusStyles = {
  live: { badge: "Live", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
  "coming-soon": { badge: "Building", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

interface Props {
  stepId: string;
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
}

export default function StepDetailView({ stepId, onNavigate, isPremium }: Props) {
  const stepData = steps.find((s) => s.id === stepId);
  if (!stepData) return null;

  const stepIndex = steps.indexOf(stepData);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stepData.gradientFrom} ${stepData.gradientTo} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
          {stepIndex + 1}
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${stepData.color}`}>
            {stepData.label}
          </p>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{stepData.subtitle}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-medium rounded-full px-3 py-1 ${stepData.bgColor} ${stepData.color}`}>
            {stepData.nodes.length} products
          </span>
          {stepData.nodes.filter(n => n.status === "live").length > 0 && (
            <span className="text-xs font-medium rounded-full px-3 py-1 bg-green-500/15 text-green-700">
              {stepData.nodes.filter(n => n.status === "live").length} live
            </span>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stepData.nodes.map((node) => {
          const status = statusStyles[node.status];
          const canNavigate = node.section && node.status === "live";
          const Icon = node.icon;

          return (
            <motion.div
              key={node.id}
              className={`group relative rounded-xl border p-4 transition-all ${
                canNavigate
                  ? "border-border hover:border-muted-foreground/30 hover:shadow-md cursor-pointer"
                  : "border-border/50 opacity-75"
              }`}
              onClick={() => {
                if (canNavigate && node.section) onNavigate(node.section);
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={canNavigate ? { y: -2 } : {}}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${stepData.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${stepData.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm truncate">{node.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">{node.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${status.className}`}>
                      {status.badge}
                    </span>
                    {canNavigate && (
                      <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                    {!isPremium && node.section && (
                      <Lock className="h-3 w-3 text-muted-foreground/40 ml-auto" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
