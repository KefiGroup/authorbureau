import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2, Award,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Globe, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Sparkles, X, ChevronRight, Lock,
} from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";

interface Props {
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
}

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
  color: string;     // tailwind text color
  bgColor: string;   // tailwind bg color
  ringColor: string;
  gradientFrom: string;
  gradientTo: string;
  nodes: Node[];
}

const steps: Step[] = [
  {
    id: "step-1",
    label: "Step 1",
    subtitle: "Digital Products",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    ringColor: "ring-blue-500/30",
    gradientFrom: "from-blue-500",
    gradientTo: "to-blue-600",
    nodes: [
      // FREE / Marketing
      { id: "social-media", label: "Social Media", icon: Share2, section: "social-media", description: "90-day AI content calendar from your book chapters — drive traffic & build authority.", status: "live" },
      { id: "website", label: "Website / Microsite", icon: Globe, description: "Your author microsite — already built automatically from your book data.", status: "live" },
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
    label: "Step 2",
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
    label: "Step 3",
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
    label: "Step 4",
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

export default function BusinessFramework({ onNavigate, isPremium }: Props) {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const activeStepData = steps.find((s) => s.id === activeStep);

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">
          Your <span className="text-gradient-gold">4-Step</span> Business Framework
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          One book becomes <strong>27 revenue streams</strong>. Click each step to explore the products & services AI can generate from your manuscript.
        </p>
      </div>

      {/* Central Visual Framework */}
      <div className="relative">
        {/* The Book — Center */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <BookOpen className="h-10 w-10 md:h-12 md:w-12 text-primary-foreground" />
            </div>
            <div className="mt-3 text-center">
              <p className="font-heading text-lg font-bold">Your Book</p>
              <p className="text-xs text-muted-foreground">The foundation of everything</p>
            </div>
          </motion.div>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id;
            const liveCount = step.nodes.filter((n) => n.status === "live").length;
            const totalCount = step.nodes.length;



            return (
              <motion.button
                key={step.id}
                onClick={() => setActiveStep(isActive ? null : step.id)}
                className={`relative group rounded-2xl border-2 p-5 md:p-6 text-left transition-all duration-300 ${
                  isActive
                    ? `${step.ringColor} ring-2 border-transparent shadow-lg`
                    : "border-border hover:border-muted-foreground/20 hover:shadow-md"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -2 }}
              >
                {/* Step Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${step.color}`}>
                        {step.label}
                      </p>
                      <h3 className="font-heading text-lg font-bold leading-tight">
                        {step.subtitle}
                      </h3>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground/40 transition-transform ${isActive ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-3 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${step.bgColor} ${step.color}`}>
                    {totalCount} products
                  </span>


                  {liveCount > 0 && (
                    <span className="text-green-600 font-medium">{liveCount} live</span>
                  )}
                </div>

                {/* Node preview dots */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {step.nodes.map((node) => (
                    <div
                      key={node.id}
                      className={`w-2 h-2 rounded-full ${
                        node.status === "live" ? "bg-green-500" : node.status === "coming-soon" ? "bg-amber-400" : "bg-muted-foreground/20"
                      }`}
                      title={node.label}
                    />
                  ))}
                </div>

                {/* Connecting line to center */}
                <div className="hidden md:block absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-gradient-to-b from-transparent to-border" />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Expanded Step Detail Panel */}
      <AnimatePresence mode="wait">
        {activeStepData && (
          <motion.div
            key={activeStepData.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={`rounded-2xl border-2 ${activeStepData.ringColor} border-transparent ring-1 p-6 md:p-8 bg-card shadow-lg`}>
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeStepData.gradientFrom} ${activeStepData.gradientTo} flex items-center justify-center text-white font-bold`}>
                    {steps.indexOf(activeStepData) + 1}
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${activeStepData.color}`}>
                      {activeStepData.label}
                    </p>
                    <h2 className="font-heading text-xl font-bold">{activeStepData.subtitle}</h2>
                  </div>
                </div>
                <button onClick={() => setActiveStep(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* All Products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeStepData.nodes.map((node) => (
                  <NodeCard key={node.id} node={node} step={activeStepData} onNavigate={onNavigate} isPremium={isPremium} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Engine CTA */}
      <motion.div
        className="rounded-2xl border border-secondary/30 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 p-6 md:p-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Sparkles className="h-8 w-8 text-secondary mx-auto mb-3" />
        <h3 className="font-heading text-xl font-bold mb-2">Build My Author Business</h3>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-4">
          Upload your manuscript and let AI generate <strong>all 27 revenue assets</strong> — workbooks, courses, coaching programs, keynote talks, and more — in under 30 minutes.
        </p>
        <button
          onClick={() => onNavigate("build-business")}
          className="inline-flex items-center gap-2 rounded-xl bg-secondary text-secondary-foreground px-6 py-3 font-semibold text-sm hover:bg-secondary/90 transition-colors shadow-[var(--shadow-gold)]"
        >
          Launch AI Engine <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}

/* ─── Individual Node Card ─── */
function NodeCard({
  node, step, onNavigate, isPremium,
}: {
  node: Node;
  step: Step;
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
        <div className={`w-9 h-9 rounded-lg ${step.bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${step.color}`} />
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
