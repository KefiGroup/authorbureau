import { motion } from "framer-motion";
import { Globe, Sparkles, Wrench, TrendingUp, BookOpen, CreditCard, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type StepState = "done" | "current" | "upcoming";

interface Props {
  micrositeState: StepState;
  planState: StepState;
  buildState: StepState;
  sellState: StepState;
  currentJourneyStep: "microsite" | "analyze" | "payments" | "build" | "earn";
  onAction: (action: string) => void;
}

const steps = [
  { key: "microsite", label: "Your Author Page", sub: "FREE", icon: Globe },
  { key: "plan", label: "Abby Business Plan", sub: "FREE", icon: Sparkles },
  { key: "build", label: "Build Products", sub: "From $47/mo", icon: Wrench },
  { key: "sell", label: "Sell & Grow", sub: "Keep ~92%", icon: TrendingUp },
];

const ctaConfig: Record<string, { primary: { label: string; action: string; icon: typeof Globe }; secondary: { label: string; action: string; icon: typeof Globe } }> = {
  microsite: {
    primary: { label: "Add Your First Book →", action: "add-book", icon: BookOpen },
    secondary: { label: "Complete Your Profile →", action: "profile", icon: Globe },
  },
  analyze: {
    primary: { label: "Analyze Your Book with Abby →", action: "analyze", icon: Sparkles },
    secondary: { label: "View Your Microsite →", action: "view-microsite", icon: Globe },
  },
  payments: {
    primary: { label: "Connect Stripe →", action: "connect-stripe", icon: CreditCard },
    secondary: { label: "Start Building Products →", action: "build", icon: Wrench },
  },
  build: {
    primary: { label: "Build Your First Product →", action: "build", icon: Wrench },
    secondary: { label: "View Your Business Plan →", action: "analyze", icon: Sparkles },
  },
  earn: {
    primary: { label: "View Your Revenue Dashboard →", action: "analytics", icon: BarChart3 },
    secondary: { label: "Build More Products →", action: "build", icon: Wrench },
  },
};

export default function JourneyMapCTA({ micrositeState, planState, buildState, sellState, currentJourneyStep, onAction }: Props) {
  const states: Record<string, StepState> = {
    microsite: micrositeState,
    plan: planState,
    build: buildState,
    sell: sellState,
  };

  const cta = ctaConfig[currentJourneyStep];

  return (
    <motion.section
      className="rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #FFF8E7 0%, #FFF1CC 100%)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="p-6 md:p-10 space-y-8">
        {/* Journey steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((step, i) => {
            const state = states[step.key];
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                className={`relative rounded-xl p-4 text-center transition-all ${
                  state === "current"
                    ? "bg-white shadow-lg ring-2 ring-amber-400"
                    : state === "done"
                    ? "bg-white/80 shadow-sm"
                    : "bg-white/50"
                }`}
              >
                {state === "current" && (
                  <motion.div
                    className="absolute inset-0 rounded-xl ring-2 ring-amber-400"
                    animate={{ boxShadow: ["0 0 0 0 rgba(245,158,11,0.4)", "0 0 0 8px rgba(245,158,11,0)", "0 0 0 0 rgba(245,158,11,0)"] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
                <div className="flex flex-col items-center gap-2 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    state === "done" ? "bg-green-100 text-green-600"
                    : state === "current" ? "bg-amber-100 text-amber-600"
                    : "bg-gray-100 text-gray-400"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${state === "upcoming" ? "text-gray-400" : "text-gray-900"}`}>
                      Step {i + 1}
                    </p>
                    <p className={`text-xs font-medium ${state === "upcoming" ? "text-gray-400" : "text-gray-700"}`}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{step.sub}</p>
                  </div>
                  {state === "done" && (
                    <span className="text-[10px] font-bold text-green-600">✓ Done</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic CTA */}
        <div className="text-center space-y-4">
          <p className="font-heading text-xl md:text-2xl font-bold text-gray-900 italic">
            "Your book is not the business. Your book is the <span className="text-amber-600">HOOK</span>."
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => onAction(cta.primary.action)} size="lg" className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg">
              <cta.primary.icon className="h-4 w-4 mr-2" />
              {cta.primary.label}
            </Button>
            <Button onClick={() => onAction(cta.secondary.action)} size="lg" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
              <cta.secondary.icon className="h-4 w-4 mr-2" />
              {cta.secondary.label}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Join 500+ authors who are turning their books into thriving businesses on Authors Bureau.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
