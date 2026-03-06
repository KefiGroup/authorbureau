import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Globe, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Sparkles, X, Lock, DollarSign, Radio, Award,
} from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";
import ABBYFrameworkVisual from "@/components/dashboard/book-hub/ABBYFrameworkVisual";

interface Props {
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
  focusStep?: string;
}

interface Node {
  id: string;
  label: string;
  icon: typeof BookOpen;
  section?: DashboardSection;
  description: string;
  status: "live" | "coming-soon" | "planned";
}

interface Category {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  ringColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIcon: typeof DollarSign;
  nodes: Node[];
}

const categories: Category[] = [
  {
    id: "revenue-streams",
    label: "B · Build Authority",
    subtitle: "Digital assets & authority products from your book",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    ringColor: "ring-emerald-500/30",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-emerald-600",
    headerIcon: DollarSign,
    nodes: [
      { id: "workbooks", label: "Workbooks", icon: FileText, section: "workbooks", description: "Companion workbook PDFs (40-80 pages) with exercises, templates & action plans.", status: "live" },
      { id: "audiobook", label: "Audiobook", icon: Headphones, description: "AI-generated audiobook from your manuscript.", status: "coming-soon" },
      { id: "courses", label: "Online Courses", icon: GraduationCap, section: "courses", description: "8-12 module structured courses — highest revenue potential.", status: "coming-soon" },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, description: "Self-paced study guide with daily schedules.", status: "coming-soon" },
      { id: "webinars", label: "Webinars", icon: Video, section: "webinars", description: "Complete webinar scripts + slide decks + registration pages.", status: "live" },
      { id: "memberships", label: "Monthly Memberships", icon: CreditCard, section: "memberships", description: "3-tier membership — Reader Circle, Pro, VIP — with gated content drip.", status: "planned" },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "AI-generated conversion sequences.", status: "planned" },
      { id: "certification", label: "Certification Programs", icon: ShieldCheck, section: "certification", description: "Multi-module curriculum + exam + digital certificates.", status: "planned" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, section: "masterminds", description: "Quarterly mastermind group programs.", status: "planned" },
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, section: "retreats", description: "2-3 day retreat programs with agendas & registration.", status: "planned" },
    ],
  },
  {
    id: "marketing-channels",
    label: "B · Bridge Channels",
    subtitle: "Marketing channels & audience connections",
    color: "text-violet-600",
    bgColor: "bg-violet-500/10",
    ringColor: "ring-violet-500/30",
    gradientFrom: "from-violet-500",
    gradientTo: "to-violet-600",
    headerIcon: Radio,
    nodes: [
      { id: "social-media", label: "Social Media", icon: Share2, section: "social-media", description: "90-day AI content calendar from your book chapters.", status: "live" },
      { id: "podcast-script", label: "Podcast Scripts", icon: Podcast, description: "AI-generated podcast episode scripts.", status: "planned" },
      { id: "podcast-guest", label: "Podcast Pitches", icon: Podcast, section: "podcast", description: "AI-generated podcast pitch kit — get booked.", status: "planned" },
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Affiliate tracking links with commissions.", status: "planned" },
      { id: "book-sales-events", label: "Book Sales at Events", icon: BookOpen, description: "QR code order pages for live events.", status: "planned" },
      { id: "conventions", label: "Conventions", icon: Calendar, description: "Conference submission generator.", status: "planned" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Fundraising event templates.", status: "planned" },
      { id: "jvs", label: "Joint Ventures", icon: Handshake, description: "JV proposals for co-hosting events.", status: "planned" },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, description: "Signed copies, bundles, collector's editions.", status: "planned" },
    ],
  },
  {
    id: "authority-builders",
    label: "Y · Yield Revenue",
    subtitle: "Premium revenue streams & high-value monetization",
    color: "text-sky-600",
    bgColor: "bg-sky-500/10",
    ringColor: "ring-sky-500/30",
    gradientFrom: "from-sky-500",
    gradientTo: "to-sky-600",
    headerIcon: Award,
    nodes: [
      { id: "coaching-1on1", label: "1-on-1 Coaching", icon: UserCheck, section: "coaching", description: "AI generates 6/12-session coaching programs.", status: "live" },
      { id: "group-coaching", label: "Group Coaching", icon: Users, section: "group-coaching", description: "8-week group coaching curriculum.", status: "coming-soon" },
      { id: "big-ticket", label: "Big Ticket Consulting", icon: Trophy, section: "big-ticket", description: "Premium consulting packages ($5K–$25K).", status: "planned" },
      { id: "coaching-membership", label: "Coaching Membership", icon: CreditCard, description: "Monthly coaching tier — recurring revenue.", status: "planned" },
      { id: "keynotes", label: "Keynotes", icon: Mic, section: "speaking", description: "AI generates 3-5 keynote topics with slide decks.", status: "live" },
      { id: "corporate-training", label: "Corporate Training", icon: Building2, section: "corporate-training", description: "Half/full-day corporate training programs.", status: "planned" },
      { id: "in-house-speaker", label: "In-House Speaker", icon: Presentation, description: "Corporate speaker profile + booking system.", status: "planned" },
      { id: "revenue-sharing", label: "Revenue Sharing / JV", icon: Handshake, description: "Partnership matching + contract templates.", status: "planned" },
      { id: "exhibitors", label: "Exhibitors / JV", icon: Megaphone, description: "Exhibitor prospectus + partnership matching.", status: "planned" },
    ],
  },
];

