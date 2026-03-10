import { motion } from "framer-motion";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Lock, Sparkles, DollarSign, Radio, Award,
} from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";

interface Node {
  id: string;
  label: string;
  icon: typeof BookOpen;
  section?: DashboardSection;
  description: string;
  status: "available" | "coming-soon" | "planned";
}

interface CategoryDef {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIcon: typeof DollarSign;
  nodes: Node[];
}

const categories: CategoryDef[] = [
  {
    id: "revenue-streams",
    label: "B · Build Authority",
    subtitle: "Digital assets & authority products (7 nodes)",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-emerald-600",
    headerIcon: DollarSign,
    nodes: [
      { id: "workbooks", label: "Workbook", icon: FileText, section: "workbooks", description: "Companion workbook PDFs with exercises & action plans.", status: "available" },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, description: "Self-paced study guide with daily schedules.", status: "available" },
      { id: "book-sales-events", label: "Book Sales", icon: BookOpen, description: "QR code order pages for live event sales.", status: "available" },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, description: "Signed copies, bundles, collector's editions.", status: "available" },
      { id: "social-media", label: "Social Media", icon: Share2, section: "social-media", description: "90-day AI content calendar from your book.", status: "available" },
      { id: "email-marketing", label: "Email Marketing", icon: Megaphone, description: "AI-driven nurture sequences from book content.", status: "available" },
      { id: "microsite", label: "Website / Microsite", icon: BookOpen, description: "Your book's landing page (built-in).", status: "available" },
    ],
  },
  {
    id: "marketing-channels",
    label: "B · Bridge Channels",
    subtitle: "Marketing channels & audience connections (14 nodes)",
    color: "text-violet-600",
    bgColor: "bg-violet-500/10",
    gradientFrom: "from-violet-500",
    gradientTo: "to-violet-600",
    headerIcon: Radio,
    nodes: [
      { id: "audiobook", label: "Audiobook", icon: Headphones, description: "AI-narrated audiobook from your manuscript.", status: "available" },
      { id: "courses", label: "Online Courses", icon: GraduationCap, section: "courses", description: "8-12 module structured courses from your manuscript.", status: "available" },
      { id: "podcast-guest", label: "Podcasts", icon: Podcast, section: "podcast", description: "Podcast series from your book content.", status: "available" },
      { id: "webinars", label: "Webinars", icon: Video, section: "webinars", description: "Webinar scripts + slide decks + registration pages.", status: "available" },
      { id: "memberships", label: "Monthly Memberships", icon: CreditCard, section: "memberships", description: "3-tier membership with gated content drip.", status: "available" },
      { id: "coaching-1on1", label: "1-on-1 Coaching", icon: UserCheck, section: "coaching", description: "6/12-session coaching programs.", status: "available" },
      { id: "group-coaching", label: "Group Coaching", icon: Users, section: "group-coaching", description: "8-week group coaching curriculum.", status: "available" },
      { id: "big-ticket", label: "Big Ticket Consulting", icon: Trophy, section: "big-ticket", description: "Premium consulting packages ($5K–$25K).", status: "planned" },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "AI-generated conversion sequences.", status: "planned" },
      { id: "in-house-speaker", label: "In-House Speaker", icon: Presentation, description: "Corporate speaker profile + booking.", status: "planned" },
      { id: "training", label: "Training Programs", icon: Building2, description: "Corporate training programs.", status: "planned" },
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Affiliate tracking links + commission structures.", status: "planned" },
      { id: "lead-magnet", label: "Lead Magnet", icon: FileText, description: "Free PDF downloads to grow your email list.", status: "available" },
      { id: "revenue-sharing", label: "Revenue Sharing", icon: Handshake, description: "Partnership matching + contract templates.", status: "planned" },
    ],
  },
  {
    id: "authority-builders",
    label: "Y · Yield Revenue",
    subtitle: "Premium revenue streams & monetization (7 nodes)",
    color: "text-sky-600",
    bgColor: "bg-sky-500/10",
    gradientFrom: "from-sky-500",
    gradientTo: "to-sky-600",
    headerIcon: Award,
    nodes: [
      { id: "keynotes", label: "Keynotes", icon: Mic, section: "speaking", description: "3-5 keynote topics + slide decks.", status: "available" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, section: "masterminds", description: "Quarterly mastermind group programs.", status: "planned" },
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, description: "2-3 day retreat programs.", status: "planned" },
      { id: "certification", label: "Certification", icon: ShieldCheck, section: "certification", description: "Curriculum + exam + digital certificates.", status: "planned" },
      { id: "conventions", label: "Conventions / Conferences", icon: Calendar, description: "Conference submission generator.", status: "planned" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Fundraising event templates.", status: "planned" },
      { id: "exhibitors", label: "Exhibitors / JV", icon: Megaphone, description: "Exhibitor prospectus + partnership matching.", status: "planned" },
    ],
  },
];

const statusStyles = {
  available: { badge: "Available", className: "bg-accent/15 text-accent border-accent/30" },
  "coming-soon": { badge: "Building", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

interface Props {
  categoryId: string;
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
}

export default function StepDetailView({ categoryId, onNavigate, isPremium }: Props) {
  const catData = categories.find((c) => c.id === categoryId);
  if (!catData) return null;

  const HeaderIcon = catData.headerIcon;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catData.gradientFrom} ${catData.gradientTo} flex items-center justify-center text-white shadow-sm`}>
          <HeaderIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{catData.label}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{catData.subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-medium rounded-full px-3 py-1 ${catData.bgColor} ${catData.color}`}>
            {catData.nodes.length} products
          </span>
          {catData.nodes.filter(n => n.status === "available").length > 0 && (
            <span className="text-xs font-medium rounded-full px-3 py-1 bg-accent/15 text-accent">
              {catData.nodes.filter(n => n.status === "available").length} available
            </span>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catData.nodes.map((node) => {
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
                <div className={`w-9 h-9 rounded-lg ${catData.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${catData.color}`} />
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
