import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Crown, X, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAbbyGates } from "@/hooks/useAbbyGates";
import { getStudioPath } from "@/config/abbyFrameworkConfig";

interface Props {
  bookId?: string | null;
  bookTitle?: string;
  onUpgrade?: () => void;
}

/**
 * Single-decision "What should I do right now?" advisory card driven by the
 * ABBY Node-Triggered Activation Engine. Renders one of: gate celebration,
 * next node, tier upgrade, or "all complete".
 */
export default function AbbyNextStepCard({ bookId, bookTitle, onUpgrade }: Props) {
  const navigate = useNavigate();
  const { loading, nextStep, skip } = useAbbyGates({ bookId });

  if (loading || !nextStep) return null;

  if (nextStep.kind === "complete") {
    return (
      <Card>
        <Eyebrow icon={<Sparkles className="h-3.5 w-3.5" />}>ABBY · All caught up</Eyebrow>
        <h3 className="font-heading text-xl font-black text-foreground">
          You've built the full 28-node platform 🎉
        </h3>
        <p className="text-sm text-foreground/70 mt-1">
          Keep your funnel warm and your CRM working — ABBY will surface new opportunities as your audience grows.
        </p>
      </Card>
    );
  }

  if (nextStep.kind === "gate") {
    return (
      <Card>
        <Eyebrow icon={<PartyPopper className="h-3.5 w-3.5" />}>ABBY · Milestone unlocked</Eyebrow>
        <h3 className="font-heading text-xl font-black text-foreground">{nextStep.title}</h3>
        <p className="text-sm text-foreground/70 mt-1">{nextStep.message}</p>
      </Card>
    );
  }

  if (nextStep.kind === "upgrade") {
    return (
      <Card>
        <Eyebrow icon={<Crown className="h-3.5 w-3.5" />}>
          ABBY · Upgrade to {nextStep.to === "build" ? "Build" : "Full Platform"}
        </Eyebrow>
        <h3 className="font-heading text-xl font-black text-foreground">
          {nextStep.from === "brand" ? "Brand phase complete" : "Build phase complete"}
        </h3>
        <p className="text-sm text-foreground/70 mt-1">{nextStep.message}</p>
        <div className="mt-4">
          <Button
            size="lg"
            onClick={() => { if (onUpgrade) onUpgrade(); else navigate("/dashboard?section=settings"); }}
            className="gap-2"
          >
            <Crown className="h-4 w-4" /> Upgrade now
          </Button>
        </div>
      </Card>
    );
  }

  // kind === "node"
  const handleOpen = () => {
    const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";
    const path = getStudioPath(nextStep.nodeId, bookId ?? "", titleParam);
    if (path) navigate(path);
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow icon={<Sparkles className="h-3.5 w-3.5" />}>
          ABBY · Your Next Step · {nextStep.nodeId}
        </Eyebrow>
        <button
          onClick={() => skip(nextStep.nodeId)}
          className="text-foreground/40 hover:text-foreground/80 transition-colors"
          aria-label="Skip this step"
          title="Skip — ABBY will suggest the next one"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="font-heading text-xl font-black text-foreground mt-1">
        {nextStep.plainDescription}
      </h3>
      <p className="text-sm text-foreground/70 mt-2">
        <span className="font-semibold text-foreground/90">ABBY will:</span> {nextStep.abbyWillDo}
      </p>
      {nextStep.revenueLine && (
        <p className="text-xs text-foreground/60 mt-2 italic">{nextStep.revenueLine}</p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button size="lg" onClick={handleOpen} className="gap-2">
          Approve & Continue <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          onClick={() => skip(nextStep.nodeId)}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/0 p-5 sm:p-6">
      {children}
    </div>
  );
}

function Eyebrow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2 text-amber-600">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{children}</span>
    </div>
  );
}
