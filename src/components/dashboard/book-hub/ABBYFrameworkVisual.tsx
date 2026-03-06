import { motion } from "framer-motion";
import { Sparkles, BookOpen, Search, Hammer, Link2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasConsultation: boolean;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

/* ── Pipeline phases ── */
interface Phase {
  id: string;
  letter: string;
  label: string;
  subtitle: string;
  color: string;
  colorMuted: string;
  icon: typeof Search;
}

const PHASES: Phase[] = [
  { id: "analyze", letter: "A", label: "Analyze", subtitle: "Map opportunities", color: "#f59e0b", colorMuted: "#fbbf24", icon: Search },
  { id: "build",   letter: "B", label: "Build",   subtitle: "Generate assets",   color: "#10b981", colorMuted: "#34d399", icon: Hammer },
  { id: "bridge",  letter: "B", label: "Bridge",  subtitle: "Connect tools",     color: "#8b5cf6", colorMuted: "#a78bfa", icon: Link2 },
  { id: "yield",   letter: "Y", label: "Yield",   subtitle: "Monetize & earn",   color: "#0ea5e9", colorMuted: "#38bdf8", icon: DollarSign },
];

/* ── Category sub-groups (unchanged 28 nodes) ── */
interface CategoryGroup {
  id: string;
  title: string;
  emoji: string;
  color: string;
  nodes: string[];
}

const CATEGORIES: CategoryGroup[] = [
  {
    id: "revenue", title: "Revenue Streams", emoji: "💰", color: "#10b981",
    nodes: [
      "Workbook", "Audio Book", "Online Courses", "Home Study Course",
      "Webinars", "Monthly Memberships", "Upsells / Downsells",
      "Certification", "Masterminds", "Retreats & Bootcamps",
    ],
  },
  {
    id: "marketing", title: "Marketing Channels", emoji: "📣", color: "#8b5cf6",
    nodes: [
      "Social Media", "Podcast Scripts", "Podcast Pitches",
      "Affiliates", "Book Sales at Events", "Conventions",
      "Fund Raising", "Joint Ventures", "Special Editions",
    ],
  },
  {
    id: "authority", title: "Authority Builders", emoji: "🏆", color: "#0ea5e9",
    nodes: [
      "1-on-1 Coaching", "Group Coaching", "Big Ticket Consulting",
      "Coaching Membership", "Keynotes", "Corporate Training",
      "In-House Speaker", "Revenue Sharing", "Exhibitors / JV",
    ],
  },
];

const totalNodes = CATEGORIES.reduce((s, c) => s + c.nodes.length, 0);

export default function ABBYFrameworkVisual({ hasConsultation, onConsultAbby, onNavigateTab }: Props) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-base">Your ABBY Monetisation Journey</h3>
          <p className="text-xs text-muted-foreground">
            0 of {totalNodes} streams activated across 4 phases
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onConsultAbby}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Consult Abby
        </Button>
      </div>

      {/* Sequential Pipeline */}
      <div className="rounded-2xl border border-border bg-card p-6 overflow-x-auto">
        {/* Phase Timeline */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {/* Book origin */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-secondary-foreground" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground mt-1.5 uppercase tracking-wider">
              Your Book
            </span>
          </div>

          {PHASES.map((phase, idx) => (
            <div key={phase.id} className="flex items-center shrink-0">
              {/* Connector arrow */}
              <div className="flex items-center mx-1 md:mx-3">
                <div className="w-8 md:w-16 h-0.5 bg-border" />
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px]" style={{ borderLeftColor: phase.color }} />
              </div>

              {/* Phase circle */}
              <button
                onClick={() => onNavigateTab(phase.id)}
                className="flex flex-col items-center group cursor-pointer shrink-0"
              >
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center transition-transform group-hover:scale-105 shadow-lg"
                  style={{ background: phase.color }}
                >
                  <span className="text-white font-black text-lg md:text-xl leading-none">
                    {phase.letter}
                  </span>
                  <span className="text-white/80 text-[8px] md:text-[9px] font-bold uppercase tracking-wider leading-none mt-0.5">
                    {phase.label}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium mt-1.5 max-w-[80px] text-center leading-tight">
                  {phase.subtitle}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* Category groups below */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigateTab(`${cat.id}-streams`)}
              className="group rounded-xl border border-border bg-muted/30 p-4 text-left hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: cat.color }}
                >
                  <span className="text-white text-xs">{cat.emoji}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{cat.title}</h4>
                  <span className="text-[10px] text-muted-foreground">
                    0/{cat.nodes.length} activated
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.nodes.map((node) => (
                  <span
                    key={node}
                    className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {node}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
        {PHASES.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
            <span>{p.letter} · {p.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
