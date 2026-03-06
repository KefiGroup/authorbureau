import { motion } from "framer-motion";
import { Sparkles, BookOpen, ArrowRight, ArrowDown, ChevronDown, Hammer, Link2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasConsultation: boolean;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

/* ── Node definitions with ABBY step + tool recommendations ── */
interface NodeDef {
  label: string;
  step: "A" | "B" | "Y";
  freeTool?: string;
  proTool?: string;
}

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
      { label: "Online Courses", step: "A", freeTool: "Teachable (free)", proTool: "Kajabi" },
      { label: "Home Study Courses", step: "A", freeTool: "Google Docs + Gumroad", proTool: "Thinkific" },
      { label: "Workbook", step: "A", freeTool: "Canva + Gumroad", proTool: "Designrr" },
      { label: "Audiobook", step: "A", freeTool: "ACX/Findaway", proTool: "Authors Republic" },
      { label: "Monthly Memberships", step: "A", freeTool: "Patreon", proTool: "Memberful" },
      { label: "Upsells / Downsells", step: "A", freeTool: "Gumroad", proTool: "ThriveCart" },
      { label: "1-on-1 Coaching", step: "B", freeTool: "Calendly + Zoom", proTool: "CoachAccountable" },
      { label: "Group Coaching", step: "B", freeTool: "Zoom + Circle", proTool: "Mighty Networks" },
      { label: "Big Ticket Consulting", step: "B", freeTool: "Calendly + Stripe", proTool: "High Level" },
      { label: "Revenue Sharing / JV", step: "B", proTool: "JVZoo" },
      { label: "Keynotes", step: "B", freeTool: "SpeakerHub", proTool: "eSpeakers" },
      { label: "In-House Speaker", step: "B", freeTool: "LinkedIn", proTool: "SpeakInc" },
      { label: "Training Programs", step: "B", freeTool: "Loom + Notion", proTool: "TalentLMS" },
      { label: "Retreats & Bootcamps", step: "Y", freeTool: "Eventbrite", proTool: "Retreat Guru" },
      { label: "Certification", step: "Y", freeTool: "Google Forms", proTool: "Accredible" },
      { label: "Masterminds", step: "Y", freeTool: "Circle", proTool: "Mighty Networks" },
      { label: "Special Editions", step: "Y", freeTool: "IngramSpark", proTool: "BookVault" },
      { label: "Book Sales (Events)", step: "Y", freeTool: "Square", proTool: "Shopify POS" },
    ],
  },
  {
    id: "marketing-channels", title: "Marketing Channels", subtitle: "Drive awareness & leads",
    emoji: "📣", color: "#8b5cf6",
    nodes: [
      { label: "Social Media", step: "A", freeTool: "Buffer (free)", proTool: "Later / Hootsuite" },
      { label: "Webinars", step: "A", freeTool: "Zoom (free)", proTool: "WebinarJam" },
      { label: "Podcasts (Guest)", step: "A", freeTool: "Podmatch", proTool: "PodcastGuests.com" },
      { label: "Website / Microsite", step: "A", freeTool: "Authors Bureau (built-in)" },
      { label: "Affiliates", step: "B", freeTool: "Gumroad affiliates", proTool: "FirstPromoter" },
      { label: "Email Marketing", step: "B", freeTool: "Mailchimp (free)", proTool: "ConvertKit" },
    ],
  },
  {
    id: "authority-builders", title: "Authority Builders", subtitle: "Credibility & positioning",
    emoji: "🏆", color: "#0ea5e9",
    nodes: [
      { label: "Conventions / Conferences", step: "Y", freeTool: "Sessionize" },
      { label: "Fund Raising", step: "Y", freeTool: "GoFundMe", proTool: "Givebutter" },
      { label: "Exhibitors / JV", step: "Y", freeTool: "LinkedIn" },
    ],
  },
];

const totalNodes = CATEGORIES.reduce((s, c) => s + c.nodes.length, 0);
const STEP_COLORS: Record<string, string> = { A: "#f59e0b", B: "#10b981", Y: "#0ea5e9" };
const STEP_LABELS: Record<string, { letter: string; label: string; icon: typeof Hammer }> = {
  A: { letter: "A", label: "Analyze", icon: Sparkles },
  B: { letter: "B", label: "Build & Bridge", icon: Hammer },
  Y: { letter: "Y", label: "Yield", icon: DollarSign },
};

export default function ABBYFrameworkVisual({ hasConsultation, onConsultAbby, onNavigateTab }: Props) {
  return (
    <motion.div
      className="space-y-0"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-bold text-base">Your ABBY Monetisation Journey</h3>
          <p className="text-xs text-muted-foreground">
            0 of {totalNodes} streams activated
          </p>
        </div>
      </div>

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

        {/* Connector line */}
        <div className="flex flex-col items-center my-3">
          <div className="w-px h-8 bg-border" />
          <ChevronDown className="h-4 w-4 text-secondary" />
        </div>
      </div>

      {/* Phase 2: A — ANALYZE (Consult Abby) */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-xl rounded-2xl border-2 border-secondary/40 bg-secondary/5 p-6 md:p-8 text-center">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-secondary-foreground/60 bg-secondary/30 rounded-full px-4 py-1 mb-4">
            Strategic Planning
          </span>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-secondary/30 flex items-center justify-center text-2xl">
              👩‍💼
            </div>
          </div>
          <h4 className="font-heading font-bold text-lg md:text-xl mb-1">Consult with Abby</h4>
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
            Authors Bureau Business Advisor
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-5">
            Abby analyzes your book, understands your goals, and builds a personalized monetization strategy — recommending exactly which products to create first and why.
          </p>
          <Button
            onClick={onConsultAbby}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-md px-6"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {hasConsultation ? "Continue Consultation" : "Start Consultation"}
          </Button>
        </div>

        {/* Connector line */}
        <div className="flex flex-col items-center my-3">
          <div className="w-px h-8 bg-border" />
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Phase 3: B·B·Y — EXECUTION PLAN */}
      <div className="w-full rounded-2xl border border-border bg-card p-5 md:p-6 space-y-5">
        <div className="text-center mb-2">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted rounded-full px-4 py-1 mb-2">
            Execution Plan
          </span>
          <h4 className="font-heading font-bold text-base">Build · Bridge · Yield</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Each node follows: <strong>Strategize</strong> → <strong>Generate</strong> → <strong>Connect & Execute</strong>
          </p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const stepGroups = { A: [] as NodeDef[], B: [] as NodeDef[], Y: [] as NodeDef[] };
            cat.nodes.forEach((n) => stepGroups[n.step].push(n));

            return (
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
                  <span className="text-[10px] font-medium text-muted-foreground">{cat.nodes.length}</span>
                </div>

                {/* Nodes grouped by step */}
                <div className="space-y-2">
                  {(["A", "B", "Y"] as const).map((step) => {
                    const group = stepGroups[step];
                    if (group.length === 0) return null;
                    return (
                      <div key={step}>
                        <div className="flex items-center gap-1 mb-1">
                          <span
                            className="w-4 h-4 rounded text-[9px] font-black text-white flex items-center justify-center"
                            style={{ background: STEP_COLORS[step] }}
                          >
                            {step}
                          </span>
                          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {STEP_LABELS[step].label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.map((node) => (
                            <span
                              key={node.label}
                              className="inline-block rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                            >
                              {node.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 mt-3 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground pt-4">
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
