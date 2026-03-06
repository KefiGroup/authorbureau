import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Lock, Sparkles, DollarSign, Radio, Award,
} from "lucide-react";

const iconMap: Record<string, typeof BookOpen> = {
  Share2, FileText, Video, Podcast, GraduationCap, Headphones, BookMarked,
  CreditCard, Link2, TrendingUp, UserCheck, Users, Trophy, Handshake,
  Mic, Building2, BookOpen, Sparkles, Presentation, HandCoins, Calendar,
  Bookmark, ShieldCheck, BarChart3, Megaphone, DollarSign, Radio, Award,
};

interface ProductNode {
  id: string;
  label: string;
  iconName: string;
  description: string;
  status: "live" | "coming-soon" | "planned";
}

interface CategoryConfig {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIconName: string;
  nodes: ProductNode[];
}

const statusStyles = {
  live: { badge: "Live", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
  "coming-soon": { badge: "Building", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

export const categoryConfigs: CategoryConfig[] = [
  {
    id: "revenue-streams", label: "Revenue Streams", subtitle: "Products & services you sell",
    color: "text-emerald-600", bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600",
    headerIconName: "DollarSign",
    nodes: [
      { id: "workbooks", label: "Workbooks", iconName: "FileText", description: "Companion workbook PDFs with exercises & action plans.", status: "live" },
      { id: "audiobook", label: "Audiobook", iconName: "Headphones", description: "ElevenLabs-powered narration from your manuscript.", status: "coming-soon" },
      { id: "courses", label: "Online Courses", iconName: "GraduationCap", description: "8-12 module structured courses.", status: "coming-soon" },
      { id: "home-study", label: "Home Study Course", iconName: "BookMarked", description: "Self-paced study guide with daily schedules.", status: "coming-soon" },
      { id: "webinars", label: "Webinars", iconName: "Video", description: "Webinar scripts + slide decks + registration pages.", status: "live" },
      { id: "memberships", label: "Monthly Memberships", iconName: "CreditCard", description: "3-tier membership with gated content drip.", status: "planned" },
      { id: "upsells", label: "Upsells / Downsells", iconName: "TrendingUp", description: "AI-generated conversion sequences.", status: "planned" },
      { id: "certification", label: "Certification Programs", iconName: "ShieldCheck", description: "Curriculum + exam + certificates.", status: "planned" },
      { id: "masterminds", label: "Masterminds", iconName: "BarChart3", description: "Quarterly mastermind group programs.", status: "planned" },
      { id: "retreats", label: "Retreats & Bootcamps", iconName: "Bookmark", description: "2-3 day retreat programs.", status: "planned" },
    ],
  },
  {
    id: "marketing-channels", label: "Marketing Channels", subtitle: "How you reach your audience",
    color: "text-violet-600", bgColor: "bg-violet-500/10",
    gradientFrom: "from-violet-500", gradientTo: "to-violet-600",
    headerIconName: "Radio",
    nodes: [
      { id: "social-media", label: "Social Media", iconName: "Share2", description: "90-day AI content calendar.", status: "live" },
      { id: "podcast-script", label: "Podcast Scripts", iconName: "Podcast", description: "Episode scripts from book chapters.", status: "planned" },
      { id: "podcast-guest", label: "Podcast Pitches", iconName: "Podcast", description: "Get booked as a guest expert.", status: "planned" },
      { id: "affiliates", label: "Affiliates", iconName: "Link2", description: "Affiliate tracking links.", status: "planned" },
      { id: "book-sales-events", label: "Book Sales at Events", iconName: "BookOpen", description: "QR code order pages.", status: "planned" },
      { id: "conventions", label: "Conventions", iconName: "Calendar", description: "Conference submission generator.", status: "planned" },
      { id: "fundraising", label: "Fund Raising", iconName: "HandCoins", description: "Fundraising event templates.", status: "planned" },
      { id: "jvs", label: "Joint Ventures", iconName: "Handshake", description: "JV proposals + partnership matching.", status: "planned" },
      { id: "special-editions", label: "Special Editions", iconName: "Sparkles", description: "Signed copies, bundles.", status: "planned" },
    ],
  },
  {
    id: "authority-builders", label: "Authority Builders", subtitle: "Build credibility & premium positioning",
    color: "text-sky-600", bgColor: "bg-sky-500/10",
    gradientFrom: "from-sky-500", gradientTo: "to-sky-600",
    headerIconName: "Award",
    nodes: [
      { id: "coaching-1on1", label: "1-on-1 Coaching", iconName: "UserCheck", description: "6/12-session coaching programs.", status: "live" },
      { id: "group-coaching", label: "Group Coaching", iconName: "Users", description: "8-week group curriculum.", status: "coming-soon" },
      { id: "big-ticket", label: "Big Ticket Consulting", iconName: "Trophy", description: "Premium packages ($5K–$25K).", status: "planned" },
      { id: "coaching-membership", label: "Coaching Membership", iconName: "CreditCard", description: "Monthly coaching tier.", status: "planned" },
      { id: "keynotes", label: "Keynotes", iconName: "Mic", description: "3-5 keynote topics + slide decks.", status: "live" },
      { id: "corporate-training", label: "Corporate Training", iconName: "Building2", description: "Corporate training programs.", status: "planned" },
      { id: "in-house-speaker", label: "In-House Speaker", iconName: "Presentation", description: "Speaker profile + booking.", status: "planned" },
      { id: "revenue-sharing", label: "Revenue Sharing / JV", iconName: "Handshake", description: "Partnership matching.", status: "planned" },
      { id: "exhibitors", label: "Exhibitors / JV", iconName: "Megaphone", description: "Exhibitor prospectus.", status: "planned" },
    ],
  },
];

interface Props {
  categoryId: string;
  bookId: string;
  bookTitle?: string;
  isPremium: boolean;
}

export default function BookHubStepTab({ categoryId, bookId, bookTitle, isPremium }: Props) {
  const navigate = useNavigate();
  const catData = categoryConfigs.find((c) => c.id === categoryId);
  if (!catData) return null;

  const HeaderIcon = iconMap[catData.headerIconName] || BookOpen;
  const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";

  const getStudioPath = (nodeId: string): string | null => {
    const map: Record<string, string> = {
      "social-media": `/dashboard?section=social-media&bookId=${bookId}${titleParam}`,
      workbooks: `/dashboard?section=workbooks&bookId=${bookId}${titleParam}`,
      webinars: `/dashboard?section=webinars&bookId=${bookId}${titleParam}`,
      audiobook: `/dashboard?section=audiobook-studio&bookId=${bookId}${titleParam}`,
      "coaching-1on1": `/dashboard?section=coaching&bookId=${bookId}${titleParam}`,
      keynotes: `/dashboard?section=speaking&bookId=${bookId}${titleParam}`,
      courses: `/dashboard?section=courses&bookId=${bookId}${titleParam}`,
    };
    return map[nodeId] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catData.gradientFrom} ${catData.gradientTo} flex items-center justify-center text-white shadow-sm`}>
          <HeaderIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold">{catData.label}</h2>
          <p className="text-xs text-muted-foreground">{catData.subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-medium rounded-full px-3 py-1 ${catData.bgColor} ${catData.color}`}>
            {catData.nodes.length} products
          </span>
          {catData.nodes.filter(n => n.status === "live").length > 0 && (
            <span className="text-xs font-medium rounded-full px-3 py-1 bg-green-500/15 text-green-700">
              {catData.nodes.filter(n => n.status === "live").length} live
            </span>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catData.nodes.map((node) => {
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
