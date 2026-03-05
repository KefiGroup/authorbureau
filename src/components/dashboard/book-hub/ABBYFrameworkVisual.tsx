import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasConsultation: boolean;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

interface RevenueNode {
  label: string;
  active: boolean;
}

interface StepCluster {
  id: string;
  step: number;
  letter: string;
  title: string;
  subtitle: string;
  color: string;        // tailwind bg for hub
  nodeColor: string;     // tailwind bg for satellite
  nodeBorder: string;
  nodes: RevenueNode[];
  tabKey: string;
}

const CLUSTERS: StepCluster[] = [
  {
    id: "automate",
    step: 1,
    letter: "A",
    title: "DIGITAL PRODUCTS",
    subtitle: "Automate",
    color: "bg-blue-500",
    nodeColor: "bg-blue-400",
    nodeBorder: "border-blue-300",
    tabKey: "automate",
    nodes: [
      { label: "Online Courses", active: false },
      { label: "Affiliates", active: false },
      { label: "Audio Book", active: false },
      { label: "Home Study Courses", active: false },
      { label: "Webinars", active: false },
      { label: "Website", active: false },
      { label: "Workbook", active: false },
      { label: "Monthly Memberships", active: false },
      { label: "Upsells / Downsells", active: false },
      { label: "Social Media", active: false },
    ],
  },
  {
    id: "build",
    step: 2,
    letter: "B",
    title: "COACHING / CONSULTING",
    subtitle: "Build",
    color: "bg-amber-600",
    nodeColor: "bg-amber-500",
    nodeBorder: "border-amber-300",
    tabKey: "build",
    nodes: [
      { label: "1-on-1 Coaching", active: false },
      { label: "Group Coaching", active: false },
      { label: "Big Ticket", active: false },
      { label: "Revenue Sharing", active: false },
    ],
  },
  {
    id: "broadcast",
    step: 3,
    letter: "B",
    title: "SPEAKING",
    subtitle: "Broadcast",
    color: "bg-rose-400",
    nodeColor: "bg-rose-400",
    nodeBorder: "border-rose-300",
    tabKey: "broadcast",
    nodes: [
      { label: "JVs", active: false },
      { label: "Podcasts", active: false },
      { label: "Book Sales", active: false },
      { label: "Fund Raising", active: false },
      { label: "In-House Speaker", active: false },
      { label: "Special Editions", active: false },
    ],
  },
  {
    id: "yield",
    step: 4,
    letter: "Y",
    title: "SEMINARS",
    subtitle: "Yield",
    color: "bg-emerald-500",
    nodeColor: "bg-emerald-400",
    nodeBorder: "border-emerald-300",
    tabKey: "yield",
    nodes: [
      { label: "Retreats & Bootcamps", active: false },
      { label: "Certification", active: false },
      { label: "Masterminds", active: false },
      { label: "Exhibitors / JV", active: false },
      { label: "Conventions", active: false },
      { label: "Training Programs", active: false },
      { label: "Conferences", active: false },
    ],
  },
];

/* ── helpers to fan satellite nodes in an arc around each hub ── */

function getNodePositions(count: number, radius: number, startAngle: number, sweep: number) {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (sweep / Math.max(count - 1, 1)) * i;
    const rad = (angle * Math.PI) / 180;
    positions.push({ x: Math.cos(rad) * radius, y: Math.sin(rad) * radius });
  }
  return positions;
}

/* ── quadrant layout: hub positions + arc directions ── */

const QUADRANT_CONFIG: Record<string, { hubX: number; hubY: number; startAngle: number; sweep: number; radius: number }> = {
  automate:  { hubX: 22, hubY: 25, startAngle: 180, sweep: 180, radius: 140 },
  build:     { hubX: 22, hubY: 75, startAngle: 180, sweep: 150, radius: 120 },
  broadcast: { hubX: 78, hubY: 75, startAngle: -30, sweep: 180, radius: 120 },
  yield:     { hubX: 78, hubY: 25, startAngle: -10, sweep: 180, radius: 140 },
};

