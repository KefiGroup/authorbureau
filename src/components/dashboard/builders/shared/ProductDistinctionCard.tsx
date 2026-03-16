import { Card } from "@/components/ui/card";
import { BookOpen, Calendar, Video } from "lucide-react";

type ProductType = "workbook" | "home-study" | "online-course";

const PRODUCTS = [
  {
    key: "workbook" as const,
    icon: BookOpen,
    label: "Workbook",
    sublabel: "Activity Book",
    nature: "Work through it at your own pace",
    duration: "No deadline",
    format: "Print/digital exercises",
  },
  {
    key: "home-study" as const,
    icon: Calendar,
    label: "Home Study",
    sublabel: "Self-Guided Program",
    nature: "Self-guided accountability guide",
    duration: "21 or 30 days",
    format: "Daily habit formation",
  },
  {
    key: "online-course" as const,
    icon: Video,
    label: "Online Course",
    sublabel: "Facilitated Workshop",
    nature: "Facilitated workshop with learning design",
    duration: "2–3 days intensive",
    format: "Live/recorded with activities, debrief, workbook, mindmap",
  },
];

export default function ProductDistinctionCard({ highlight }: { highlight: ProductType }) {
  return (
    <Card className="p-4 border-border/50 bg-muted/20">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        How this fits in your product suite
      </p>
      <div className="space-y-2">
        {PRODUCTS.map((p) => {
          const isActive = p.key === highlight;
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-xs transition-colors ${
                isActive
                  ? "bg-secondary/10 border border-secondary/25"
                  : "opacity-60"
              }`}
            >
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-secondary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-bold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {p.label}
                </p>
                <p className="text-muted-foreground">{p.nature}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-muted-foreground">{p.duration}</p>
                <p className="text-muted-foreground/70 text-[10px]">{p.format}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
