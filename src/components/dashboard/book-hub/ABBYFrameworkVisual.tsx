import { motion } from "framer-motion";
import { Sparkles, BookOpen, ArrowRight, ChevronDown, Hammer, Link2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasConsultation: boolean;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

/* ── Node definitions with ABBY step ── */
interface NodeDef {
  label: string;
  step: "A" | "B" | "Y";
}

/* ── BBY Execution phases (the 3 cards) ── */
interface BBYPhase {
  id: string;
  letter: string;
  title: string;
  subtitle: string;
  color: string;
  nodes: NodeDef[];
}

const BBY_PHASES: BBYPhase[] = [
  {
    id: "build", letter: "B", title: "B · Build", subtitle: "AI generates all content & assets",
    color: "#10b981",
    nodes: [
      { label: "Online Courses", step: "B" },
      { label: "Home Study Courses", step: "B" },
      { label: "Workbook", step: "B" },
      { label: "Audiobook", step: "B" },
      { label: "Monthly Memberships", step: "B" },
      { label: "Upsells / Downsells", step: "B" },
      { label: "Social Media", step: "B" },
      { label: "Webinars", step: "B" },
      { label: "Podcasts (Guest)", step: "B" },
      { label: "Website / Microsite", step: "B" },
      { label: "Email Marketing", step: "B" },
    ],
  },
  {
    id: "bridge", letter: "B", title: "B · Bridge", subtitle: "Connect to best-in-class tools",
    color: "#8b5cf6",
    nodes: [
      { label: "1-on-1 Coaching", step: "B" },
      { label: "Group Coaching", step: "B" },
      { label: "Big Ticket Consulting", step: "B" },
      { label: "Revenue Sharing / JV", step: "B" },
      { label: "Keynotes", step: "B" },
      { label: "In-House Speaker", step: "B" },
      { label: "Training Programs", step: "B" },
      { label: "Affiliates", step: "B" },
    ],
  },
  {
    id: "yield", letter: "Y", title: "Y · Yield", subtitle: "Monetize & earn",
    color: "#0ea5e9",
    nodes: [
      { label: "Retreats & Bootcamps", step: "Y" },
      { label: "Certification", step: "Y" },
      { label: "Masterminds", step: "Y" },
      { label: "Special Editions", step: "Y" },
      { label: "Book Sales (Events)", step: "Y" },
      { label: "Conventions / Conferences", step: "Y" },
      { label: "Fund Raising", step: "Y" },
      { label: "Exhibitors / JV", step: "Y" },
    ],
  },
];

const totalNodes = BBY_PHASES.reduce((s, p) => s + p.nodes.length, 0);

export default function ABBYFrameworkVisual({ hasConsultation, onConsultAbby, onNavigateTab }: Props) {
  return (
    <motion.div
      className="space-y-0"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* ═══ VERTICAL FLOW ═══ */}

      {/* Phase 1: YOUR BOOK */}
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shadow-md">
            <BookOpen className="h-7 w-7 text-secondary-foreground" />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">
            Your Book
          </span>
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center my-3">
          <div className="w-px h-8 bg-border" />
          <ChevronDown className="h-4 w-4 text-secondary" />
        </div>
      </div>

      {/* Phase 2: A — ANALYZE */}
      <div className="flex flex-col items-center">
        <button
          onClick={onConsultAbby}
          className="w-full max-w-xl rounded-2xl border-2 border-secondary/40 bg-secondary/5 p-6 md:p-8 text-center hover:shadow-md transition-all cursor-pointer group"
        >
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-secondary-foreground/60 bg-secondary/30 rounded-full px-4 py-1 mb-4">
            A · Analyze
          </span>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-secondary/30 flex items-center justify-center text-2xl">
              👩‍💼
            </div>
          </div>
          <h4 className="font-heading font-bold text-lg md:text-xl mb-1">Analyze with Abby</h4>
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
            Authors Bureau Business Advisor
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-5">
            Abby reads your manuscript, maps opportunities, and builds a personalized monetization strategy — recommending exactly which products to create first and why.
          </p>
          <span className="inline-flex items-center bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-md px-6 py-2.5 rounded-md font-medium text-sm transition-colors">
            <Sparkles className="h-4 w-4 mr-2" />
            {hasConsultation ? "Continue Analysis with Abby" : "Analyze with Abby"}
          </span>
        </button>

        {/* Connector */}
        <div className="flex flex-col items-center my-3">
          <div className="w-px h-8 bg-border" />
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Phase 3: B·B·Y — EXECUTION */}
      <div className="w-full space-y-4">
        <div className="text-center mb-2">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted rounded-full px-4 py-1 mb-2">
            Your Monetization Map
          </span>
          <h4 className="font-heading font-bold text-base">
            0 of {totalNodes} streams activated
          </h4>
        </div>

        {/* BBY Phase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BBY_PHASES.map((phase) => (
            <button
              key={phase.id}
              onClick={() => onNavigateTab(phase.id)}
              className="group rounded-xl border border-border bg-card p-4 text-left hover:shadow-md hover:border-muted-foreground/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: phase.color }}
                >
                  <span className="text-white text-sm font-black">{phase.letter}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground">{phase.title}</h4>
                  <span className="text-[10px] text-muted-foreground">{phase.subtitle}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{phase.nodes.length}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {phase.nodes.map((node) => (
                  <span
                    key={node.label}
                    className="inline-block rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                  >
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
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground pt-6">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
          <span>A · Analyze</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#10b981" }} />
          <span>B · Build</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#8b5cf6" }} />
          <span>B · Bridge</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#0ea5e9" }} />
          <span>Y · Yield</span>
        </div>
      </div>
    </motion.div>
  );
}
