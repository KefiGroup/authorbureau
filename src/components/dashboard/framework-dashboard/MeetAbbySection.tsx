import { motion } from "framer-motion";
import { Sparkles, MessageCircleHeart, TrendingUp, BarChart3, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewUserOnboarding from "./NewUserOnboarding";

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
  bookApproved?: boolean;
  profileComplete?: boolean;
  onStartConsultation: () => void;
  onViewPlan?: () => void;
  onChatAbby?: () => void;
  onSetupProfile?: () => void;
  onAddBook?: () => void;
}

export default function MeetAbbySection({ hasPlan, planSummary, hasBook, bookApproved, profileComplete, onStartConsultation, onViewPlan, onChatAbby, onSetupProfile, onAddBook }: Props) {
  if (hasPlan && planSummary) {
    return (
      <motion.section
        className="rounded-2xl border border-border bg-card p-6 md:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-3 py-1 w-fit">
            <Sparkles className="h-3 w-3" /> Your Abby Business Plan Is Ready
          </span>
          <h2 className="font-heading text-2xl md:text-3xl font-bold">
            Your Monetization Plan for <span className="text-amber-600">"{planSummary.bookTitle}"</span>
          </h2>
          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">28</p>
              <p className="text-[10px] text-muted-foreground font-medium">Revenue Streams Available</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{planSummary.projectedRevenue}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Projected/yr</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{planSummary.productsBuilt} of 28</p>
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
      </motion.section>
    );
  }

  return (
    <motion.section
      className="rounded-2xl border border-border bg-card p-6 md:p-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="space-y-5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 rounded-full px-3 py-1 w-fit">
          <Sparkles className="h-3 w-3" /> Also Free — No Credit Card Needed
        </span>

        <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
          Meet Abby — Your AI Business Consultant
        </h2>

        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Your book page is your storefront. But what will you sell? Abby analyzes your book and creates a personalized business plan with up to <strong className="text-foreground">28 revenue streams</strong> — 
          branded products, pricing recommendations, and revenue projections tailored to your expertise.
        </p>

        <p className="text-xs text-muted-foreground italic">
          Most authors leave $50,000–$200,000/year on the table because they don't know how to monetize beyond book sales.
        </p>

        <div className="flex gap-4 max-w-md">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 flex items-center gap-3 flex-1">
            <BarChart3 className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold text-lg text-foreground">28</p>
              <p className="text-[10px] text-muted-foreground">Revenue Streams Available</p>
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
          <div className="space-y-2">
            {bookApproved ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-5 py-4 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Your book is now live on Authors Bureau! 🎉</p>
                    <p className="text-xs text-green-700/80 dark:text-green-300/60">Your book page is published and visible to readers. Now let Abby analyze it to map up to 28 revenue streams into a personalized business plan — it's free and takes about 5 minutes.</p>
                  </div>
                </div>
                <Button onClick={onStartConsultation} size="lg" className="w-fit bg-amber-600 hover:bg-amber-700 text-white shadow-lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Your Book with Abby →
                </Button>
                <p className="text-[10px] text-muted-foreground">Takes 5 minutes. Your business plan is saved forever.</p>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-5 py-4">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">🎉 Congratulations! Your book has been submitted to Authors Bureau!</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/60">Our team is reviewing it now. Once approved, your book page will go live on the Authors Bureau directory and Abby will be ready to analyze it.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <NewUserOnboarding
            profileComplete={profileComplete ?? false}
            hasBook={false}
            onSetupProfile={onSetupProfile ?? (() => {})}
            onAddBook={onAddBook ?? (() => {})}
            onAnalyze={onStartConsultation}
          />
        )}
      </div>
    </motion.section>
  );
}
