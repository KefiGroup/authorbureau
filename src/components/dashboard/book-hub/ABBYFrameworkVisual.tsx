import { motion } from "framer-motion";
import { ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SubscriptionTier } from "@/hooks/useAuth";
import { hasTierAccess } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  hasConsultation: boolean;
  tier: SubscriptionTier;
  completedAssets: string[];
  recommendedNodes: string[];
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
  categoryKey: "build" | "bridge" | "yield";
  nodes: NodeDef[];
}

const BBY_PHASES: BBYPhase[] = [
  {
    id: "revenue-streams", letter: "B", title: "B · Brand", subtitle: "Brand Products — Create your products",
    color: "#10b981", categoryKey: "build",
    nodes: [
      { label: "Book Sales", id: "book-sales-events", requiredTier: "brand" },
      { label: "Workbook", id: "workbooks", requiredTier: "brand" },
      { label: "Home Study Courses", id: "home-study", requiredTier: "brand" },
      { label: "Special Editions", id: "special-editions", requiredTier: "brand" },
      { label: "Lead Magnets", id: "lead-magnet", requiredTier: "brand" },
      { label: "Webinars", id: "webinars", requiredTier: "brand" },
      { label: "Social Media", id: "social-media", requiredTier: "brand" },
      { label: "Email Marketing", id: "email-marketing", requiredTier: "brand" },
      { label: "Website / Microsite", id: "microsite", requiredTier: "brand" },
    ],
  },
  {
    id: "marketing-channels", letter: "B", title: "B · Build", subtitle: "Build Authority — Scale your audience",
    color: "#8b5cf6", categoryKey: "bridge",
    nodes: [
      { label: "Online Courses", id: "courses", requiredTier: "build" },
      { label: "Audiobook", id: "audiobook", requiredTier: "build" },
      { label: "Memberships", id: "memberships", requiredTier: "build" },
      { label: "Group Coaching", id: "group-coaching", requiredTier: "build" },
      { label: "Podcast Tour", id: "podcast-guest", requiredTier: "build" },
      { label: "Media Outreach", id: "in-house-speaker", requiredTier: "build" },
      { label: "Affiliates", id: "affiliates", requiredTier: "build" },
      { label: "Upsells / Downsells", id: "upsells", requiredTier: "build" },
      { label: "Revenue Sharing", id: "revenue-sharing", requiredTier: "build" },
    ],
  },
  {
    id: "authority-builders", letter: "Y", title: "Y · Yield", subtitle: "Yield Revenue — Premium services",
    color: "#0ea5e9", categoryKey: "yield",
    nodes: [
      { label: "Coaching", id: "coaching-1on1", requiredTier: "yield" },
      { label: "Consulting", id: "big-ticket", requiredTier: "yield" },
      { label: "Keynotes", id: "keynotes", requiredTier: "yield" },
      { label: "Training Programs", id: "training", requiredTier: "yield" },
      { label: "Masterminds", id: "masterminds", requiredTier: "yield" },
      { label: "Retreats & Bootcamps", id: "retreats", requiredTier: "yield" },
      { label: "Certification", id: "certification", requiredTier: "yield" },
      { label: "Conventions / Conferences", id: "conventions", requiredTier: "yield" },
      { label: "Fund Raising", id: "fundraising", requiredTier: "yield" },
      { label: "Exhibitors / JV", id: "exhibitors", requiredTier: "yield" },
    ],
  },
];

const totalNodes = BBY_PHASES.reduce((s, p) => s + p.nodes.length, 0);

// Category-specific styles for each state
const builtStyles: Record<string, string> = {
  build: "bg-green-600 text-white border-green-600",
  bridge: "bg-purple-600 text-white border-purple-600",
  yield: "bg-amber-600 text-white border-amber-600",
};

const recommendedStyles: Record<string, string> = {
  build: "border-green-600 text-green-700 bg-green-50",
  bridge: "border-purple-600 text-purple-700 bg-purple-50",
  yield: "border-amber-600 text-amber-700 bg-amber-50",
};

