import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FrameworkProduct {
  name: string;
  status: "recommended" | "built" | "locked";
}

interface FrameworkCategory {
  letter: string;
  label: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
  products: FrameworkProduct[];
}

interface Props {
  hasConsultation: boolean;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

const DEFAULT_FRAMEWORK: FrameworkCategory[] = [
  {
    letter: "A",
    label: "Automate",
    tagline: "Digital products that sell while you sleep",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    products: [
      { name: "Workbook", status: "recommended" },
      { name: "Online Course", status: "recommended" },
      { name: "Audiobook", status: "recommended" },
      { name: "Home Study Course", status: "recommended" },
      { name: "Email Nurture Sequence", status: "recommended" },
    ],
  },
  {
    letter: "B",
    label: "Build",
    tagline: "High-touch coaching & consulting",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    products: [
      { name: "1-on-1 Coaching", status: "recommended" },
      { name: "Group Programme", status: "recommended" },
      { name: "Mastermind", status: "recommended" },
      { name: "Corporate Workshop", status: "recommended" },
    ],
  },
  {
    letter: "B",
    label: "Broadcast",
    tagline: "Speak, present & reach new audiences",
    color: "text-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-800",
    products: [
      { name: "Keynote Talk", status: "recommended" },
      { name: "Webinar Series", status: "recommended" },
      { name: "Podcast Tour", status: "recommended" },
      { name: "Social Media Calendar", status: "recommended" },
    ],
  },
  {
    letter: "Y",
    label: "Yield",
    tagline: "Recurring revenue & scaled impact",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    products: [
      { name: "Live Seminar", status: "recommended" },
      { name: "Certification Programme", status: "recommended" },
      { name: "Membership Community", status: "recommended" },
      { name: "Licensing & Franchise", status: "recommended" },
    ],
  },
];

function StatusDot({ status }: { status: FrameworkProduct["status"] }) {
  if (status === "built") {
    return <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />;
  }
  if (status === "recommended") {
    return <div className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 animate-pulse" />;
  }
  return <Lock className="w-2.5 h-2.5 text-muted-foreground/40 flex-shrink-0" />;
}

export default function ABBYFrameworkVisual({ hasConsultation, onConsultAbby, onNavigateTab }: Props) {
  if (!hasConsultation) {
    return null;
  }

  const tabMap: Record<string, string> = {
    Automate: "automate",
    Build: "build",
    Broadcast: "broadcast",
    Yield: "yield",
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-base">Your Customised ABBY Framework</h3>
          <p className="text-xs text-muted-foreground">
            Abby's recommended monetisation map based on your consultation
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onConsultAbby}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Refine with Abby
        </Button>
      </div>

      {/* Framework Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEFAULT_FRAMEWORK.map((cat, i) => (
          <motion.div
            key={`${cat.letter}-${cat.label}`}
            className={`rounded-xl border ${cat.borderColor} ${cat.bgColor} p-4 cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onNavigateTab(tabMap[cat.label])}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            whileHover={{ y: -2 }}
          >
            {/* Category header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${cat.color}`}>{cat.letter}</span>
                <span className={`text-sm font-bold ${cat.color}`}>{cat.label}</span>
              </div>
              <ArrowRight className={`h-3.5 w-3.5 ${cat.color} opacity-40`} />
            </div>

            <p className="text-[10px] text-muted-foreground mb-3 leading-tight">{cat.tagline}</p>

            {/* Product list */}
            <div className="space-y-1.5">
              {cat.products.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <StatusDot status={p.status} />
                  <span className="text-xs text-foreground/80 truncate">{p.name}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-border/50">
              <span className="text-[10px] font-medium text-muted-foreground">
                {cat.products.filter((p) => p.status === "built").length}/{cat.products.length} built
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span>Recommended by Abby</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Built</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />
          <span>Locked</span>
        </div>
      </div>
    </motion.div>
  );
}
