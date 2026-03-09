import { motion } from "framer-motion";
import { ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import type { SubscriptionTier } from "@/hooks/useAuth";
import { hasTierAccess } from "@/hooks/useAuth";

interface Props {
  hasConsultation: boolean;
  tier: SubscriptionTier;
  completedAssets: string[];
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

interface NodeDef {
  label: string;
  id: string;
  requiredTier: SubscriptionTier;
}

interface BBYPhase {
  id: string;
  letter: string;
  title: string;
  subtitle: string;
  color: string;
  nodes: NodeDef[];
}

const BBY_PHASES: BBYPhase[] = [
  {
    id: "revenue-streams", letter: "B", title: "B · Build", subtitle: "Build authority & digital assets",
    color: "#10b981",
    nodes: [
      { label: "Online Courses", id: "courses", requiredTier: "pro" },
      { label: "Home Study Courses", id: "home-study", requiredTier: "pro" },
      { label: "Workbook", id: "workbooks", requiredTier: "starter" },
      { label: "Audiobook", id: "audiobook", requiredTier: "pro" },
      { label: "Monthly Memberships", id: "memberships", requiredTier: "pro" },
      { label: "Upsells / Downsells", id: "upsells", requiredTier: "pro" },
      { label: "Social Media", id: "social-media", requiredTier: "starter" },
      { label: "Webinars", id: "webinars", requiredTier: "pro" },
      { label: "Podcasts (Guest)", id: "podcast-guest", requiredTier: "pro" },
      { label: "Website / Microsite", id: "microsite", requiredTier: "starter" },
      { label: "Email Marketing", id: "email-marketing", requiredTier: "starter" },
    ],
  },
  {
    id: "marketing-channels", letter: "B", title: "B · Bridge", subtitle: "Bridge marketing channels & connections",
    color: "#8b5cf6",
    nodes: [
      { label: "1-on-1 Coaching", id: "coaching-1on1", requiredTier: "pro" },
      { label: "Group Coaching", id: "group-coaching", requiredTier: "pro" },
      { label: "Big Ticket Consulting", id: "big-ticket", requiredTier: "pro" },
      { label: "Revenue Sharing / JV", id: "revenue-sharing", requiredTier: "pro" },
      { label: "Keynotes", id: "keynotes", requiredTier: "pro" },
      { label: "In-House Speaker", id: "in-house-speaker", requiredTier: "pro" },
      { label: "Training Programs", id: "training", requiredTier: "pro" },
      { label: "Affiliates", id: "affiliates", requiredTier: "pro" },
    ],
  },
  {
    id: "authority-builders", letter: "Y", title: "Y · Yield", subtitle: "Yield revenue streams & monetize",
    color: "#0ea5e9",
    nodes: [
      { label: "Retreats & Bootcamps", id: "retreats", requiredTier: "enterprise" },
      { label: "Certification", id: "certification", requiredTier: "enterprise" },
      { label: "Masterminds", id: "masterminds", requiredTier: "enterprise" },
      { label: "Special Editions", id: "special-editions", requiredTier: "enterprise" },
      { label: "Book Sales (Events)", id: "book-sales-events", requiredTier: "enterprise" },
      { label: "Conventions / Conferences", id: "conventions", requiredTier: "enterprise" },
      { label: "Fund Raising", id: "fundraising", requiredTier: "enterprise" },
      { label: "Exhibitors / JV", id: "exhibitors", requiredTier: "enterprise" },
    ],
  },
];

const totalNodes = BBY_PHASES.reduce((s, p) => s + p.nodes.length, 0);

export default function ABBYFrameworkVisual({ hasConsultation, tier, completedAssets, onConsultAbby, onNavigateTab }: Props) {
  const activatedCount = completedAssets.length;
  const isAnalyzed = hasConsultation;

  const isNodeCompleted = (nodeId: string): boolean => {
    return completedAssets.includes(nodeId) || completedAssets.includes(nodeId.replace(/-/g, "_"));
  };

  return (
    <motion.div
      className="space-y-0"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="w-full space-y-4">
        <div className="text-center mb-2">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted rounded-full px-4 py-1 mb-2">
            Your Monetization Map
          </span>
          <h4 className="font-heading font-bold text-base">
            {isAnalyzed
              ? `${activatedCount} of ${totalNodes} streams activated`
              : "Analyze your book to discover which streams fit your expertise"
            }
          </h4>
        </div>

        {/* BBY Phase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BBY_PHASES.map((phase) => {
            const completedInPhase = phase.nodes.filter(n => isNodeCompleted(n.id)).length;
            return (
              <button
                key={phase.id}
                onClick={() => onNavigateTab(phase.id)}
                className="group rounded-xl border border-border bg-card p-4 text-left hover:shadow-md hover:border-muted-foreground/20 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
                    style={{ background: phase.color }}
                  >
                    <span className="text-white text-sm font-black">{phase.letter}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">{phase.title}</h4>
                    <span className="text-[10px] text-muted-foreground">
                      {isAnalyzed
                        ? `${completedInPhase} of ${phase.nodes.length} built`
                        : phase.subtitle
                      }
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{phase.nodes.length}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {phase.nodes.map((node) => {
                    const completed = isNodeCompleted(node.id);
                    const accessible = hasTierAccess(tier, node.requiredTier);
                    const recommended = isAnalyzed; // When analyzed, all are "recommended" (simplified)

                    let tagClasses = "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[9px] ";
                    if (completed) {
                      tagClasses += "border-emerald-300 bg-emerald-100 text-emerald-700";
                    } else if (isAnalyzed && recommended) {
                      tagClasses += accessible
                        ? "border-border bg-white text-foreground"
                        : "border-border bg-muted/50 text-muted-foreground";
                    } else {
                      tagClasses += "border-border bg-muted/50 text-muted-foreground";
                    }

                    return (
                      <span key={node.id} className={tagClasses}>
                        {completed && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />}
                        {!completed && !accessible && isAnalyzed && <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />}
                        {node.label}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 mt-3 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground pt-6">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
          <span>A · Analyze</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#10b981" }} />
          <span>B · Build</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#8b5cf6" }} />
          <span>B · Bridge</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#0ea5e9" }} />
          <span>Y · Yield</span>
        </div>
      </div>
    </motion.div>
  );
}
