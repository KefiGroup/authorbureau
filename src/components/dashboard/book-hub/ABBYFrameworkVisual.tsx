import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";


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
    id: "revenue-streams", letter: "D", title: "Digital Products", subtitle: "Low-hanging fruits — monetize fast",
    color: "#10b981",
    nodes: [
      { label: "Workbook", step: "B" },
      { label: "Audiobook", step: "B" },
      { label: "Book Sales (Events)", step: "B" },
      { label: "Home Study Courses", step: "B" },
      { label: "Online Courses", step: "B" },
      { label: "Special Editions", step: "B" },
      { label: "Monthly Memberships", step: "B" },
    ],
  },
  {
    id: "marketing-channels", letter: "C", title: "Coaching", subtitle: "High-touch expertise programs",
    color: "#8b5cf6",
    nodes: [
      { label: "Group Coaching", step: "B" },
      { label: "1-on-1 Coaching", step: "B" },
    ],
  },
  {
    id: "authority-builders", letter: "S", title: "Speaking", subtitle: "Stage, training & premium engagements",
    color: "#0ea5e9",
    nodes: [
      { label: "In-House Speaker", step: "Y" },
      { label: "Training Programs", step: "Y" },
      { label: "Retreats & Bootcamps", step: "Y" },
      { label: "Masterminds", step: "Y" },
      { label: "Certification", step: "Y" },
      { label: "Keynotes", step: "Y" },
      { label: "Big Ticket Consulting", step: "Y" },
    ],
  },
  {
    id: "partnerships", letter: "P", title: "Partnerships", subtitle: "Strategic alliances & revenue multipliers",
    color: "#f59e0b",
    nodes: [
      { label: "Upsells / Downsells / Cross Sells", step: "Y" },
      { label: "Revenue Sharing", step: "Y" },
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

      {/* B·B·Y — EXECUTION */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
