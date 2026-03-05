import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface FrameworkProduct {
  label: string;
  active: boolean;
}

interface Category {
  step: number;
  letter: string;
  subtitle: string;
  title: string;
  hubColor: string;
  nodeColor: string;
  products: FrameworkProduct[];
}

const FRAMEWORK: Category[] = [
  {
    step: 1, letter: "A", subtitle: "AUTOMATE", title: "DIGITAL PRODUCTS",
    hubColor: "#3b82f6", nodeColor: "#60a5fa",
    products: [
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
    step: 2, letter: "B", subtitle: "BUILD", title: "COACHING / CONSULTING",
    hubColor: "#d97706", nodeColor: "#f59e0b",
    products: [
      { label: "1-on-1 Coaching", active: false },
      { label: "Group Coaching", active: false },
      { label: "Big Ticket", active: false },
      { label: "Revenue Sharing", active: false },
    ],
  },
  {
    step: 3, letter: "B", subtitle: "BROADCAST", title: "SPEAKING",
    hubColor: "#f43f5e", nodeColor: "#fb7185",
    products: [
      { label: "JVs", active: false },
      { label: "Podcasts", active: false },
      { label: "Book Sales", active: false },
      { label: "Fund Raising", active: false },
      { label: "In-House Speaker", active: false },
      { label: "Special Editions", active: false },
    ],
  },
  {
    step: 4, letter: "Y", subtitle: "YIELD", title: "SEMINARS",
    hubColor: "#10b981", nodeColor: "#34d399",
    products: [
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

// SVG viewBox dimensions
const W = 1000;
const H = 650;
const CX = W / 2;
const CY = H / 2;

// Hub positions (absolute SVG coords)
const HUBS: Record<number, { x: number; y: number; startAngle: number; sweep: number; radius: number }> = {
  1: { x: 200, y: 180, startAngle: 150, sweep: 220, radius: 155 },
  2: { x: 200, y: 500, startAngle: 150, sweep: 170, radius: 130 },
  3: { x: 800, y: 500, startAngle: -40, sweep: 170, radius: 130 },
  4: { x: 800, y: 180, startAngle: -40, sweep: 220, radius: 155 },
};

function getNodePositions(count: number, cx: number, cy: number, radius: number, startAngle: number, sweep: number) {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (sweep / Math.max(count - 1, 1)) * i;
    const rad = (angle * Math.PI) / 180;
    positions.push({ x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius });
  }
  return positions;
}

interface Props {
  isPremium: boolean;
  onNavigate?: (section: string) => void;
  onUpgrade: () => void;
}

export default function ABBYFrameworkGrid({ isPremium, onNavigate, onUpgrade }: Props) {
  const totalProducts = FRAMEWORK.reduce((s, c) => s + c.products.length, 0);
  const activeProducts = FRAMEWORK.reduce((s, c) => s + c.products.filter(p => p.active).length, 0);

  return (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {activeProducts} of {totalProducts} revenue streams activated
        </p>
      </div>

      {/* Mind Map – fully SVG-based */}
      <div className="w-full rounded-2xl border border-border bg-card overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 340 }}>
          {/* Dashed lines from center book to each hub */}
          {FRAMEWORK.map((cat) => {
            const hub = HUBS[cat.step];
            return (
              <line
                key={`center-${cat.step}`}
                x1={CX} y1={CY}
                x2={hub.x} y2={hub.y}
                stroke="hsl(var(--border))"
                strokeWidth="2"
                strokeDasharray="8 5"
                opacity={0.5}
              />
            );
          })}

          {/* Dashed lines from each hub to its nodes */}
          {FRAMEWORK.map((cat) => {
            const hub = HUBS[cat.step];
            const positions = getNodePositions(cat.products.length, hub.x, hub.y, hub.radius, hub.startAngle, hub.sweep);
            return positions.map((pos, i) => (
              <line
                key={`spoke-${cat.step}-${i}`}
                x1={hub.x} y1={hub.y}
                x2={pos.x} y2={pos.y}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity={0.4}
              />
            ));
          })}

          {/* Product nodes (circles + text) */}
          {FRAMEWORK.map((cat) => {
            const hub = HUBS[cat.step];
            const positions = getNodePositions(cat.products.length, hub.x, hub.y, hub.radius, hub.startAngle, hub.sweep);
            return positions.map((pos, i) => {
              const p = cat.products[i];
              return (
                <g key={`node-${cat.step}-${i}`}>
                  <circle
                    cx={pos.x} cy={pos.y} r={18}
                    fill={p.active ? cat.nodeColor : "hsl(var(--muted))"}
                    stroke={p.active ? "white" : "hsl(var(--border))"}
                    strokeWidth="2"
                    opacity={p.active ? 1 : 0.55}
                  />
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill="white" fontSize="12" fontWeight="bold"
                    opacity={p.active ? 1 : 0.7}
                  >
                    {p.active ? "✓" : "$"}
                  </text>
                  <text
                    x={pos.x} y={pos.y + 28}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="10"
                    fontWeight="500"
                    opacity={p.active ? 1 : 0.55}
                  >
                    {p.label}
                  </text>
                </g>
              );
            });
          })}

          {/* Hub circles */}
          {FRAMEWORK.map((cat) => {
            const hub = HUBS[cat.step];
            return (
              <g key={`hub-${cat.step}`} className="cursor-pointer">
                <circle cx={hub.x} cy={hub.y} r={48} fill={cat.hubColor} />
                <text x={hub.x} y={hub.y - 14} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" opacity={0.8}>
                  STEP {cat.step}
                </text>
                <text x={hub.x} y={hub.y + 2} textAnchor="middle" fill="white" fontSize="11" fontWeight="800">
                  {cat.title}
                </text>
                <text x={hub.x} y={hub.y + 18} textAnchor="middle" fill="white" fontSize="9" opacity={0.7}>
                  {cat.products.filter(p => p.active).length}/{cat.products.length}
                </text>
              </g>
            );
          })}

          {/* Center book node */}
          <g>
            <rect x={CX - 30} y={CY - 38} width={60} height={76} rx={8} fill="hsl(var(--secondary))" opacity={0.9} />
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize="28">📖</text>
            <text x={CX} y={CY + 50} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="bold" letterSpacing="1">
              YOUR BOOK
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Activated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted border-2 border-border" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t border-dashed border-border" />
          <span>Revenue connection</span>
        </div>
      </div>
    </div>
  );
}
