import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

interface ConnectedProduct {
  id: string;
  icon: string;
  name: string;
  connection: string;
  status: "built" | "not_started";
  tier: "brand" | "build" | "yield";
}

const TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  brand: { bg: "bg-accent/10", text: "text-accent", label: "Brand Products" },
  build: { bg: "bg-violet-500/10", text: "text-violet-600", label: "Build Authority" },
  yield: { bg: "bg-secondary/10", text: "text-secondary", label: "Yield Revenue" },
};

/** Revenue Map connections for each builder, reflecting B-B-Y structure */
function getConnectedProducts(builderId: string): ConnectedProduct[] {
  const connections: Record<string, ConnectedProduct[]> = {
    // ── Brand Products (9 nodes) ──
    "book-sales": [
      { id: "special-editions", icon: "✨", name: "Special Editions", connection: "Gift & collector editions increase per-unit revenue", tier: "brand", status: "not_started" },
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Companion workbook deepens reader engagement", tier: "brand", status: "not_started" },
      { id: "audiobook", icon: "🎧", name: "Audiobook", connection: "Audio format reaches new audiences", tier: "build", status: "not_started" },
    ],
    "workbook": [
      { id: "home-study-course", icon: "📅", name: "Home Study Course", connection: "Workbook exercises become daily activities", tier: "brand", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Exercises become course assignments", tier: "build", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Sample pages drive email signups", tier: "brand", status: "not_started" },
    ],
    "home-study-course": [
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Exercises feed into daily activities", tier: "brand", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Graduates get course discount", tier: "build", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Daily emails build your list", tier: "brand", status: "not_started" },
    ],
    "special-editions": [
      { id: "book-sales", icon: "📖", name: "Book Sales", connection: "Collector editions boost book revenue", tier: "brand", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Launch emails announce special edition", tier: "brand", status: "not_started" },
      { id: "social-media", icon: "📱", name: "Social Media", connection: "Gift-buyer content drives seasonal sales", tier: "brand", status: "not_started" },
    ],
    "lead-magnet": [
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Lead magnet starts nurture sequence", tier: "brand", status: "not_started" },
      { id: "webinar", icon: "📺", name: "Webinar", connection: "Free resource promotes webinar attendance", tier: "brand", status: "not_started" },
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Sample pages preview the full workbook", tier: "brand", status: "not_started" },
    ],
    "webinar": [
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Free resource promotes webinar attendance", tier: "brand", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Webinar sells course enrollments", tier: "build", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Webinar drives coaching applications", tier: "yield", status: "not_started" },
    ],
    "social-media": [
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Social drives email signups", tier: "brand", status: "not_started" },
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Social content promotes lead magnets", tier: "brand", status: "not_started" },
      { id: "podcast-scripts", icon: "🎙️", name: "Podcast", connection: "Social posts promote episodes", tier: "build", status: "not_started" },
    ],
    "email-marketing": [
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Lead magnet captures new subscribers", tier: "brand", status: "not_started" },
      { id: "webinar", icon: "📺", name: "Webinar", connection: "Email sequence fills webinar seats", tier: "brand", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Email sequence sells course", tier: "build", status: "not_started" },
    ],
    "website": [
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Website captures leads", tier: "brand", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Website drives newsletter signups", tier: "brand", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Website hosts course sales page", tier: "build", status: "not_started" },
    ],

    // ── Build Authority (9 nodes) ──
    "online-course": [
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Course companion workbook increases completion", tier: "brand", status: "not_started" },
      { id: "webinar", icon: "📺", name: "Webinar", connection: "Free webinar sells course enrollments", tier: "brand", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Course graduates upsell to coaching", tier: "yield", status: "not_started" },
    ],
    "audiobook": [
      { id: "book-sales", icon: "📖", name: "Book Sales", connection: "Audio format complements print sales", tier: "brand", status: "not_started" },
      { id: "podcast-scripts", icon: "🎙️", name: "Podcast", connection: "Audiobook listeners discover podcast", tier: "build", status: "not_started" },
      { id: "media-outreach", icon: "📰", name: "Media & PR", connection: "Audiobook launch drives media coverage", tier: "build", status: "not_started" },
    ],
    "memberships": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Course graduates join membership", tier: "build", status: "not_started" },
      { id: "group-coaching", icon: "👥", name: "Group Coaching", connection: "Members upgrade to group coaching", tier: "build", status: "not_started" },
      { id: "masterminds", icon: "🧠", name: "Masterminds", connection: "Top members join mastermind", tier: "yield", status: "not_started" },
    ],
    "group-coaching": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Course graduates join group coaching", tier: "build", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Group participants upgrade to 1-on-1", tier: "yield", status: "not_started" },
      { id: "memberships", icon: "💳", name: "Memberships", connection: "Group alumni maintain membership", tier: "build", status: "not_started" },
    ],
    "podcast-scripts": [
      { id: "social-media", icon: "📱", name: "Social Media", connection: "Episode clips become social posts", tier: "brand", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Episode summaries nurture subscribers", tier: "brand", status: "not_started" },
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Show notes PDF grows email list", tier: "brand", status: "not_started" },
    ],
    "media-outreach": [
      { id: "social-media", icon: "📱", name: "Social Media", connection: "Media mentions amplify social proof", tier: "brand", status: "not_started" },
      { id: "podcast-scripts", icon: "🎙️", name: "Podcast", connection: "Media coverage drives podcast appearances", tier: "build", status: "not_started" },
      { id: "keynotes", icon: "🎤", name: "Keynotes", connection: "Media profile lands speaking gigs", tier: "yield", status: "not_started" },
    ],
    "affiliates": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Affiliates promote course enrollments", tier: "build", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Affiliates drive list growth", tier: "brand", status: "not_started" },
      { id: "memberships", icon: "💳", name: "Memberships", connection: "Affiliates promote membership signups", tier: "build", status: "not_started" },
    ],
    "upsells": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Post-purchase upsell to course", tier: "build", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Upsell path to premium coaching", tier: "yield", status: "not_started" },
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Bundle workbook as order bump", tier: "brand", status: "not_started" },
    ],
    "revenue-sharing": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Partners co-create and share course revenue", tier: "build", status: "not_started" },
      { id: "affiliates", icon: "🤝", name: "Affiliates", connection: "Revenue sharing deepens affiliate relationships", tier: "build", status: "not_started" },
      { id: "masterminds", icon: "🧠", name: "Masterminds", connection: "Co-hosted masterminds split revenue", tier: "yield", status: "not_started" },
    ],

    // ── Yield Revenue (10 nodes) ──
    "coaching": [
      { id: "group-coaching", icon: "👥", name: "Group Coaching", connection: "Scale 1-on-1 into group programmes", tier: "build", status: "not_started" },
      { id: "masterminds", icon: "🧠", name: "Masterminds", connection: "Top clients join mastermind", tier: "yield", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Course graduates become coaching clients", tier: "build", status: "not_started" },
    ],
    "consulting": [
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Consulting clients upgrade to ongoing coaching", tier: "yield", status: "not_started" },
      { id: "training", icon: "🎓", name: "Training", connection: "Consulting insights become training programmes", tier: "yield", status: "not_started" },
      { id: "keynotes", icon: "🎤", name: "Keynotes", connection: "Consulting expertise powers keynotes", tier: "yield", status: "not_started" },
    ],
    "keynotes": [
      { id: "consulting", icon: "📋", name: "Consulting", connection: "Speaking engagements lead to consulting", tier: "yield", status: "not_started" },
      { id: "media-outreach", icon: "📰", name: "Media & PR", connection: "Speaking profile attracts media", tier: "build", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Audience members apply for coaching", tier: "yield", status: "not_started" },
    ],
    "training": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Training content feeds digital course", tier: "build", status: "not_started" },
      { id: "certification", icon: "📜", name: "Certification", connection: "Graduates pursue certification", tier: "yield", status: "not_started" },
      { id: "consulting", icon: "📋", name: "Consulting", connection: "Training participants hire for consulting", tier: "yield", status: "not_started" },
    ],
    "masterminds": [
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Mastermind members get 1-on-1 access", tier: "yield", status: "not_started" },
      { id: "retreats", icon: "🏔️", name: "Retreats", connection: "Mastermind groups attend retreats", tier: "yield", status: "not_started" },
      { id: "group-coaching", icon: "👥", name: "Group Coaching", connection: "Group coaching feeds mastermind pipeline", tier: "build", status: "not_started" },
    ],
    "retreats": [
      { id: "masterminds", icon: "🧠", name: "Masterminds", connection: "Retreat attendees join mastermind", tier: "yield", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Retreat deepens coaching relationships", tier: "yield", status: "not_started" },
      { id: "conventions", icon: "🎪", name: "Conventions", connection: "Retreats scale into conventions", tier: "yield", status: "not_started" },
    ],
    "certification": [
      { id: "training", icon: "🎓", name: "Training", connection: "Training graduates pursue certification", tier: "yield", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Course prerequisite for certification", tier: "build", status: "not_started" },
      { id: "consulting", icon: "📋", name: "Consulting", connection: "Certified practitioners refer consulting", tier: "yield", status: "not_started" },
    ],
    "conventions": [
      { id: "keynotes", icon: "🎤", name: "Keynotes", connection: "Convention keynote drives authority", tier: "yield", status: "not_started" },
      { id: "exhibitors", icon: "🏢", name: "Exhibitors", connection: "Exhibitor booths generate leads", tier: "yield", status: "not_started" },
      { id: "retreats", icon: "🏔️", name: "Retreats", connection: "Convention attendees join retreats", tier: "yield", status: "not_started" },
    ],
    "fundraising": [
      { id: "conventions", icon: "🎪", name: "Conventions", connection: "Events attract fundraising opportunities", tier: "yield", status: "not_started" },
      { id: "keynotes", icon: "🎤", name: "Keynotes", connection: "Speaking drives fundraising visibility", tier: "yield", status: "not_started" },
      { id: "media-outreach", icon: "📰", name: "Media & PR", connection: "Media coverage supports fundraising", tier: "build", status: "not_started" },
    ],
    "exhibitors": [
      { id: "conventions", icon: "🎪", name: "Conventions", connection: "Exhibitor presence at your conventions", tier: "yield", status: "not_started" },
      { id: "book-sales", icon: "📖", name: "Book Sales", connection: "Exhibition booths sell books", tier: "brand", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Booth visitors join email list", tier: "brand", status: "not_started" },
    ],
  };

  return connections[builderId] || [];
}

interface Props {
  builderId: string;
  builtProductIds?: string[];
}

export default function ConnectedProductsSection({ builderId, builtProductIds = [] }: Props) {
  const products = getConnectedProducts(builderId);
  if (products.length === 0) return null;

  const enriched = products.map(p => ({
    ...p,
    status: builtProductIds.includes(p.id) ? "built" as const : "not_started" as const,
  }));

  return (
    <div className="mt-6 mb-2">
      <div className="flex items-center mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary px-3 py-1 bg-secondary/5">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-secondary">Revenue Map</span>
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {enriched.map(product => {
          const tierStyle = TIER_COLORS[product.tier];
          return (
            <Card key={product.id} className="px-3 py-2.5 flex items-start gap-2.5 border-border/60">
              <span className="text-lg shrink-0 mt-0.5">{product.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 shrink-0 ${tierStyle.text} ${tierStyle.bg} border-transparent`}
                  >
                    {tierStyle.label}
                  </Badge>
                  <Badge
                    variant={product.status === "built" ? "default" : "outline"}
                    className={`text-[9px] px-1.5 py-0 shrink-0 ${
                      product.status === "built"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {product.status === "built" ? "Built ✓" : "Not Started"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{product.connection}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
