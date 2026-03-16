import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

interface ConnectedProduct {
  id: string;
  icon: string;
  name: string;
  connection: string;
  status: "built" | "not_started";
}

/** Get connected products for each builder */
function getConnectedProducts(builderId: string): ConnectedProduct[] {
  const connections: Record<string, ConnectedProduct[]> = {
    "workbook": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Workbook exercises become course assignments", status: "not_started" },
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Sample workbook pages drive email signups", status: "not_started" },
      { id: "home-study-course", icon: "📅", name: "Home Study Course", connection: "Exercises feed into daily activities", status: "not_started" },
    ],
    "home-study-course": [
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Exercises feed into daily activities", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Home Study graduates get course discount", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Daily emails build your list", status: "not_started" },
    ],
    "online-course": [
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Course companion workbook increases completion", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Course graduates upsell to 1-on-1 coaching", status: "not_started" },
      { id: "webinar", icon: "📺", name: "Webinar", connection: "Free webinar sells course enrollments", status: "not_started" },
    ],
    "coaching": [
      { id: "group-coaching", icon: "👥", name: "Group Coaching", connection: "Scale 1-on-1 into group programmes", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Course graduates become coaching clients", status: "not_started" },
      { id: "webinar", icon: "📺", name: "Webinar", connection: "Webinar drives coaching applications", status: "not_started" },
    ],
    "special-editions": [
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Launch emails announce special edition", status: "not_started" },
      { id: "social-media", icon: "📱", name: "Social Media", connection: "Gift-buyer content drives seasonal sales", status: "not_started" },
    ],
    "podcast-scripts": [
      { id: "social-media", icon: "📱", name: "Social Media", connection: "Episode clips become social posts", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Episode summaries nurture subscribers", status: "not_started" },
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Show notes PDF grows email list", status: "not_started" },
    ],
    "email-marketing": [
      { id: "lead-magnet", icon: "🧲", name: "Lead Magnet", connection: "Lead magnet captures new subscribers", status: "not_started" },
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Email sequence sells course", status: "not_started" },
    ],
    "social-media": [
      { id: "podcast-scripts", icon: "🎙️", name: "Podcast", connection: "Social posts promote episodes", status: "not_started" },
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Social drives email signups", status: "not_started" },
    ],
    "webinar": [
      { id: "online-course", icon: "🎓", name: "Online Course", connection: "Webinar sells course enrollments", status: "not_started" },
      { id: "coaching", icon: "💬", name: "Coaching", connection: "Webinar drives coaching applications", status: "not_started" },
    ],
    "lead-magnet": [
      { id: "email-marketing", icon: "✉️", name: "Email Marketing", connection: "Lead magnet starts nurture sequence", status: "not_started" },
      { id: "workbook", icon: "📖", name: "Workbook", connection: "Sample pages preview the full workbook", status: "not_started" },
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
        {enriched.map(product => (
          <Card key={product.id} className="px-3 py-2.5 flex items-start gap-2.5 border-border/60">
            <span className="text-lg shrink-0 mt-0.5">{product.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
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
        ))}
      </div>
    </div>
  );
}
