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
  title: string;
  hubColor: string;
  nodeColor: string;
  nodeColorMuted: string;
  nodes: RevenueNode[];
  tabKey: string;
}

const CLUSTERS: StepCluster[] = [
  {
    id: "automate", step: 1, title: "DIGITAL\nPRODUCTS",
    hubColor: "#3b82f6", nodeColor: "#60a5fa", nodeColorMuted: "#93c5fd",
    tabKey: "automate",
    nodes: [
      { label: "Online Courses", active: false },
      { label: "Affiliates", active: false },
      { label: "Audio Book", active: false },
      { label: "Home Study\nCourses", active: false },
      { label: "Webinars", active: false },
      { label: "Website", active: false },
      { label: "Workbook", active: false },
      { label: "Monthly\nMemberships", active: false },
      { label: "Upsells /\nDownsells", active: false },
      { label: "Social Media", active: false },
    ],
  },
  {
    id: "build", step: 2, title: "COACHING /\nCONSULTING",
    hubColor: "#d97706", nodeColor: "#f59e0b", nodeColorMuted: "#fcd34d",
    tabKey: "build",
    nodes: [
      { label: "1-on-1\nCoaching", active: false },
      { label: "Group\nCoaching", active: false },
      { label: "Big Ticket", active: false },
      { label: "Revenue\nSharing", active: false },
    ],
  },
  {
    id: "broadcast", step: 3, title: "SPEAKING",
    hubColor: "#f43f5e", nodeColor: "#fb7185", nodeColorMuted: "#fda4af",
    tabKey: "broadcast",
    nodes: [
      { label: "JVs", active: false },
      { label: "Podcasts", active: false },
      { label: "Book Sales", active: false },
      { label: "Fund Raising", active: false },
      { label: "In-House\nSpeaker", active: false },
      { label: "Special\nEditions", active: false },
    ],
  },
  {
    id: "yield", step: 4, title: "SEMINARS",
    hubColor: "#10b981", nodeColor: "#34d399", nodeColorMuted: "#6ee7b7",
    tabKey: "yield",
    nodes: [
      { label: "Retreats &\nBootcamps", active: false },
      { label: "Certification", active: false },
      { label: "Masterminds", active: false },
      { label: "Exhibitors /\nJV", active: false },
      { label: "Conventions", active: false },
      { label: "Training\nPrograms", active: false },
      { label: "Conferences", active: false },
    ],
  },
];

/* ── SVG viewBox ── */
const VW = 900;
const VH = 700;
const CX = VW / 2;
const CY = VH / 2;

/* Hub positions + arc config — compact but non-overlapping */
const HUB_CFG: Record<string, { x: number; y: number; startDeg: number; sweepDeg: number; r: number }> = {
  automate:  { x: 190, y: 170, startDeg: 130, sweepDeg: 180, r: 130 },
  build:     { x: 190, y: 530, startDeg: 160, sweepDeg: 140, r: 120 },
  broadcast: { x: 710, y: 530, startDeg: -20, sweepDeg: 140, r: 120 },
  yield:     { x: 710, y: 170, startDeg: -30, sweepDeg: 180, r: 130 },
};

function arcPositions(count: number, cx: number, cy: number, r: number, startDeg: number, sweepDeg: number) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startDeg + (sweepDeg / Math.max(count - 1, 1)) * i;
    const rad = (angle * Math.PI) / 180;
    out.push({ x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r });
  }
  return out;
}

