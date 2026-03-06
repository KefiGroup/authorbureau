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
  category: "revenue" | "marketing" | "authority";
}

interface StepCluster {
  id: string;
  letter: string;
  title: string;
  hubColor: string;
  nodeColor: string;
  nodeColorMuted: string;
  nodes: RevenueNode[];
  tabKey: string;
}

const CLUSTERS: StepCluster[] = [
  {
    id: "analyze", letter: "A", title: "ANALYZE\nDIGITAL PRODUCTS",
    hubColor: "#3b82f6", nodeColor: "#60a5fa", nodeColorMuted: "#93c5fd",
    tabKey: "analyze",
    nodes: [
      { label: "Online Courses", active: false, category: "revenue" },
      { label: "Workbook", active: false, category: "revenue" },
      { label: "Audio Book", active: false, category: "revenue" },
      { label: "Home Study\nCourses", active: false, category: "revenue" },
      { label: "Webinars", active: false, category: "revenue" },
      { label: "Monthly\nMemberships", active: false, category: "revenue" },
      { label: "Upsells /\nDownsells", active: false, category: "revenue" },
      { label: "Affiliates", active: false, category: "revenue" },
      { label: "Social Media", active: false, category: "marketing" },
      { label: "Podcast", active: false, category: "marketing" },
    ],
  },
  {
    id: "build", letter: "B", title: "BUILD\nCOACHING",
    hubColor: "#d97706", nodeColor: "#f59e0b", nodeColorMuted: "#fcd34d",
    tabKey: "build",
    nodes: [
      { label: "1-on-1\nCoaching", active: false, category: "revenue" },
      { label: "Group\nCoaching", active: false, category: "revenue" },
      { label: "Big Ticket", active: false, category: "revenue" },
      { label: "Revenue\nSharing", active: false, category: "revenue" },
      { label: "Coaching\nMembership", active: false, category: "revenue" },
    ],
  },
  {
    id: "bridge", letter: "B", title: "BRIDGE\nSPEAKING",
    hubColor: "#f43f5e", nodeColor: "#fb7185", nodeColorMuted: "#fda4af",
    tabKey: "bridge",
    nodes: [
      { label: "Keynotes", active: false, category: "authority" },
      { label: "Podcasts\n(Guest)", active: false, category: "marketing" },
      { label: "Corporate\nTraining", active: false, category: "authority" },
      { label: "Joint\nVentures", active: false, category: "revenue" },
      { label: "Book Sales\nat Events", active: false, category: "revenue" },
      { label: "Special\nEditions", active: false, category: "revenue" },
      { label: "In-House\nSpeaker", active: false, category: "authority" },
      { label: "Fund\nRaising", active: false, category: "authority" },
      { label: "Conventions", active: false, category: "authority" },
    ],
  },
  {
    id: "yield", letter: "Y", title: "YIELD\nSEMINARS",
    hubColor: "#10b981", nodeColor: "#34d399", nodeColorMuted: "#6ee7b7",
    tabKey: "yield",
    nodes: [
      { label: "Retreats &\nBootcamps", active: false, category: "revenue" },
      { label: "Certification", active: false, category: "revenue" },
      { label: "Masterminds", active: false, category: "revenue" },
      { label: "Exhibitors /\nJV", active: false, category: "revenue" },
    ],
  },
];

const CATEGORY_COLORS: Record<string, { fill: string; stroke: string }> = {
  revenue: { fill: "", stroke: "" }, // uses cluster color
  marketing: { fill: "#8b5cf6", stroke: "#a78bfa" },
  authority: { fill: "#0ea5e9", stroke: "#38bdf8" },
};

/* ── SVG viewBox ── */
const VW = 1200;
const VH = 800;
const CX = VW / 2;
const CY = VH / 2;

/* Hub positions + arc config (SVG coords) */
const HUB_CFG: Record<string, { x: number; y: number; startDeg: number; sweepDeg: number; r: number }> = {
  analyze:  { x: 240, y: 220, startDeg: 100, sweepDeg: 300, r: 140 },
  build:    { x: 240, y: 600, startDeg: 0, sweepDeg: 180, r: 140 },
  bridge:   { x: 880, y: 560, startDeg: -120, sweepDeg: 240, r: 140 },
  yield:    { x: 960, y: 250, startDeg: -165, sweepDeg: 150, r: 140 },
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
            <strong>A</strong>nalyze · <strong>B</strong>uild · <strong>B</strong>ridge · <strong>Y</strong>ield — {activeNodes} of {totalNodes} streams activated
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
              const catColor = CATEGORY_COLORS[node.category];
              const nodeFill = node.active
                ? (catColor.fill || c.nodeColor)
                : "hsl(var(--muted))";
              const nodeStroke = node.active
                ? (catColor.stroke || c.nodeColorMuted)
                : "hsl(var(--border))";
              // Category indicator ring for marketing/authority
              const showCatRing = !node.active && node.category !== "revenue";
              return (
                <g key={`node-${c.id}-${i}`}>
                  {showCatRing && (
                    <circle
                      cx={pos.x} cy={pos.y} r={25}
                      fill="none"
                      stroke={catColor.fill}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity={0.4}
                    />
                  )}
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
                    {node.active ? "✓" : node.category === "marketing" ? "📣" : node.category === "authority" ? "🏆" : "$"}
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
                <text x={h.x} y={h.y - 18} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="bold" opacity={0.8}>
                  {c.letter} · STEP
                </text>
                <MultiLineText
                  x={h.x} y={h.y + 2}
                  text={c.title}
                  fontSize={13}
                  fill="white"
                  fontWeight="800"
                />
                <text x={h.x} y={h.y + 30} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" opacity={0.7}>
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
          <div className="w-3 h-3 rounded-full bg-muted border-2 border-border" />
          <span>💰 Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#8b5cf620", border: "2px dashed #8b5cf6" }} />
          <span>📣 Marketing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#0ea5e920", border: "2px dashed #0ea5e9" }} />
          <span>🏆 Authority</span>
        </div>
      </div>
    </motion.div>
  );
}
