import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp,
  Headphones, BookMarked, Globe, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Sparkles, Lock, Megaphone,
} from "lucide-react";

const iconMap: Record<string, typeof BookOpen> = {
  Share2, FileText, Video, Podcast, GraduationCap, Headphones, BookMarked,
  CreditCard, Link2, TrendingUp, UserCheck, Users, Trophy, Handshake,
  Mic, Building2, BookOpen, Sparkles, Presentation, HandCoins, Calendar,
  Bookmark, ShieldCheck, BarChart3, Megaphone, Globe,
};

interface ProductNode {
  id: string;
  label: string;
  iconName: string;
  description: string;
  status: "live" | "coming-soon" | "planned";
  buildOrder?: number;
  buildReason?: string;
}

interface StepConfig {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  nodes: ProductNode[];
}

const statusStyles = {
  live: { badge: "Live", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
  "coming-soon": { badge: "Building", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

export const stepConfigs: StepConfig[] = [
  {
    id: "automate", label: "A · Automate", subtitle: "Digital Products",
    color: "text-blue-600", bgColor: "bg-blue-500/10",
    gradientFrom: "from-blue-500", gradientTo: "to-blue-600",
    nodes: [
      { id: "social-media", label: "Social Media", iconName: "Share2", description: "90-day AI content calendar from your book chapters.", status: "live", buildOrder: 1, buildReason: "Quick win — immediate value." },
      { id: "workbooks", label: "Workbooks", iconName: "FileText", description: "Companion workbook PDFs with exercises & action plans.", status: "live", buildOrder: 2, buildReason: "Simple product with high perceived value." },
      { id: "webinars", label: "Webinars", iconName: "Video", description: "Complete webinar scripts + slide decks + registration pages.", status: "live", buildOrder: 3, buildReason: "Lead generation engine." },
      { id: "podcast-script", label: "Podcast Scripts", iconName: "Podcast", description: "AI-generated podcast episode scripts from your book.", status: "planned", buildOrder: 4 },
      { id: "courses", label: "Online Courses", iconName: "GraduationCap", description: "8-12 module structured courses — highest revenue potential.", status: "coming-soon", buildOrder: 5 },
      { id: "audiobook", label: "Audiobook", iconName: "Headphones", description: "AI-generated audiobook scripts — passive income.", status: "coming-soon", buildOrder: 6 },
      { id: "home-study", label: "Home Study Course", iconName: "BookMarked", description: "Self-paced study guide with daily schedules.", status: "coming-soon", buildOrder: 7 },
      { id: "memberships", label: "Monthly Memberships", iconName: "CreditCard", description: "3-tier membership with gated content drip.", status: "planned", buildOrder: 8 },
      { id: "affiliates", label: "Affiliates", iconName: "Link2", description: "Affiliate tracking links with commissions.", status: "planned", buildOrder: 9 },
      { id: "upsells", label: "Upsells / Downsells", iconName: "TrendingUp", description: "AI-generated conversion sequences.", status: "planned", buildOrder: 10 },
    ],
  },
  {
    id: "build", label: "B · Build", subtitle: "Coaching & Consulting",
    color: "text-amber-600", bgColor: "bg-amber-500/10",
    gradientFrom: "from-amber-500", gradientTo: "to-amber-600",
    nodes: [
      { id: "coaching-1on1", label: "1-on-1 Coaching", iconName: "UserCheck", description: "AI generates 6/12-session coaching programs.", status: "live" },
      { id: "group-coaching", label: "Group Coaching", iconName: "Users", description: "8-week group coaching curriculum.", status: "coming-soon" },
      { id: "big-ticket", label: "Big Ticket", iconName: "Trophy", description: "Premium consulting packages ($5K–$25K).", status: "planned" },
      { id: "revenue-sharing", label: "Revenue Sharing / JV", iconName: "Handshake", description: "Partnership matching + contract templates.", status: "planned" },
      { id: "coaching-membership", label: "Coaching Membership", iconName: "CreditCard", description: "Monthly coaching tier — recurring revenue.", status: "planned" },
    ],
  },
  {
    id: "broadcast", label: "B · Broadcast", subtitle: "Speaking",
    color: "text-rose-500", bgColor: "bg-rose-500/10",
    gradientFrom: "from-rose-500", gradientTo: "to-rose-600",
    nodes: [
      { id: "keynotes", label: "Keynotes", iconName: "Mic", description: "AI generates 3-5 keynote topics with slide decks.", status: "live" },
      { id: "podcast-guest", label: "Podcast Pitches", iconName: "Podcast", description: "AI-generated podcast pitch kit.", status: "planned" },
      { id: "corporate-training", label: "Corporate Training", iconName: "Building2", description: "Half/full-day corporate training programs.", status: "planned" },
      { id: "jvs-speaking", label: "Joint Ventures", iconName: "Handshake", description: "JV proposals for co-hosting speaking events.", status: "planned" },
      { id: "book-sales-events", label: "Book Sales at Events", iconName: "BookOpen", description: "QR code order pages for live events.", status: "planned" },
      { id: "special-editions", label: "Special Editions", iconName: "Sparkles", description: "Special edition proposals — signed copies, bundles.", status: "planned" },
      { id: "in-house-speaker", label: "In-House Speaker", iconName: "Presentation", description: "Corporate speaker profile + booking system.", status: "planned" },
      { id: "fundraising", label: "Fund Raising", iconName: "HandCoins", description: "Fundraising event templates.", status: "planned" },
      { id: "conventions", label: "Conventions", iconName: "Calendar", description: "Conference submission generator.", status: "planned" },
    ],
  },
  {
    id: "yield", label: "Y · Yield", subtitle: "Seminars & Events",
    color: "text-emerald-500", bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600",
    nodes: [
      { id: "retreats", label: "Retreats & Bootcamps", iconName: "Bookmark", description: "2-3 day retreat programs with agendas.", status: "planned" },
      { id: "certification", label: "Certification Programs", iconName: "ShieldCheck", description: "Multi-module curriculum + exam + certificates.", status: "planned" },
      { id: "masterminds", label: "Masterminds", iconName: "BarChart3", description: "Quarterly mastermind group programs.", status: "planned" },
      { id: "exhibitors", label: "Exhibitors / JV", iconName: "Megaphone", description: "Exhibitor prospectus + partnership matching.", status: "planned" },
    ],
  },
];

interface Props {
  stepId: string;
  bookId: string;
  isPremium: boolean;
}

export default function BookHubStepTab({ stepId, bookId, isPremium }: Props) {
  const navigate = useNavigate();
  const stepData = stepConfigs.find((s) => s.id === stepId);
  if (!stepData) return null;

  const getStudioPath = (nodeId: string): string | null => {
    const map: Record<string, string> = {
      "social-media": "/dashboard?section=social-media",
      workbooks: `/dashboard?section=workbooks&bookId=${bookId}`,
      webinars: "/dashboard?section=webinars",
    };

    return map[nodeId] || null;
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stepData.gradientFrom} ${stepData.gradientTo} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
          {stepData.label.charAt(0)}
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${stepData.color}`}>{stepData.label}</p>
          <h2 className="font-heading text-xl font-bold">{stepData.subtitle}</h2>
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

      {/* Products numbered in recommended build sequence */}
      {stepData.nodes[0]?.buildOrder && (
        <p className="text-xs text-muted-foreground">Products numbered in recommended build sequence</p>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stepData.nodes.map((node) => {
          const status = statusStyles[node.status];
          const Icon = iconMap[node.iconName] || BookOpen;
          const canOpen = node.status === "live";
          const studioPath = getStudioPath(node.id);
          const isClickable = canOpen && Boolean(studioPath);

          return (
            <motion.div
              key={node.id}
              className={`group relative rounded-xl border p-4 transition-all ${
                isClickable
                  ? "border-border hover:border-muted-foreground/30 hover:shadow-md cursor-pointer"
                  : "border-border/50 opacity-75"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={isClickable ? { y: -2 } : {}}
              onClick={() => {
                if (studioPath) navigate(studioPath);
              }}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : -1}
              onKeyDown={(e) => {
                if (!studioPath) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(studioPath);
                }
              }}
            >
              {node.buildOrder && (
                <div className={`absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-gradient-to-br ${stepData.gradientFrom} ${stepData.gradientTo} flex items-center justify-center text-white text-[10px] font-bold shadow-sm ring-2 ring-background`}>
                  {node.buildOrder}
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${stepData.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${stepData.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm truncate">{node.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">{node.description}</p>
                  {node.buildReason && (
                    <p className="text-[10px] text-muted-foreground/70 italic leading-snug mt-1 line-clamp-1">{node.buildReason}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${status.className}`}>
                      {status.badge}
                    </span>
                    {isClickable && (
                      <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open Studio <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                    {!isPremium && (
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