/* Multi-line SVG text helper */
function MultiLineText({ x, y, text, fontSize, fill, fontWeight, opacity, anchor }: {
  x: number; y: number; text: string; fontSize: number; fill: string; fontWeight?: string; opacity?: number; anchor?: string;
}) {
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.2;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return (
    <>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={startY + i * lineHeight}
          textAnchor={anchor || "middle"}
          dominantBaseline="central"
          fill={fill}
          fontSize={fontSize}
          fontWeight={fontWeight || "normal"}
          opacity={opacity ?? 1}
        >
          {line}
        </text>
      ))}
    </>
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

      {/* Constellation Map — pure SVG */}
      <div className="w-full rounded-2xl border border-border bg-card overflow-hidden">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full h-auto"
          style={{ minHeight: 340, maxHeight: 520 }}
        >
          {/* Dashed lines: center → hubs */}
          {CLUSTERS.map((c) => {
            const h = HUB_CFG[c.id];
            return (
              <line
                key={`ctr-${c.id}`}
                x1={CX} y1={CY} x2={h.x} y2={h.y}
                stroke="hsl(var(--secondary))"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                opacity={0.35}
              />
            );
          })}

          {/* Dashed lines: hubs → nodes */}
          {CLUSTERS.map((c) => {
            const h = HUB_CFG[c.id];
            const positions = arcPositions(c.nodes.length, h.x, h.y, h.r, h.startDeg, h.sweepDeg);
            return positions.map((pos, i) => (
              <line
                key={`spoke-${c.id}-${i}`}
                x1={h.x} y1={h.y} x2={pos.x} y2={pos.y}
                stroke="hsl(var(--border))"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity={0.45}
              />
            ));
          })}

          {/* Product nodes */}
          {CLUSTERS.map((c) => {
            const h = HUB_CFG[c.id];
            const positions = arcPositions(c.nodes.length, h.x, h.y, h.r, h.startDeg, h.sweepDeg);
            return positions.map((pos, i) => {
              const node = c.nodes[i];
              return (
                <g key={`node-${c.id}-${i}`}>
                  <circle
                    cx={pos.x} cy={pos.y} r={18}
                    fill={node.active ? c.nodeColor : "hsl(var(--muted))"}
                    stroke={node.active ? c.nodeColorMuted : "hsl(var(--border))"}
                    strokeWidth="2"
                    opacity={node.active ? 1 : 0.5}
                  />
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill="white" fontSize="11" fontWeight="bold"
                    opacity={node.active ? 1 : 0.6}
                  >
                    {node.active ? "✓" : "$"}
                  </text>
                  <MultiLineText
                    x={pos.x} y={pos.y + 28}
                    text={node.label}
                    fontSize={9}
                    fill="hsl(var(--foreground))"
                    fontWeight="500"
                    opacity={node.active ? 0.9 : 0.5}
                  />
                </g>
              );
            });
          })}

          {/* Hub circles */}
          {CLUSTERS.map((c) => {
            const h = HUB_CFG[c.id];
            const activeCount = c.nodes.filter((n) => n.active).length;
            return (
              <g key={`hub-${c.id}`} className="cursor-pointer">
                <circle cx={h.x} cy={h.y} r={46} fill={c.hubColor} />
                <circle cx={h.x} cy={h.y} r={46} fill="none" stroke="white" strokeWidth="1.5" opacity={0.2} />
                <text x={h.x} y={h.y - 14} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="8" fontWeight="bold" opacity={0.8}>
                  STEP {c.step}
                </text>
                <MultiLineText
                  x={h.x} y={h.y + 2}
                  text={c.title}
                  fontSize={10}
                  fill="white"
                  fontWeight="800"
                />
                <text x={h.x} y={h.y + 24} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="8" opacity={0.7}>
                  {activeCount}/{c.nodes.length}
                </text>
              </g>
            );
          })}

          {/* Center book */}
          <g>
            <rect x={CX - 28} y={CY - 34} width={56} height={68} rx={8}
              fill="hsl(var(--secondary))" opacity={0.9} />
            <rect x={CX - 28} y={CY - 34} width={56} height={68} rx={8}
              fill="none" stroke="white" strokeWidth="1.5" opacity={0.15} />
            <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="central" fontSize="26">
              📖
            </text>
            <text x={CX} y={CY + 46} textAnchor="middle" fill="hsl(var(--muted-foreground))"
              fontSize="9" fontWeight="bold" letterSpacing="1.5">
              YOUR BOOK
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#60a5fa" }} />
          <span>Activated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted border-2 border-border" />
          <span>Not yet activated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t border-dashed border-border" style={{ width: 16 }} />
          <span>Revenue connection</span>
        </div>
      </div>
    </motion.div>
  );
}
