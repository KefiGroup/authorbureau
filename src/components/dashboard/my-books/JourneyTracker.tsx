import { Check, Globe, Sparkles, CreditCard, Hammer, DollarSign, Lock } from "lucide-react";

export type JourneyStage = 1 | 2 | 3 | 4 | 5;

interface JourneyTrackerProps {
  currentStage: JourneyStage;
  isSubscribed: boolean;
}

const stages = [
  { label: "Microsite", color: "#0D9488", icon: Globe },
  { label: "Analyzed", color: "#C4973B", icon: Sparkles },
  { label: "Subscribed", color: "#6366F1", icon: CreditCard },
  { label: "Building", color: "#0D9488", icon: Hammer },
  { label: "Earning", color: "#059669", icon: DollarSign },
];

export function getBookStage(opts: {
  hasMicrosite: boolean;
  isAnalyzed: boolean;
  isSubscribed: boolean;
  productsBuilt: number;
  hasRevenue: boolean;
}): JourneyStage {
  if (opts.hasRevenue) return 5;
  if (opts.productsBuilt > 0) return 4;
  if (opts.isSubscribed && opts.isAnalyzed) return 4; // ready to build
  if (opts.isAnalyzed) return 3; // needs subscription
  if (opts.hasMicrosite) return 2; // needs analysis
  return 1;
}

export default function JourneyTracker({ currentStage, isSubscribed }: JourneyTrackerProps) {
  const getStageState = (stageIndex: number): "done" | "current" | "locked" => {
    const stageNum = stageIndex + 1;
    // Stage 3 (Subscribed) is account-level
    if (stageNum === 3) {
      if (isSubscribed) return currentStage > 3 ? "done" : currentStage === 3 ? "done" : "done";
      // Not subscribed
      if (currentStage >= 3) return "current"; // this is what's blocking
      return "locked";
    }
    if (stageNum < currentStage) return "done";
    if (stageNum === currentStage) return "current";
    return "locked";
  };

  // If subscribed, stage 3 is always done. Adjust currentStage display:
  const effectiveStates = stages.map((_, i) => {
    const stageNum = i + 1;
    if (stageNum === 3 && isSubscribed) return "done" as const;
    if (stageNum < currentStage) return "done" as const;
    if (stageNum === currentStage) {
      // If current is 3 and subscribed, it's done (handled above)
      if (stageNum === 3 && !isSubscribed) return "current" as const;
      return "current" as const;
    }
    return "locked" as const;
  });

  return (
    <div className="flex items-center w-full px-2 py-2">
      {stages.map((stage, i) => {
        const state = effectiveStates[i];
        const StageIcon = stage.icon;

        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 relative">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                  state === "done"
                    ? "bg-[#0D9488]"
                    : state === "current"
                    ? "bg-[#C4973B] shadow-[0_0_0_4px_rgba(196,151,59,0.2)] animate-pulse"
                    : "bg-[#F3F4F6]"
                }`}
              >
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : state === "current" ? (
                  <StageIcon className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Lock className="h-3 w-3 text-[#9CA3AF]" />
                )}
              </div>
              <span
                className={`text-[9px] font-medium mt-1 ${
                  state === "done"
                    ? "text-[#0D9488]"
                    : state === "current"
                    ? "text-[#C4973B]"
                    : "text-[#9CA3AF]"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < 4 && (
              <div
                className={`h-[2px] flex-1 -mt-3 ${
                  effectiveStates[i + 1] === "done" || state === "done"
                    ? "bg-[#0D9488]"
                    : "bg-[#E5E7EB]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
