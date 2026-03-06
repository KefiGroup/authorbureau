import { motion } from "framer-motion";

interface FrameworkProduct {
  label: string;
  active: boolean;
  category: "revenue" | "marketing" | "authority";
}

interface Category {
  letter: string;
  subtitle: string;
  title: string;
  hubColor: string;
  nodeColor: string;
  products: FrameworkProduct[];
}

const FRAMEWORK: Category[] = [
  {
    letter: "A", subtitle: "ANALYZE", title: "ANALYZE & STRATEGIZE",
    hubColor: "#3b82f6", nodeColor: "#60a5fa",
    products: [
      { label: "Online Courses", active: false, category: "revenue" },
      { label: "Workbook", active: false, category: "revenue" },
      { label: "Audio Book", active: false, category: "revenue" },
      { label: "Home Study Courses", active: false, category: "revenue" },
      { label: "Webinars", active: false, category: "revenue" },
      { label: "Monthly Memberships", active: false, category: "revenue" },
      { label: "Upsells / Downsells", active: false, category: "revenue" },
      { label: "Affiliates", active: false, category: "revenue" },
      { label: "Social Media", active: false, category: "marketing" },
      { label: "Podcast", active: false, category: "marketing" },
    ],
  },
  {
    letter: "B", subtitle: "BUILD", title: "BUILD AUTHORITY",
    hubColor: "#d97706", nodeColor: "#f59e0b",
    products: [
      { label: "1-on-1 Coaching", active: false, category: "revenue" },
      { label: "Group Coaching", active: false, category: "revenue" },
      { label: "Big Ticket", active: false, category: "revenue" },
      { label: "Revenue Sharing", active: false, category: "revenue" },
      { label: "Coaching Membership", active: false, category: "revenue" },
    ],
  },
  {
    letter: "B", subtitle: "BRIDGE", title: "BRIDGE CHANNELS",
    hubColor: "#f43f5e", nodeColor: "#fb7185",
    products: [
      { label: "Keynotes", active: false, category: "authority" },
      { label: "Podcasts (Guest)", active: false, category: "marketing" },
      { label: "Corporate Training", active: false, category: "authority" },
      { label: "Joint Ventures", active: false, category: "revenue" },
      { label: "Book Sales", active: false, category: "revenue" },
      { label: "Special Editions", active: false, category: "revenue" },
      { label: "In-House Speaker", active: false, category: "authority" },
      { label: "Fund Raising", active: false, category: "authority" },
      { label: "Conventions", active: false, category: "authority" },
    ],
  },
  {
    letter: "Y", subtitle: "YIELD", title: "YIELD REVENUE",
    hubColor: "#10b981", nodeColor: "#34d399",
    products: [
      { label: "Retreats & Bootcamps", active: false, category: "revenue" },
      { label: "Certification", active: false, category: "revenue" },
      { label: "Masterminds", active: false, category: "revenue" },
      { label: "Exhibitors / JV", active: false, category: "revenue" },
    ],
  },
];

// SVG viewBox dimensions
const W = 1200;
const H = 800;
const CX = W / 2;
const CY = H / 2;

// Hub positions (absolute SVG coords)
const HUBS: Record<number, { x: number; y: number; startAngle: number; sweep: number; radius: number }> = {
  0: { x: 220, y: 260, startAngle: 120, sweep: 280, radius: 180 },   // Analyze – 10 nodes, top-left
  1: { x: 220, y: 600, startAngle: 160, sweep: 200, radius: 150 },   // Build – 5 nodes, bottom-left
  2: { x: 960, y: 600, startAngle: -60, sweep: 300, radius: 180 },   // Bridge – 9 nodes, wide wrap
  3: { x: 960, y: 260, startAngle: -120, sweep: 180, radius: 160 },  // Yield – 4 nodes, fan upward
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

const CATEGORY_ICONS: Record<string, string> = {
  revenue: "$",
  marketing: "📣",
  authority: "🏆",
};

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
          <strong>A</strong>nalyze · <strong>B</strong>uild · <strong>B</strong>ridge · <strong>Y</strong>ield — {activeProducts} of {totalProducts} streams activated
        </p>
      </div>

      {/* Mind Map – fully SVG-based */}
      <div className="w-full rounded-2xl border border-border bg-card overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 340 }}>
          {/* Dashed lines from center book to each hub */}
          {FRAMEWORK.map((cat, idx) => {
            const hub = HUBS[idx];
            return (
              <line
                key={`center-${idx}`}
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
          {FRAMEWORK.map((cat, idx) => {
            const hub = HUBS[idx];
            const positions = getNodePositions(cat.products.length, hub.x, hub.y, hub.radius, hub.startAngle, hub.sweep);
            return positions.map((pos, i) => (
              <line
                key={`spoke-${idx}-${i}`}
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
          {FRAMEWORK.map((cat, idx) => {
            const hub = HUBS[idx];
            const positions = getNodePositions(cat.products.length, hub.x, hub.y, hub.radius, hub.startAngle, hub.sweep);
            return positions.map((pos, i) => {
              const p = cat.products[i];
              return (
                <g key={`node-${idx}-${i}`}>
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
                    {p.active ? "✓" : CATEGORY_ICONS[p.category]}
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
          {FRAMEWORK.map((cat, idx) => {
            const hub = HUBS[idx];
            return (
              <g key={`hub-${idx}`} className="cursor-pointer">
                <circle cx={hub.x} cy={hub.y} r={48} fill={cat.hubColor} />
                <text x={hub.x} y={hub.y - 14} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" opacity={0.8}>
                  {cat.letter} · {cat.subtitle}
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
          <span>💰 Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>📣 Marketing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🏆 Authority</span>
        </div>
      </div>
    </div>
  );
}
