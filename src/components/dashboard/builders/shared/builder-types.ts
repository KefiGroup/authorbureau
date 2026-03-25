/**
 * Shared type definitions for all builder step renderers.
 * Centralises the GenerationState union and base step props
 * so individual builder type files stay DRY.
 */

export type GenerationState =
  | "idle"
  | "queued"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

/** The business-plan JSON blob passed down from the book hub */
export type BuilderPlan = Record<string, unknown> | null;

/** Dynamic step data bag — intentionally loose because each builder stores different keys */
export type StepData = Record<string, unknown>;

export interface BaseBuilderStepProps {
  stepData: StepData;
  setStepData: React.Dispatch<React.SetStateAction<StepData>>;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  plan: BuilderPlan;
  generationState: GenerationState;
  setGenerationState: (s: GenerationState) => void;
  userId: string;
}

/**
 * Props for step-renderer wrapper components that receive
 * everything from the parent builder studio.
 */
export interface StepRendererProps extends BaseBuilderStepProps {
  stepId: string;
}