export default function ABBYFrameworkVisual({ hasConsultation, tier, completedAssets, recommendedNodes, onConsultAbby, onNavigateTab }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isAnalyzed = hasConsultation;

  const isNodeCompleted = (nodeId: string): boolean => {
    return completedAssets.includes(nodeId) || completedAssets.includes(nodeId.replace(/-/g, "_"));
  };

  const isNodeRecommended = (nodeId: string): boolean => {
    return recommendedNodes.includes(nodeId) || recommendedNodes.includes(nodeId.replace(/-/g, "_"));
  };

  const totalRecommended = isAnalyzed ? BBY_PHASES.reduce((s, p) => s + p.nodes.filter(n => isNodeRecommended(n.id)).length, 0) : 0;
  const totalBuilt = BBY_PHASES.reduce((s, p) => s + p.nodes.filter(n => isNodeCompleted(n.id)).length, 0);

  const handleTagClick = (node: NodeDef, completed: boolean, recommended: boolean) => {
    if (completed) {
      // Navigate to product review
      onNavigateTab("revenue-streams");
    } else if (recommended && isAnalyzed) {
      onNavigateTab("revenue-streams");
    }
    // Not recommended → no action
  };

  const getTooltipText = (node: NodeDef, completed: boolean, recommended: boolean): string => {
    if (completed) return `View your ${node.label}`;
    if (recommended && isAnalyzed) return "Click to start building";
    return "Not recommended for this book";
  };

  const handleTagInteraction = (node: NodeDef, completed: boolean, recommended: boolean) => {
    if (isMobile) {
      toast({ title: getTooltipText(node, completed, recommended), duration: 2000 });
      handleTagClick(node, completed, recommended);
    } else {
      handleTagClick(node, completed, recommended);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
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
                ? `${totalRecommended} of ${totalNodes} streams recommended · ${totalBuilt} built`
                : "0 of 28 streams activated — Analyze with Abby to get started"
              }
            </h4>
          </div>

          {/* BBY Phase Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BBY_PHASES.map((phase) => {
              const completedInPhase = phase.nodes.filter(n => isNodeCompleted(n.id)).length;
              const recommendedInPhase = phase.nodes.filter(n => isNodeRecommended(n.id)).length;
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
                          ? `${completedInPhase} of ${phase.nodes.length} built · ${recommendedInPhase} recommended`
                          : phase.subtitle
                        }
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{phase.nodes.length}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {phase.nodes.map((node) => {
                      const completed = isNodeCompleted(node.id);
                      const recommended = isNodeRecommended(node.id);
                      const catKey = phase.categoryKey;

                      let tagClasses = "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[9px] transition-colors ";

                      if (completed) {
                        tagClasses += builtStyles[catKey];
                      } else if (isAnalyzed && recommended) {
                        tagClasses += recommendedStyles[catKey];
                      } else {
                        // Not recommended or not analyzed
                        tagClasses += "border-gray-300 text-gray-400 bg-gray-50 opacity-60";
                      }

                      const tooltipText = getTooltipText(node, completed, recommended);
                      const isClickable = completed || (recommended && isAnalyzed);

                      const tagContent = (
                        <span
                          key={node.id}
                          className={`${tagClasses} ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isClickable) handleTagInteraction(node, completed, recommended);
                          }}
                        >
                          {completed && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {node.label}
                        </span>
                      );

                      if (isMobile) return tagContent;

                      return (
                        <Tooltip key={node.id}>
                          <TooltipTrigger asChild>{tagContent}</TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {tooltipText}
                          </TooltipContent>
                        </Tooltip>
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
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] text-muted-foreground pt-6">
          {/* States */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-600" />
            <span>Built</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-green-600 bg-transparent" />
            <span>Recommended</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span>Not in plan</span>
          </div>
          {/* Separator */}
          <span className="text-muted-foreground/30">|</span>
          {/* Category colors */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#10b981" }} />
            <span>B · Brand</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#8b5cf6" }} />
            <span>B · Build</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
            <span>Y · Yield</span>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
