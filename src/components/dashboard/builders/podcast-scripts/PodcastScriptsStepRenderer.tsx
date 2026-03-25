import PodcastScriptsSetupStep from "./PodcastScriptsSetupStep";
import EpisodeRoadmapStep from "./EpisodeRoadmapStep";
import ScriptGeneratorStep from "./ScriptGeneratorStep";
import GuestInterviewStep from "./GuestInterviewStep";
import PodcastScriptsPublishStep from "./PodcastScriptsPublishStep";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  plan: Record<string, any> | null;
  generationState: string;
  setGenerationState: (state: any) => void;
  userId: string;
}

export default function PodcastScriptsStepRenderer({
  stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId,
}: Props) {
  switch (stepId) {
    case "setup":
      return <PodcastScriptsSetupStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} plan={plan} />;
    case "roadmap":
      return <EpisodeRoadmapStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} />;
    case "script":
      return <ScriptGeneratorStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} />;
    case "guests":
      return <GuestInterviewStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} />;
    case "publish":
      return <PodcastScriptsPublishStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} />;
    default:
      return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
