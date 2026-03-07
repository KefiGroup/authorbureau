import { motion } from "framer-motion";
import { Sparkles, MessageCircleHeart, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanSummary {
  bookTitle: string;
  streamsMapped: number;
  projectedRevenue: string;
  productsBuilt: number;
}

interface Props {
  hasPlan: boolean;
  planSummary?: PlanSummary;
  hasBook: boolean;
  onStartConsultation: () => void;
  onViewPlan?: () => void;
  onChatAbby?: () => void;
}

export default function MeetAbbySection({ hasPlan, planSummary, hasBook, onStartConsultation, onViewPlan, onChatAbby }: Props) {
  if (hasPlan && planSummary) {
    // Plan summary view
    return (
      <motion.section
        className="rounded-2xl border border-border bg-card p-6 md:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-3 py-1 w-fit">
              <Sparkles className="h-3 w-3" /> Business Plan Ready
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold">
              Your Business Plan for <span className="text-amber-600">"{planSummary.bookTitle}"</span>
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{planSummary.streamsMapped}</p>
                <p className="text-[10px] text-muted-foreground font-medium">of 27 Streams</p>
              </div>
              <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{planSummary.projectedRevenue}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Projected/yr</p>
              </div>
              <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{planSummary.productsBuilt}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Products Built</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={onViewPlan} className="bg-amber-600 hover:bg-amber-700 text-white">
                View Full Business Plan
              </Button>
              <Button variant="outline" onClick={onChatAbby}>
                <MessageCircleHeart className="h-4 w-4 mr-2" /> Chat with Abby
              </Button>
            </div>
          </div>
          <div className="lg:col-span-5 flex items-center justify-center">
            <AbbyMockChat />
          </div>
        </div>
      </motion.section>
    );
  }

  // No plan — introduction
  return (
    <motion.section
      className="rounded-2xl border border-border bg-card p-6 md:p-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 rounded-full px-3 py-1 w-fit">
            <Sparkles className="h-3 w-3" /> Also Free — No Credit Card Needed
          </span>

          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            Meet Abby — Your AI Business Consultant
          </h2>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
            Abby analyzes your book and creates a personalized business plan with up to <strong className="text-foreground">27 revenue streams</strong>, 
            branded products, pricing recommendations, and revenue projections tailored to your expertise.
          </p>

          <p className="text-sm font-semibold text-foreground italic">
            "Your microsite is your storefront. But what will you sell?"
          </p>

          <div className="flex gap-4">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 flex items-center gap-3 flex-1">
              <BarChart3 className="h-6 w-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-lg text-foreground">27</p>
                <p className="text-[10px] text-muted-foreground">Revenue Streams Mapped</p>
              </div>
            </div>
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3 flex-1">
              <TrendingUp className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-lg text-foreground">$50K–$200K</p>
                <p className="text-[10px] text-muted-foreground">Potential Revenue/yr</p>
              </div>
            </div>
          </div>

          {hasBook ? (
            <Button onClick={onStartConsultation} size="lg" className="w-fit bg-amber-600 hover:bg-amber-700 text-white shadow-lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Start Your Free Consultation with Abby →
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border">
              📘 Set up your microsite and add a book first — then Abby can analyze it and build your business plan.
            </p>
          )}
        </div>

        <div className="lg:col-span-5 flex items-center justify-center">
          <AbbyMockChat />
        </div>
      </div>
    </motion.section>
  );
}

function AbbyMockChat() {
  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <span className="text-white font-bold text-sm">Abby — Business Advisor</span>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[85%]">
          <p className="text-foreground">Great — I've analyzed your book! Based on your expertise, I see strong potential in <strong>3 key areas</strong>.</p>
        </div>
        <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[85%]">
          <p className="text-foreground mb-2">Which resonates most?</p>
          <div className="space-y-1">
            {["A) Online courses", "B) Coaching programs", "C) Speaking events", "D) All of the above"].map((opt) => (
              <div key={opt} className="rounded bg-background border border-border px-2 py-1 text-[10px]">{opt}</div>
            ))}
          </div>
        </div>
        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg rounded-tr-none p-3 max-w-[75%] ml-auto">
          <p className="text-foreground">D — All of the above!</p>
        </div>
        <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[85%]">
          <p className="text-foreground">Perfect! I've mapped <strong>12 revenue streams</strong> for you. Let me build your business plan... ✨</p>
        </div>
      </div>
    </div>
  );
}
