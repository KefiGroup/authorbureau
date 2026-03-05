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
  color: string;       // hub bg
  textColor: string;   // label color
  dotActive: string;   // active dot
  products: FrameworkProduct[];
}

const FRAMEWORK: Category[] = [
  {
    step: 1, letter: "A", subtitle: "AUTOMATE", color: "bg-blue-500", textColor: "text-blue-600", dotActive: "bg-blue-500",
    products: [
      { label: "Website / Microsite", active: false },
      { label: "Workbooks", active: false },
      { label: "Audio Book", active: false },
      { label: "Social Media", active: false },
      { label: "Podcast Scripts", active: false },
      { label: "Webinars", active: false },
      { label: "Home Study Course", active: false },
      { label: "Online Courses", active: false },
      { label: "Monthly Memberships", active: false },
      { label: "Upsells / Downsells", active: false },
      { label: "Affiliates", active: false },
    ],
  },
  {
    step: 2, letter: "B", subtitle: "BUILD", color: "bg-amber-500", textColor: "text-amber-600", dotActive: "bg-amber-500",
    products: [
      { label: "1-on-1 Coaching", active: false },
      { label: "Group Coaching", active: false },
      { label: "Big Ticket", active: false },
      { label: "Revenue Sharing", active: false },
    ],
  },
  {
    step: 3, letter: "B", subtitle: "BROADCAST", color: "bg-rose-400", textColor: "text-rose-500", dotActive: "bg-rose-400",
    products: [
      { label: "Speaking Topics", active: false },
      { label: "Podcasts", active: false },
      { label: "Book Sales", active: false },
      { label: "JVs", active: false },
      { label: "Fund Raising", active: false },
      { label: "In-House Speaker", active: false },
      { label: "Special Editions", active: false },
    ],
  },
  {
    step: 4, letter: "Y", subtitle: "YIELD", color: "bg-emerald-500", textColor: "text-emerald-600", dotActive: "bg-emerald-500",
    products: [
      { label: "Retreats & Bootcamps", active: false },
      { label: "Certification", active: false },
      { label: "Masterminds", active: false },
      { label: "Conventions", active: false },
      { label: "Training Programs", active: false },
    ],
  },
];

/* Position each product node in an arc around its hub */
function arcPositions(count: number, cx: number, cy: number, radius: number, startDeg: number, sweepDeg: number) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startDeg + (sweepDeg / Math.max(count - 1, 1)) * i;
    const rad = (angle * Math.PI) / 180;
    out.push({ x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius });
  }
  return out;
}

/* Hub positions (percentage-based) and arc config */
const HUB_CONFIG: Record<number, { cx: number; cy: number; startDeg: number; sweepDeg: number; radius: number }> = {
  1: { cx: 18, cy: 22, startDeg: 160, sweepDeg: 200, radius: 32 },
  2: { cx: 18, cy: 78, startDeg: 160, sweepDeg: 160, radius: 28 },
  3: { cx: 82, cy: 78, startDeg: -20, sweepDeg: 160, radius: 28 },
  4: { cx: 82, cy: 22, startDeg: -20, sweepDeg: 200, radius: 30 },
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
      {/* Header */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {activeProducts} of {totalProducts} revenue streams activated
        </p>
      </div>

      {/* Mind Map Container */}
      <div className="relative w-full rounded-2xl border border-border bg-card overflow-hidden" style={{ paddingBottom: "65%" }}>
        <div className="absolute inset-0">

          {/* Center Book Node */}
          <motion.div
            className="absolute z-20 flex flex-col items-center gap-1"
            style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-gradient-to-br from-secondary/80 to-secondary shadow-xl flex items-center justify-center border-2 border-secondary-foreground/20">
              <BookOpen className="h-7 w-7 sm:h-9 sm:w-9 text-secondary-foreground" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
              Your Book
            </span>
          </motion.div>

          {/* SVG lines: center→hubs and hubs→nodes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            {FRAMEWORK.map((cat) => {
              const cfg = HUB_CONFIG[cat.step];
              return (
                <motion.line
                  key={`center-${cat.step}`}
                  x1="50%" y1="50%"
                  x2={`${cfg.cx}%`} y2={`${cfg.cy}%`}
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity={0.5}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: cat.step * 0.1 }}
                />
              );
            })}
            {FRAMEWORK.map((cat) => {
              const cfg = HUB_CONFIG[cat.step];
              const positions = arcPositions(cat.products.length, cfg.cx, cfg.cy, cfg.radius, cfg.startDeg, cfg.sweepDeg);
              return positions.map((pos, i) => (
                <line
                  key={`spoke-${cat.step}-${i}`}
                  x1={`${cfg.cx}%`} y1={`${cfg.cy}%`}
                  x2={`${pos.x}%`} y2={`${pos.y}%`}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity={0.35}
                />
              ));
            })}
          </svg>

          {/* Category Hubs */}
          {FRAMEWORK.map((cat, ci) => {
            const cfg = HUB_CONFIG[cat.step];
            const positions = arcPositions(cat.products.length, cfg.cx, cfg.cy, cfg.radius, cfg.startDeg, cfg.sweepDeg);

            return (
              <div key={cat.step}>
                {/* Hub */}
                <motion.div
                  className={`absolute z-10 flex flex-col items-center justify-center rounded-full shadow-lg
                    w-16 h-16 sm:w-20 sm:h-20 ${cat.color} text-white cursor-pointer`}
                  style={{ left: `${cfg.cx}%`, top: `${cfg.cy}%`, transform: "translate(-50%, -50%)" }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 * ci }}
                  whileHover={{ scale: 1.08 }}
                >
                  <span className="text-[8px] sm:text-[9px] font-bold opacity-80">STEP {cat.step}</span>
                  <span className="text-[9px] sm:text-[10px] font-extrabold leading-tight text-center">
                    {cat.letter} · {cat.subtitle}
                  </span>
                  <span className="text-[7px] sm:text-[8px] opacity-70 mt-0.5">
                    {cat.products.filter(p => p.active).length}/{cat.products.length}
                  </span>
                </motion.div>

                {/* Product Nodes */}
                {cat.products.map((product, pi) => {
                  const pos = positions[pi];
                  return (
                    <motion.div
                      key={`${cat.step}-${pi}`}
                      className="absolute flex flex-col items-center gap-0.5 pointer-events-auto z-[5]"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 + ci * 0.08 + pi * 0.03 }}
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold shadow-sm border-2
                          ${product.active
                            ? `${cat.dotActive} text-white border-white/30`
                            : "bg-muted text-muted-foreground/60 border-border"
                          }`}
                      >
                        {product.active ? "✓" : "$"}
                      </div>
                      <span className={`text-[7px] sm:text-[8px] font-medium text-center leading-tight max-w-[70px] sm:max-w-[80px]
                        ${product.active ? "text-foreground" : "text-muted-foreground/70"}`}>
                        {product.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
