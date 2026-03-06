import { motion } from "framer-motion";
import { Sparkles, BookOpen, Search, Hammer, Link2, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasConsultation: boolean;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

/* ── ABBY Pipeline Phases ── */
const PHASES = [
  { id: "analyze", letter: "A", label: "Analyze", subtitle: "Map opportunities", color: "#f59e0b" },
  { id: "build",   letter: "B", label: "Build",   subtitle: "Generate assets",   color: "#10b981" },
  { id: "bridge",  letter: "B", label: "Bridge",  subtitle: "Connect tools",     color: "#8b5cf6" },
  { id: "yield",   letter: "Y", label: "Yield",   subtitle: "Monetize & earn",   color: "#0ea5e9" },
];

/* ── Reclassified Categories (18 + 6 + 3 = 27) ── */
interface NodeDef { label: string; step: "A" | "B" | "Y"; }

interface CategoryGroup {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  nodes: NodeDef[];
}

const CATEGORIES: CategoryGroup[] = [
  {
    id: "revenue-streams", title: "Revenue Streams", subtitle: "Directly generate income",
    emoji: "💰", color: "#10b981",
    nodes: [
      { label: "Online Courses", step: "A" },
      { label: "Home Study Courses", step: "A" },
      { label: "Workbook", step: "A" },
      { label: "Audiobook", step: "A" },
      { label: "Monthly Memberships", step: "A" },
      { label: "Upsells / Downsells", step: "A" },
      { label: "1-on-1 Coaching", step: "B" },
      { label: "Group Coaching", step: "B" },
      { label: "Big Ticket Consulting", step: "B" },
      { label: "Revenue Sharing / JV", step: "B" },
      { label: "Keynotes", step: "B" },
      { label: "In-House Speaker", step: "B" },
      { label: "Training Programs", step: "B" },
      { label: "Retreats & Bootcamps", step: "Y" },
      { label: "Certification", step: "Y" },
      { label: "Masterminds", step: "Y" },
      { label: "Special Editions", step: "Y" },
      { label: "Book Sales (Events)", step: "Y" },
    ],
  },
  {
    id: "marketing-channels", title: "Marketing Channels", subtitle: "Drive awareness & leads",
    emoji: "📣", color: "#8b5cf6",
    nodes: [
      { label: "Social Media", step: "A" },
      { label: "Webinars", step: "A" },
      { label: "Podcasts (Guest)", step: "A" },
      { label: "Website / Microsite", step: "A" },
      { label: "Affiliates", step: "B" },
      { label: "Email Marketing", step: "B" },
    ],
  },
  {
    id: "authority-builders", title: "Authority Builders", subtitle: "Credibility & positioning",
    emoji: "🏆", color: "#0ea5e9",
    nodes: [
      { label: "Conventions / Conferences", step: "Y" },
      { label: "Fund Raising", step: "Y" },
      { label: "Exhibitors / JV", step: "Y" },
    ],
  },
];

const totalNodes = CATEGORIES.reduce((s, c) => s + c.nodes.length, 0);

const STEP_COLORS: Record<string, string> = { A: "#f59e0b", B: "#10b981", Y: "#0ea5e9" };

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
            0 of {totalNodes} streams activated — Strategize → Generate → Connect
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onConsultAbby}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Consult Abby
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-8 overflow-hidden">
        {/* Sequential Pipeline */}
        <div className="flex items-center justify-center gap-0 overflow-x-auto pb-2">
          {/* Book origin */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shadow-sm">
              <BookOpen className="h-6 w-6 text-secondary-foreground" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground mt-1.5 uppercase tracking-wider">
              Your Book
            </span>
          </div>

          {PHASES.map((phase) => (
            <div key={phase.id} className="flex items-center shrink-0">
              {/* Connector */}
              <div className="flex items-center mx-1 md:mx-3">
                <div className="w-6 md:w-12 h-0.5 bg-border" />
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px]" style={{ borderLeftColor: phase.color }} />
              </div>
              {/* Phase circle */}
              <button
                onClick={() => onNavigateTab(phase.id)}
                className="flex flex-col items-center group cursor-pointer shrink-0"
              >
                <div
                  className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full flex flex-col items-center justify-center transition-transform group-hover:scale-105 shadow-lg"
                  style={{ background: phase.color }}
                >
                  <span className="text-white font-black text-base md:text-lg leading-none">{phase.letter}</span>
                  <span className="text-white/80 text-[7px] md:text-[8px] font-bold uppercase tracking-wider leading-none mt-0.5">
                    {phase.label}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground font-medium mt-1.5 text-center leading-tight">
                  {phase.subtitle}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* 3-Phase Per-Node Model */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Every node follows 3 phases
          </p>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
              <strong>Strategize</strong> — Abby reads manuscript → execution plan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
              <strong>Generate</strong> — AI creates scripts, outlines, calendars
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#8b5cf6" }} />
              <strong>Connect</strong> — Free + Pro tool recommendations & export
            </span>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigateTab(cat.id)}
              className="group rounded-xl border border-border bg-background p-4 text-left hover:shadow-md hover:border-muted-foreground/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm shadow-sm"
                  style={{ background: cat.color }}
                >
                  <span className="text-white text-xs">{cat.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground">{cat.title}</h4>
                  <span className="text-[10px] text-muted-foreground">{cat.subtitle}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  0/{cat.nodes.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.nodes.map((node) => (
                  <span
                    key={node.label}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: STEP_COLORS[node.step] }}
                    />
                    {node.label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-3 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                View details <ArrowRight className="h-3 w-3" />
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
