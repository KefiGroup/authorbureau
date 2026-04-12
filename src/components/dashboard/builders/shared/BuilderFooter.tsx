import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BuilderFooterProps {
  onPrevious: () => void;
  onNext: () => void;
  onAskAbby: () => void;
  isPreviousDisabled: boolean;
  isLastStep: boolean;
  isSaving: boolean;
  showAskAbby: boolean;
  hideNextOnLastStep?: boolean;
}

export default function BuilderFooter({
  onPrevious,
  onNext,
  onAskAbby,
  isPreviousDisabled,
  isLastStep,
  isSaving,
  showAskAbby,
  hideNextOnLastStep,
}: BuilderFooterProps) {
  return (
    <div
      className="shrink-0 border-t border-border bg-card flex items-center justify-between px-6"
      style={{
        height: 64,
        boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
        zIndex: 10,
      }}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onPrevious}
          disabled={isPreviousDisabled}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        {showAskAbby && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAskAbby}
            className="border-secondary/40 text-secondary hover:bg-secondary/10"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Ask Abby
          </Button>
        )}
      </div>

      {isLastStep && hideNextOnLastStep ? (
        <div />
      ) : (
        <Button
          disabled={isSaving}
          onClick={onNext}
          variant="secondary"
          className="rounded-full font-semibold px-6 shadow-sm"
        >
          {isLastStep ? (
            isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" /> Publishing&hellip;
              </>
            ) : (
              <>Publish</>
            )
          ) : (
            <>
              Save &amp; Continue <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
