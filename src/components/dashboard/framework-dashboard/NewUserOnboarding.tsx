import { motion } from "framer-motion";
import { User, BookOpen, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  profileComplete: boolean;
  hasBook: boolean;
  onSetupProfile: () => void;
  onAddBook: () => void;
  onAnalyze: () => void;
}

const steps = [
  {
    icon: User,
    title: "Set Up Your Author Profile",
    description: "Add your name, photo, bio, and genre so readers can find you.",
    actionLabel: "Create Profile",
    doneLabel: "Profile Ready",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    ring: "ring-blue-500/20",
  },
  {
    icon: BookOpen,
    title: "Add Your First Book",
    description: "Upload your book details — title, cover, and Amazon link. This is what Abby will analyze.",
    actionLabel: "Add a Book",
    doneLabel: "Book Added",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/20",
  },
  {
    icon: Sparkles,
    title: "Build My Business Plan",
    description: "ABBY reads your book and maps 28 revenue streams into your personalised plan — free, 5 minutes.",
    actionLabel: "Start with ABBY →",
    doneLabel: "Plan Created",
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/30",
    ring: "ring-secondary/20",
  },
];

export default function NewUserOnboarding({ profileComplete, hasBook, onSetupProfile, onAddBook, onAnalyze }: Props) {
  const currentStep = !profileComplete ? 0 : !hasBook ? 1 : 2;
  const actions = [onSetupProfile, onAddBook, onAnalyze];

  return (
    <motion.div
      className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 via-background to-primary/5 p-6 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            Welcome! Let's Build Your Author Business
          </h2>
          <p className="text-sm text-muted-foreground">
            3 quick steps to unlock your personalized monetization plan
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-6">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const isLocked = i > currentStep;

          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`relative rounded-xl border-2 p-5 transition-all ${
                isDone
                  ? "border-green-500/40 bg-green-500/5"
                  : isCurrent
                  ? `${step.border} ${step.bg} ring-2 ${step.ring} shadow-lg`
                  : "border-border bg-muted/20 opacity-60"
              }`}
            >
              {/* Step number */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  isDone ? "text-green-600" : isCurrent ? step.color : "text-muted-foreground"
                }`}>
                  Step {i + 1}
                </span>
                {isDone && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {isCurrent && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                  </span>
                )}
              </div>

              {/* Icon */}
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${
                isDone ? "bg-green-500/15" : isCurrent ? step.bg : "bg-muted/50"
              }`}>
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <step.icon className={`h-5 w-5 ${isCurrent ? step.color : "text-muted-foreground"}`} />
                )}
              </div>

              <h3 className={`font-heading font-bold text-sm mb-1 ${
                isDone ? "text-green-700" : "text-foreground"
              }`}>
                {isDone ? step.doneLabel : step.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {step.description}
              </p>

              {isCurrent && (
                <Button
                  size="sm"
                  onClick={actions[i]}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                >
                  {step.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}

              {isLocked && (
                <div className="h-8" /> // spacer to keep card heights even
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Connector line between steps (desktop only) */}
      <div className="hidden sm:flex justify-center items-center gap-1 mt-2 -mb-2">
        <div className={`h-0.5 w-20 rounded ${currentStep > 0 ? "bg-green-500" : "bg-border"}`} />
        <div className={`h-0.5 w-20 rounded ${currentStep > 1 ? "bg-green-500" : "bg-border"}`} />
      </div>
    </motion.div>
  );
}
