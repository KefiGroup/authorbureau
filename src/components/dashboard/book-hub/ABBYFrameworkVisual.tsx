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

interface CategoryCluster {
  id: string;
  title: string;
  emoji: string;
  hubColor: string;
  nodeColor: string;
  nodeColorMuted: string;
  nodes: RevenueNode[];
  tabKey: string;
}

const CLUSTERS: CategoryCluster[] = [
  {
    id: "revenue", title: "REVENUE\nSTREAMS", emoji: "💰",
    hubColor: "#10b981", nodeColor: "#34d399", nodeColorMuted: "#6ee7b7",
    tabKey: "revenue-streams",
    nodes: [
      { label: "Workbook", active: false },
      { label: "Audio Book", active: false },
      { label: "Online\nCourses", active: false },
      { label: "Home Study\nCourse", active: false },
      { label: "Webinars", active: false },
      { label: "Monthly\nMemberships", active: false },
      { label: "Upsells /\nDownsells", active: false },
      { label: "Certification", active: false },
      { label: "Masterminds", active: false },
      { label: "Retreats &\nBootcamps", active: false },
    ],
  },
  {
    id: "marketing", title: "MARKETING\nCHANNELS", emoji: "📣",
    hubColor: "#8b5cf6", nodeColor: "#a78bfa", nodeColorMuted: "#c4b5fd",
    tabKey: "marketing-channels",
    nodes: [
      { label: "Social Media", active: false },
      { label: "Podcast\nScripts", active: false },
      { label: "Podcast\nPitches", active: false },
      { label: "Affiliates", active: false },
      { label: "Book Sales\nat Events", active: false },
      { label: "Conventions", active: false },
      { label: "Fund\nRaising", active: false },
      { label: "Joint\nVentures", active: false },
      { label: "Special\nEditions", active: false },
    ],
  },
  {
    id: "authority", title: "AUTHORITY\nBUILDERS", emoji: "🏆",
    hubColor: "#0ea5e9", nodeColor: "#38bdf8", nodeColorMuted: "#7dd3fc",
    tabKey: "authority-builders",
    nodes: [
      { label: "1-on-1\nCoaching", active: false },
      { label: "Group\nCoaching", active: false },
      { label: "Big Ticket\nConsulting", active: false },
      { label: "Coaching\nMembership", active: false },
      { label: "Keynotes", active: false },
      { label: "Corporate\nTraining", active: false },
      { label: "In-House\nSpeaker", active: false },
      { label: "Revenue\nSharing", active: false },
      { label: "Exhibitors /\nJV", active: false },
    ],
  },
];

/* ── SVG viewBox ── */
const VW = 1200;
const VH = 800;
const CX = VW / 2;
const CY = VH / 2;

/* Hub positions: 3 clusters arranged around center */
const HUB_CFG: Record<string, { x: number; y: number; startDeg: number; sweepDeg: number; r: number }> = {
  revenue:   { x: 300, y: 250, startDeg: 90, sweepDeg: 300, r: 150 },
  marketing: { x: 300, y: 620, startDeg: -30, sweepDeg: 210, r: 150 },
  authority: { x: 900, y: 420, startDeg: -120, sweepDeg: 240, r: 150 },
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
          <h3 className="font-heading font-bold text-base">Your Monetisation Map</h3>
          <p className="text-xs text-muted-foreground">
            {activeNodes} of {totalNodes} streams activated — Revenue · Marketing · Authority
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onConsultAbby}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Refine with Abby
        </Button>
      </div>

      {/* Constellation Map */}
      <div className="w-full rounded-2xl border border-border bg-card overflow-hidden">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full h-auto"
          style={{ minHeight: 380, maxHeight: 600 }}
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
              const nodeFill = node.active ? c.nodeColor : "hsl(var(--muted))";
              const nodeStroke = node.active ? c.nodeColorMuted : "hsl(var(--border))";
              return (
                <g key={`node-${c.id}-${i}`}>
                  <circle
                    cx={pos.x} cy={pos.y} r={22}
                    fill={nodeFill}
                    stroke={nodeStroke}
                    strokeWidth="2.5"
                    opacity={node.active ? 1 : 0.5}
                  />
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill="white" fontSize="14" fontWeight="bold"
                    opacity={node.active ? 1 : 0.6}
                  >
                    {node.active ? "✓" : c.emoji}
                  </text>
                  <MultiLineText
                    x={pos.x} y={pos.y + 34}
                    text={node.label}
                    fontSize={11}
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
              <g
                key={`hub-${c.id}`}
                className="cursor-pointer"
                onClick={() => onNavigateTab(c.tabKey)}
              >
                <circle cx={h.x} cy={h.y} r={58} fill={c.hubColor} />
                <circle cx={h.x} cy={h.y} r={58} fill="none" stroke="white" strokeWidth="2" opacity={0.2} />
                <MultiLineText
                  x={h.x} y={h.y - 4}
                  text={c.title}
                  fontSize={13}
                  fill="white"
                  fontWeight="800"
                />
                <text x={h.x} y={h.y + 28} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" opacity={0.7}>
                  {activeCount}/{c.nodes.length}
                </text>
              </g>
            );
          })}

          {/* Center book */}
          <g>
            <rect x={CX - 35} y={CY - 42} width={70} height={84} rx={10}
              fill="hsl(var(--secondary))" opacity={0.9} />
            <rect x={CX - 35} y={CY - 42} width={70} height={84} rx={10}
              fill="none" stroke="white" strokeWidth="2" opacity={0.15} />
            <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="central" fontSize="32">
              📖
            </text>
            <text x={CX} y={CY + 58} textAnchor="middle" fill="hsl(var(--muted-foreground))"
              fontSize="11" fontWeight="bold" letterSpacing="1.5">
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
          <div className="w-3 h-3 rounded-full" style={{ background: "#10b981" }} />
          <span>💰 Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#8b5cf6" }} />
          <span>📣 Marketing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#0ea5e9" }} />
          <span>🏆 Authority</span>
        </div>
      </div>
    </motion.div>
  );
}
