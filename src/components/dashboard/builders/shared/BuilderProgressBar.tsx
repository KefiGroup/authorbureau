interface Props {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export default function BuilderProgressBar({ currentStep, totalSteps, stepLabels }: Props) {
  const percentage = totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 0;

  return (
    <div className="px-6 py-2 border-b border-border bg-card/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-xs text-muted-foreground">
          {percentage}% complete
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
