import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import ABBYFrameworkVisual from "./ABBYFrameworkVisual";
import { supabase } from "@/integrations/supabase/client";

interface Book {
  id: string;
  title: string;
}

interface Props {
  book: Book;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

const TOTAL_REVENUE_STREAMS = 27;

function RevenuePotentialMeter({ activeStreams }: { activeStreams: number }) {
  const percentage = Math.round((activeStreams / TOTAL_REVENUE_STREAMS) * 100);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-bold text-sm">Revenue Potential</h3>
        <span className="text-xs font-medium text-muted-foreground">
          {activeStreams} of {TOTAL_REVENUE_STREAMS} streams
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-secondary to-secondary/70"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percentage, 2)}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {percentage}% unlocked — {TOTAL_REVENUE_STREAMS - activeStreams} more revenue streams available
      </p>
    </div>
  );
}

function ABBYProgressRing() {
  const rings = [
    { label: "A", color: "#3b82f6", percent: 0 },
    { label: "B", color: "#d97706", percent: 0 },
    { label: "B", color: "#f43f5e", percent: 0 },
    { label: "Y", color: "#10b981", percent: 0 },
  ];

  const size = 160;
  const center = size / 2;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center">
      <h3 className="font-heading font-bold text-sm mb-4">ABBY Progress</h3>
      <div className="relative" style={{ width: size, height: size }}>
        {rings.map((ring, i) => {
          const radius = 70 - i * 14;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (ring.percent / 100) * circumference;

          return (
            <svg key={i} className="absolute inset-0" width={size} height={size}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              {ring.percent > 0 && (
                <motion.circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, delay: i * 0.15, ease: "easeOut" }}
                  transform={`rotate(-90 ${center} ${center})`}
                />
              )}
            </svg>
          );
        })}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">0%</span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        {rings.map((ring, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ring.color }} />
            <span className="text-[10px] font-semibold text-muted-foreground">{ring.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookHubOverview({ book, onConsultAbby, onNavigateTab }: Props) {
  const [hasConsultation, setHasConsultation] = useState(false);

  useEffect(() => {
    async function checkConsultation() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("consultation_sessions")
        .select("id", { count: "exact", head: true })
        .eq("book_id", book.id)
        .eq("user_id", user.id);
      setHasConsultation((count ?? 0) > 0);
    }
    checkConsultation();
  }, [book.id]);

  return (
    <div className="space-y-6">
      {/* Abby's Business Snapshot */}
      <motion.div
        className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center flex-shrink-0 text-xl">
            👩‍💼
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-heading font-bold text-base">Abby's Business Snapshot</h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 rounded-full px-2 py-0.5">
                AI Advisor
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {hasConsultation ? (
                <>
                  I've completed your <strong>Needs Analysis</strong> for <strong>"{book.title}"</strong> and designed your customised ABBY Framework below. 
                  Each category shows the products I recommend — with transparent, itemised pricing available when you're ready to build. 
                  Let's turn your expertise into revenue.
                </>
              ) : (
                <>
                  I'll start by conducting a <strong>Needs Analysis</strong> on your book <strong>"{book.title}"</strong> — understanding your goals, audience size, and revenue ambitions. 
                  From there, I'll design a <strong>customised ABBY Framework</strong> mapping the exact products and revenue streams that fit your expertise. 
                  You'll see transparent, itemised à-la-carte pricing for each product — plus a bundled subscription option that saves you more. 
                  Think of me as your strategist <em>and</em> your sales partner: I don't just advise, I help you build and sell.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={onConsultAbby}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {hasConsultation ? "Continue Consultation" : "Consult Abby About This Book"}
              </Button>
              {hasConsultation && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateTab("automate")}
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Build Next Product
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Customised ABBY Framework — appears after consultation */}
      <ABBYFrameworkVisual
        hasConsultation={hasConsultation}
        onConsultAbby={onConsultAbby}
        onNavigateTab={onNavigateTab}
      />

      {/* Manuscript Upload — show prominently if no consultation yet */}
      {!hasConsultation && (
        <ManuscriptUpload bookId={book.id} bookTitle={book.title} />
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenuePotentialMeter activeStreams={0} />
        <ABBYProgressRing />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading font-bold text-sm mb-3">Recent Activity</h3>
        <div className="text-sm text-muted-foreground text-center py-6">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p>No activity yet for this book.</p>
          <p className="text-xs mt-1">Start by consulting Abby or building your first product.</p>
        </div>
      </div>
    </div>
  );
}
