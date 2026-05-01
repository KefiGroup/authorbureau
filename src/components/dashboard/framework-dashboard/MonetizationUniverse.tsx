import { motion } from "framer-motion";
import { Lock, ArrowRight, CheckCircle2, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface StreamNode {
  label: string;
  price: string;
  status: "locked" | "unlocked" | "built" | "recommended";
  requiredTier?: string;
  nodeId?: string; // BP-XX / BA-XX / YR-XX — used to match against built/recommended sets
}

interface StreamGroup {
  id: string;
  letter: string;
  title: string;
  subtitle: string;
  tierLabel: string;
  color: string;
  nodes: StreamNode[];
}

const STREAMS: StreamGroup[] = [
  {
    id: "brand",
    letter: "B",
    title: "BRAND",
    subtitle: "Brand Products — Create Your Products",
    tierLabel: "From $49/mo",
    color: "#22C55E",
    nodes: [
      { label: "Book Sales", price: "$15–$30/book", status: "locked", requiredTier: "Brand", nodeId: "BP-09" },
      { label: "Workbooks", price: "$0–$27 (lead magnet)", status: "locked", requiredTier: "Brand", nodeId: "BP-06" },
      { label: "Home Study Courses", price: "$27–$97", status: "locked", requiredTier: "Brand", nodeId: "BP-07" },
      { label: "Special Editions", price: "$25–$150", status: "locked", requiredTier: "Brand", nodeId: "BP-08" },
      { label: "Lead Magnets", price: "Free download", status: "locked", requiredTier: "Brand", nodeId: "BP-02" },
      { label: "Webinars", price: "$0–$97", status: "locked", requiredTier: "Brand", nodeId: "BP-05" },
      { label: "Social Media Calendar", price: "Marketing asset", status: "locked", requiredTier: "Brand", nodeId: "BP-03" },
      { label: "Email Marketing", price: "Marketing asset", status: "locked", requiredTier: "Brand", nodeId: "BP-01" },
      { label: "Website / Microsite", price: "Included", status: "built", nodeId: "BP-04" },
    ],
  },
  {
    id: "build",
    letter: "B",
    title: "BUILD",
    subtitle: "Build Authority — Scale Your Audience",
    tierLabel: "Pro $199/mo",
    color: "#8B5CF6",
    nodes: [
      { label: "Online Courses", price: "$97–$497", status: "locked", requiredTier: "Pro", nodeId: "BA-10" },
      { label: "Audiobook", price: "$9.99–$24.99", status: "locked", requiredTier: "Pro", nodeId: "BA-11" },
      { label: "Memberships", price: "$9–$97/mo", status: "locked", requiredTier: "Pro", nodeId: "BA-12" },
      { label: "Group Coaching", price: "$297–$997/cohort", status: "locked", requiredTier: "Pro", nodeId: "BA-13" },
      { label: "Podcast Tour", price: "Marketing asset", status: "locked", requiredTier: "Pro", nodeId: "BA-14" },
      { label: "Media & PR", price: "Marketing asset", status: "locked", requiredTier: "Pro", nodeId: "BA-15" },
      { label: "Affiliates", price: "Commission-based", status: "locked", requiredTier: "Pro", nodeId: "BA-16" },
      { label: "Bundles", price: "Varies", status: "locked", requiredTier: "Pro", nodeId: "BA-17" },
      { label: "Revenue Sharing", price: "Commission-based", status: "locked", requiredTier: "Pro", nodeId: "BA-18" },
    ],
  },
  {
    id: "yield",
    letter: "Y",
    title: "YIELD",
    subtitle: "Yield Revenue — Premium Services",
    tierLabel: "Enterprise $499/mo",
    color: "#F59E0B",
    nodes: [
      { label: "Coaching", price: "$150–$500/session", status: "locked", requiredTier: "Yield", nodeId: "YR-19" },
      { label: "Consulting", price: "$2,500–$10,000+", status: "locked", requiredTier: "Yield", nodeId: "YR-20" },
      { label: "Keynotes", price: "$2,500–$25,000", status: "locked", requiredTier: "Yield", nodeId: "YR-21" },
      { label: "Training Programs", price: "$5,000–$25,000", status: "locked", requiredTier: "Yield", nodeId: "YR-22" },
      { label: "Masterminds", price: "$5,000–$25,000/yr", status: "locked", requiredTier: "Yield", nodeId: "YR-23" },
      { label: "Retreats & Bootcamps", price: "$997–$5,000", status: "locked", requiredTier: "Yield", nodeId: "YR-24" },
      { label: "Certification", price: "$2,500–$7,500", status: "locked", requiredTier: "Yield", nodeId: "YR-25" },
      { label: "Conventions / Conferences", price: "$197–$2,500/ticket", status: "locked", requiredTier: "Yield", nodeId: "YR-26" },
      { label: "Fund Raising", price: "Varies", status: "locked", requiredTier: "Yield", nodeId: "YR-27" },
      { label: "Exhibitors / JV", price: "Varies", status: "locked", requiredTier: "Yield", nodeId: "YR-28" },
    ],
  },
];

interface Props {
  activatedCount: number;
  builtProducts: string[];
  recommendedByAbby: string[];
  subscribedTier: string;
  onNavigateToStream?: (streamLabel: string) => void;
}

const INITIAL_VISIBLE = 3;

export default function MonetizationUniverse({ activatedCount, builtProducts, recommendedByAbby, subscribedTier, onNavigateToStream }: Props) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const totalStreams = STREAMS.reduce((s, g) => s + g.nodes.length, 0);

  const getNodeStatus = (node: StreamNode): StreamNode["status"] => {
    // Match by node-id first (canonical), fall back to label for legacy AI text.
    const matchesBuilt = (node.nodeId && builtProducts.includes(node.nodeId)) || builtProducts.includes(node.label);
    const matchesRecommended = (node.nodeId && recommendedByAbby.includes(node.nodeId)) || recommendedByAbby.includes(node.label);
    if (matchesBuilt) return "built";
    if (matchesRecommended) return "recommended";
    // If no books analyzed (no recommendations at all), everything stays locked
    if (recommendedByAbby.length === 0 && node.requiredTier) return "locked";
    if (!node.requiredTier) return "unlocked";
    const tierOrder = ["free", "brand", "build", "yield"];
    const userIdx = tierOrder.indexOf(subscribedTier.toLowerCase());
    const reqIdx = tierOrder.indexOf(node.requiredTier!.toLowerCase());
    return userIdx >= reqIdx ? "unlocked" : "locked";
  };

  const builtCount = STREAMS.reduce((s, g) => s + g.nodes.filter(n => getNodeStatus(n) === "built").length, 0);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.section
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0F172A" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="p-6 md:p-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-white">
            Your Monetization Universe
          </h2>
          <p className="text-gray-400 text-sm">
            One book. {totalStreams} revenue streams. <span className="text-amber-400 font-semibold">Your empire.</span>
          </p>
          <div className="max-w-xs mx-auto space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{builtCount} of {totalStreams} activated across all your books</span>
              <span>{Math.round((builtCount / totalStreams) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-green-500 via-violet-500 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${(builtCount / totalStreams) * 100}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STREAMS.map((group) => {
            const expanded = expandedGroups[group.id] ?? false;
            const visibleNodes = expanded ? group.nodes : group.nodes.slice(0, INITIAL_VISIBLE);
            const hiddenCount = group.nodes.length - INITIAL_VISIBLE;

            return (
              <div key={group.id} className="space-y-3">
                {/* Group header */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.letter}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{group.letter} · {group.title}</p>
                      <p className="text-gray-500 text-[10px]">{group.nodes.length} streams</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-[10px] pl-10">{group.subtitle}</p>
                  {/* Show tier label only for non-subscribers */}
                  {subscribedTier === "free" && (
                    <p className="text-[10px] font-semibold pl-10" style={{ color: group.color }}>{group.tierLabel}</p>
                  )}
                </div>

                {/* Nodes */}
                <div className="space-y-1.5">
                  {visibleNodes.map((node) => {
                    const status = getNodeStatus(node);
                    const isHovered = hoveredNode === `${group.id}-${node.label}`;

                    return (
                      <div
                        key={node.label}
                        className={`relative rounded-lg border px-3 py-2.5 transition-all ${
                          status === "built" || status === "recommended" || status === "unlocked" ? "cursor-pointer" : "cursor-default"
                        } ${
                          status === "built"
                            ? "border-green-500/40 bg-green-500/10"
                            : status === "recommended"
                            ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
                            : status === "unlocked"
                            ? "border-gray-600 bg-gray-800/50 hover:border-gray-500"
                            : "border-gray-700/50 bg-gray-900/50 opacity-60"
                        }`}
                        onClick={() => {
                          if (status !== "locked" && onNavigateToStream) onNavigateToStream(node.label);
                        }}
                        onMouseEnter={() => setHoveredNode(`${group.id}-${node.label}`)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {status === "built" && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                            {status === "recommended" && (
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              </motion.div>
                            )}
                            {status === "locked" && <Lock className="h-3 w-3 text-gray-600 shrink-0" />}
                            {status === "unlocked" && <div className="w-3 h-3 rounded-full border-2 shrink-0" style={{ borderColor: group.color }} />}
                            <span className={`text-xs font-medium truncate ${status === "locked" ? "text-gray-500" : "text-gray-200"}`}>
                              {node.label}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-500 shrink-0 whitespace-nowrap">
                            {status === "locked" ? (
                              // Check if user's tier already covers this — if so, show "Included" not "Unlock with X"
                              (() => {
                                const tierOrder = ["free", "brand", "build", "yield"];
                                const userIdx = tierOrder.indexOf(subscribedTier.toLowerCase());
                                const reqIdx = node.requiredTier ? tierOrder.indexOf(node.requiredTier.toLowerCase()) : 0;
                                return userIdx >= reqIdx ? "Included in your plan" : `Unlock with ${node.requiredTier}`;
                              })()
                            ) : node.price}
                          </span>
                        </div>

                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute z-10 left-0 right-0 -bottom-1 translate-y-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 shadow-xl"
                          >
                            <p className="text-[10px] text-gray-300 font-medium">{node.label}</p>
                            <p className="text-[10px] text-gray-400">{node.price}</p>
                            {status === "locked" && (
                              <p className="text-[10px] text-amber-400 mt-1">🔒 Unlock with {node.requiredTier}</p>
                            )}
                            {status === "unlocked" && (
                              <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                                <ArrowRight className="h-2.5 w-2.5" /> Open Builder
                              </p>
                            )}
                            {status === "built" && (
                              <p className="text-[10px] text-green-400 mt-1">✅ Built</p>
                            )}
                            {status === "recommended" && (
                              <p className="text-[10px] text-amber-400 mt-1">⭐ Recommended by Abby</p>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expand/collapse */}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center gap-1 text-[11px] font-medium pl-1 transition-colors hover:text-white"
                    style={{ color: group.color }}
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" /> Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" /> +{hiddenCount} more streams — See All
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
