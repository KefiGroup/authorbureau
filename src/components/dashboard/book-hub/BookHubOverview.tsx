import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";

interface Book {
  id: string;
  title: string;
}

interface Props {
  book: Book;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

// Count products by status — this will later be dynamic from DB
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
              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              {/* Progress ring */}
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
        {/* Center label */}
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
              I've read your book <strong>"{book.title}"</strong> cover to cover. I can extract your proprietary frameworks, identify your ideal audience, 
              and map out a personalized monetization strategy across up to 27 revenue streams — all tailored to your content, your expertise, and your goals. 
              Let's build something that's uniquely yours.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={onConsultAbby}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Consult Abby About This Book
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateTab("automate")}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Build Next Product
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Manuscript Upload */}
      <ManuscriptUpload bookId={book.id} bookTitle={book.title} />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenuePotentialMeter activeStreams={0} />
        <ABBYProgressRing />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "A · Automate", desc: "10 digital products", color: "from-blue-500 to-blue-600", tab: "automate" },
          { label: "B · Build", desc: "5 coaching products", color: "from-amber-500 to-amber-600", tab: "build" },
          { label: "B · Broadcast", desc: "9 speaking products", color: "from-rose-500 to-rose-600", tab: "broadcast" },
        ].map((item) => (
          <motion.button
            key={item.tab}
            onClick={() => onNavigateTab(item.tab)}
            className="group flex items-center gap-3 rounded-xl border border-border p-4 text-left hover:border-muted-foreground/30 hover:shadow-md transition-all"
            whileHover={{ y: -2 }}
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
              {item.label.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
          </motion.button>
        ))}
      </div>

      {/* Y · Yield card */}
      <motion.button
        onClick={() => onNavigateTab("yield")}
        className="group flex items-center gap-3 rounded-xl border border-border p-4 text-left hover:border-muted-foreground/30 hover:shadow-md transition-all w-full sm:w-1/3"
        whileHover={{ y: -2 }}
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          Y
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-sm">Y · Yield</p>
          <p className="text-[11px] text-muted-foreground">4 seminar products</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
      </motion.button>

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