const statusStyles = {
  live: { badge: "Live", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
  "coming-soon": { badge: "Building", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

export default function BusinessFramework({ onNavigate, isPremium, focusStep }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(focusStep || null);
  useEffect(() => { if (focusStep) setActiveCategory(focusStep); }, [focusStep]);
  const activeCatData = categories.find((c) => c.id === activeCategory);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">
          Your <span className="text-gradient-gold">Monetization Framework</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Revenue Streams · Marketing Channels · Authority Builders — your complete journey from published author to thriving business owner.
        </p>
      </div>

      {/* ═══ PHASE 1: FOUNDATION (FREE) ═══ */}
      <motion.div
        className="rounded-2xl border border-border bg-card p-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-500/10 rounded-full px-3 py-1">
            Foundation · Free
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border p-4 bg-muted/30">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm">Your Published Book</p>
              <p className="text-[11px] text-muted-foreground">The hook that starts everything</p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 rounded-xl border border-border p-4 bg-muted/30 cursor-pointer hover:border-muted-foreground/30 hover:shadow-sm transition-all"
            onClick={() => onNavigate("my-books")}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm">Book Microsite</p>
              <p className="text-[11px] text-muted-foreground">Your live landing page & sales hub</p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 rounded-xl border border-border p-4 bg-muted/30 cursor-pointer hover:border-muted-foreground/30 hover:shadow-sm transition-all"
            onClick={() => onNavigate("profile")}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <UserCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm">Author Profile</p>
              <p className="text-[11px] text-muted-foreground">Your public credibility page</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          ✓ Already included — your book, microsite, and author profile are live and working for you.
        </p>
      </motion.div>

      {/* Connector */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-px h-6 bg-gradient-to-b from-border to-muted-foreground/20" />
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 rotate-90" />
      </div>

      {/* ═══ PHASE 3: MONETIZATION MAP ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
            Your Monetization Map
          </span>
        </div>

        <ABBYFrameworkVisual
          hasConsultation={true}
          onConsultAbby={() => onNavigate("build-business")}
          onNavigateTab={(tab) => {
            setActiveCategory(tab);
          }}
        />
      </motion.div>

      {/* Expanded Category Detail Panel */}
      <AnimatePresence mode="wait">
        {activeCatData && (
          <motion.div
            key={activeCatData.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={`rounded-2xl border-2 ${activeCatData.ringColor} border-transparent ring-1 p-6 md:p-8 bg-card shadow-lg`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeCatData.gradientFrom} ${activeCatData.gradientTo} flex items-center justify-center text-white`}>
                    <activeCatData.headerIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold">{activeCatData.label}</h2>
                    <p className="text-xs text-muted-foreground">{activeCatData.subtitle}</p>
                  </div>
                </div>
                <button onClick={() => setActiveCategory(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeCatData.nodes.map((node) => (
                  <NodeCard key={node.id} node={node} category={activeCatData} onNavigate={onNavigate} isPremium={isPremium} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey Summary */}
      <motion.div
        className="rounded-xl bg-muted/30 border border-border p-5 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
          <strong>Your monetization journey:</strong> <strong>Build</strong> authority & digital assets from your book →
          <strong>Bridge</strong> marketing channels & connections →
          <strong>Yield</strong> revenue streams & monetize your expertise.
          <br />
          <span className="text-secondary font-medium">Abby will guide you through every step — turning your book into a business with {categories.reduce((s, c) => s + c.nodes.length, 0)} revenue streams.</span>
        </p>
      </motion.div>
    </div>
  );
}

/* ─── Individual Node Card ─── */
function NodeCard({
  node, category, onNavigate, isPremium,
}: {
  node: Node;
  category: Category;
  onNavigate: (s: DashboardSection | string) => void;
  isPremium: boolean;
}) {
  const status = statusStyles[node.status];
  const canNavigate = node.section && node.status === "live";
  const Icon = node.icon;

  return (
    <motion.div
      className={`group relative rounded-xl border p-4 transition-all ${
        canNavigate
          ? "border-border hover:border-muted-foreground/30 hover:shadow-md cursor-pointer"
          : "border-border/50 opacity-75"
      }`}
      onClick={() => {
        if (canNavigate && node.section) onNavigate(node.section);
      }}
      whileHover={canNavigate ? { y: -1 } : {}}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg ${category.bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${category.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{node.label}</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{node.description}</p>
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
}
