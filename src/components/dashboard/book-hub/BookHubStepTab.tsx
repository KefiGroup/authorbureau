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
  group?: string;
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
    id: "revenue-streams", label: "B · Build Authority", subtitle: "Digital assets & authority products (18 nodes)",
    color: "text-emerald-600", bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600",
    headerIconName: "DollarSign",
    nodes: [
      // Digital Products
      { id: "workbooks", label: "Workbook", iconName: "FileText", description: "Companion workbook PDFs with exercises & action plans.", status: "live", group: "Digital Products" },
      { id: "audiobook", label: "Audiobook", iconName: "Headphones", description: "AI-narrated audiobook from your manuscript.", status: "coming-soon", group: "Digital Products" },
      { id: "book-sales-events", label: "Book Sales (Events)", iconName: "BookOpen", description: "QR code order pages for live event sales.", status: "planned", group: "Digital Products" },
      { id: "home-study", label: "Home Study Courses", iconName: "BookMarked", description: "Self-paced study guide with daily schedules.", status: "coming-soon", group: "Digital Products" },
      { id: "courses", label: "Online Courses", iconName: "GraduationCap", description: "8-12 module structured courses from your manuscript.", status: "coming-soon", group: "Digital Products" },
      { id: "special-editions", label: "Special Editions", iconName: "Sparkles", description: "Signed copies, bundles, collector's editions.", status: "planned", group: "Digital Products" },
      { id: "memberships", label: "Monthly Memberships", iconName: "CreditCard", description: "3-tier membership with gated content drip.", status: "planned", group: "Digital Products" },
      // Coaching
      { id: "group-coaching", label: "Group Coaching", iconName: "Users", description: "8-week group coaching curriculum.", status: "coming-soon", group: "Coaching" },
      { id: "coaching-1on1", label: "1-on-1 Coaching", iconName: "UserCheck", description: "6/12-session coaching programs with session outlines.", status: "live", group: "Coaching" },
      // Speaking
      { id: "in-house-speaker", label: "In-House Speaker", iconName: "Presentation", description: "Corporate speaker profile + booking.", status: "planned", group: "Speaking" },
      { id: "training", label: "Training Programs", iconName: "Building2", description: "Half/full-day corporate training programs.", status: "planned", group: "Speaking" },
      { id: "retreats", label: "Retreats & Bootcamps", iconName: "Bookmark", description: "2-3 day retreat programs.", status: "planned", group: "Speaking" },
      { id: "masterminds", label: "Masterminds", iconName: "BarChart3", description: "Quarterly mastermind group programs.", status: "planned", group: "Speaking" },
      { id: "certification", label: "Certification", iconName: "ShieldCheck", description: "Curriculum + exam + digital certificates.", status: "planned", group: "Speaking" },
      { id: "keynotes", label: "Keynotes", iconName: "Mic", description: "3-5 keynote topics with slide decks.", status: "live", group: "Speaking" },
      { id: "big-ticket", label: "Big Ticket Consulting", iconName: "Trophy", description: "Premium consulting packages ($5K–$25K).", status: "planned", group: "Speaking" },
      // Partnerships
      { id: "upsells", label: "Upsells / Downsells / Cross Sells", iconName: "TrendingUp", description: "AI-generated conversion sequences.", status: "planned", group: "Partnerships" },
      { id: "revenue-sharing", label: "Revenue Sharing", iconName: "Handshake", description: "Partnership matching + contract templates.", status: "planned", group: "Partnerships" },
    ],
  },
  {
    id: "marketing-channels", label: "B · Bridge Channels", subtitle: "Marketing channels & audience connections (6 nodes)",
    color: "text-violet-600", bgColor: "bg-violet-500/10",
    gradientFrom: "from-violet-500", gradientTo: "to-violet-600",
    headerIconName: "Radio",
    nodes: [
      { id: "social-media", label: "Social Media", iconName: "Share2", description: "90-day AI content calendar from your book.", status: "live" },
      { id: "webinars", label: "Webinars", iconName: "Video", description: "Webinar scripts + slide decks + registration pages.", status: "live" },
      { id: "podcast-guest", label: "Podcasts (Guest)", iconName: "Podcast", description: "Pitch kit to get booked as a guest expert.", status: "planned" },
      { id: "microsite", label: "Website / Microsite", iconName: "BookOpen", description: "Your book's landing page (built-in).", status: "live" },
      { id: "affiliates", label: "Affiliates", iconName: "Link2", description: "Affiliate tracking links + commission structures.", status: "planned" },
      { id: "email-marketing", label: "Email Marketing", iconName: "Megaphone", description: "AI-driven nurture sequences from book content.", status: "coming-soon" },
    ],
  },
  {
    id: "authority-builders", label: "Y · Yield Revenue", subtitle: "Premium revenue streams & monetization (3 nodes)",
    color: "text-sky-600", bgColor: "bg-sky-500/10",
    gradientFrom: "from-sky-500", gradientTo: "to-sky-600",
    headerIconName: "Award",
    nodes: [
      { id: "conventions", label: "Conventions / Conferences", iconName: "Calendar", description: "Conference submission generator.", status: "planned" },
      { id: "fundraising", label: "Fund Raising", iconName: "HandCoins", description: "Fundraising event templates.", status: "planned" },
      { id: "exhibitors", label: "Exhibitors / JV", iconName: "Megaphone", description: "Exhibitor prospectus + partnership matching.", status: "planned" },
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

      {/* Product Grid — grouped */}
      <div className="space-y-8">
        {(() => {
          const groups: { name: string; nodes: ProductNode[] }[] = [];
          catData.nodes.forEach((node) => {
            const groupName = node.group || "Other";
            const existing = groups.find((g) => g.name === groupName);
            if (existing) existing.nodes.push(node);
            else groups.push({ name: groupName, nodes: [node] });
          });
          return groups.map((group) => (
            <div key={group.name}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {group.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.nodes.map((node) => {
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