function SatelliteNode({ node, x, y, color, border, delay }: {
  node: RevenueNode; x: number; y: number; color: string; border: string; delay: number;
}) {
  return (
    <motion.div
      className="absolute flex flex-col items-center gap-1 pointer-events-auto"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md
          ${node.active ? color : "bg-muted"} ${!node.active ? "opacity-50" : ""} border-2 ${node.active ? border : "border-muted-foreground/20"}`}
      >
        $
      </div>
      <span className={`text-[8px] sm:text-[9px] font-medium text-center leading-tight max-w-[72px]
        ${node.active ? "text-foreground" : "text-muted-foreground"}`}>
        {node.label}
      </span>
    </motion.div>
  );
}

function ClusterGroup({ cluster, containerW, containerH, onClick, index }: {
  cluster: StepCluster; containerW: number; containerH: number; onClick: () => void; index: number;
}) {
  const cfg = QUADRANT_CONFIG[cluster.id];
  const hubPxX = (cfg.hubX / 100) * containerW;
  const hubPxY = (cfg.hubY / 100) * containerH;

  // Scale radius based on container
  const scale = Math.min(containerW, containerH) / 600;
  const radius = cfg.radius * Math.max(scale, 0.55);
  const positions = getNodePositions(cluster.nodes.length, radius, cfg.startAngle, cfg.sweep);
  const activeCount = cluster.nodes.filter((n) => n.active).length;

  return (
    <div className="absolute inset-0">
      {/* Dashed lines from hub to each node */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
        {positions.map((pos, i) => (
          <line
            key={i}
            x1={hubPxX}
            y1={hubPxY}
            x2={hubPxX + pos.x}
            y2={hubPxY + pos.y}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ))}
      </svg>

      {/* Satellite nodes */}
      {cluster.nodes.map((node, i) => (
        <SatelliteNode
          key={node.label}
          node={node}
          x={hubPxX + positions[i].x}
          y={hubPxY + positions[i].y}
          color={cluster.nodeColor}
          border={cluster.nodeBorder}
          delay={0.15 + index * 0.1 + i * 0.04}
        />
      ))}

      {/* Hub node */}
      <motion.div
        className={`absolute flex flex-col items-center justify-center rounded-full shadow-lg cursor-pointer
          w-20 h-20 sm:w-24 sm:h-24 ${cluster.color} text-white z-10`}
        style={{ left: hubPxX, top: hubPxY, transform: "translate(-50%, -50%)" }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 * index }}
        whileHover={{ scale: 1.08 }}
        onClick={onClick}
      >
        <span className="text-[9px] font-bold opacity-80">STEP {cluster.step}</span>
        <span className="text-[10px] sm:text-xs font-extrabold leading-tight text-center px-1">{cluster.title}</span>
        <span className="text-[8px] opacity-70 mt-0.5">{activeCount}/{cluster.nodes.length}</span>
      </motion.div>
    </div>
  );
}

export default function ABBYFrameworkVisual({ hasConsultation, onConsultAbby, onNavigateTab }: Props) {
  if (!hasConsultation) return null;

  const totalNodes = CLUSTERS.reduce((s, c) => s + c.nodes.length, 0);
  const activeNodes = CLUSTERS.reduce((s, c) => s + c.nodes.filter((n) => n.active).length, 0);

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
          <h3 className="font-heading font-bold text-base">Your ABBY Monetisation Map</h3>
          <p className="text-xs text-muted-foreground">
            {activeNodes} of {totalNodes} revenue streams activated
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onConsultAbby}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Refine with Abby
        </Button>
      </div>

      {/* Constellation Map */}
      <div className="relative w-full rounded-2xl border border-border bg-card overflow-hidden" style={{ height: 520 }}>
        {/* Center book icon */}
        <motion.div
          className="absolute z-20 flex flex-col items-center gap-1"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg bg-gradient-to-br from-secondary/80 to-secondary shadow-xl flex items-center justify-center border-2 border-secondary-foreground/20">
            <span className="text-2xl sm:text-3xl">📖</span>
          </div>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Your Book</span>
        </motion.div>

        {/* Arrow lines from center to hubs */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]">
          {CLUSTERS.map((cluster) => {
            const cfg = QUADRANT_CONFIG[cluster.id];
            return (
              <motion.line
                key={cluster.id}
                x1="50%"
                y1="50%"
                x2={`${cfg.hubX}%`}
                y2={`${cfg.hubY}%`}
                stroke="hsl(var(--secondary))"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity={0.4}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8 }}
              />
            );
          })}
        </svg>

        {/* Cluster groups */}
        {CLUSTERS.map((cluster, i) => (
          <ClusterGroup
            key={cluster.id}
            cluster={cluster}
            containerW={800}
            containerH={520}
            onClick={() => onNavigateTab(cluster.tabKey)}
            index={i}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-blue-300" />
          <span>Activated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted opacity-50 border-2 border-muted-foreground/20" />
          <span>Not yet activated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0 border-t border-dashed border-border" style={{ width: 16 }} />
          <span>Revenue connection</span>
        </div>
      </div>
    </motion.div>
  );
}
