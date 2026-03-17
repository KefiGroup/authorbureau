import { motion } from "framer-motion";
import { Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import staircaseImg from "@/assets/abby_journey_framework_v13.png";

type StepState = "done" | "current" | "upcoming";

interface Props {
  micrositeState: StepState;
  planState: StepState;
  buildState: StepState;
  sellState: StepState;
  currentJourneyStep: "microsite" | "analyze" | "payments" | "build" | "earn";
  onAction: (action: string) => void;
}

const ctaConfig: Record<string, { primary: { label: string; action: string }; secondary: { label: string; action: string } }> = {
  microsite: {
    primary: { label: "Analyze Your Book with Abby →", action: "analyze" },
    secondary: { label: "View Your Directory Profile →", action: "view-microsite" },
  },
  analyze: {
    primary: { label: "Analyze Your Book with Abby →", action: "analyze" },
    secondary: { label: "View Your Directory Profile →", action: "view-microsite" },
  },
  payments: {
    primary: { label: "Connect Stripe →", action: "connect-stripe" },
    secondary: { label: "Start Building Products →", action: "build" },
  },
  build: {
    primary: { label: "Build Your First Product →", action: "build" },
    secondary: { label: "View Your Business Plan →", action: "analyze" },
  },
  earn: {
    primary: { label: "View Your Revenue Dashboard →", action: "analytics" },
    secondary: { label: "Build More Products →", action: "build" },
  },
};

export default function JourneyMapCTA({ currentJourneyStep, onAction }: Props) {
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
        {/* Staircase image */}
        <div className="rounded-xl overflow-hidden">
          <img
            src={staircaseImg}
            alt="The ABBY Journey Framework - One Book. 28 Revenue Streams. Your Empire."
            className="w-full h-auto"
          />
        </div>

        {/* Dynamic CTA */}
        <div className="text-center space-y-4">
          <p className="font-heading text-xl md:text-2xl font-bold text-gray-900 italic">
            "Your book is not the business. Your book is the <span className="text-amber-600">HOOK</span>."
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => onAction(cta.primary.action)} size="lg" className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg">
              <Sparkles className="h-4 w-4 mr-2" />
              {cta.primary.label}
            </Button>
            <Button onClick={() => onAction(cta.secondary.action)} size="lg" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
              <Globe className="h-4 w-4 mr-2" />
              {cta.secondary.label}
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
