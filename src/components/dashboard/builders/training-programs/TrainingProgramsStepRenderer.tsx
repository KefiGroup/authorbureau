import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "programName", label: "Program Name", type: "text", placeholder: "e.g. Leadership Mastery Training" },
  { key: "duration", label: "Duration", type: "pills", cols: 4, options: [
    { value: "4-weeks", label: "4 Weeks" },
    { value: "6-weeks", label: "6 Weeks" },
    { value: "8-weeks", label: "8 Weeks" },
    { value: "12-weeks", label: "12 Weeks" },
  ]},
  { key: "frequency", label: "Session Frequency", type: "pills", cols: 3, options: [
    { value: "weekly", label: "Weekly" },
    { value: "bi-weekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
  ]},
  { key: "delivery", label: "Delivery", type: "pills", cols: 4, options: [
    { value: "in-person", label: "In-Person" },
    { value: "virtual", label: "Virtual" },
    { value: "hybrid", label: "Hybrid" },
    { value: "self-paced", label: "Self-Paced + Live" },
  ]},
  { key: "capacity", label: "Participant Capacity", type: "pills", cols: 4, options: [
    { value: "10-20", label: "10-20" },
    { value: "20-50", label: "20-50" },
    { value: "50-100", label: "50-100" },
    { value: "100+", label: "100+" },
  ]},
  { key: "pricingModel", label: "Pricing Model", type: "pills", cols: 3, options: [
    { value: "per-participant", label: "Per Participant", badge: "$500–$2,000" },
    { value: "per-org", label: "Per Organization", badge: "$5,000–$25,000" },
    { value: "licensed", label: "Licensed", badge: "$10,000–$50,000/yr" },
  ]},
  { key: "price", label: "Price (USD)", type: "price" },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function TrainingProgramsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep configKey="trainingConfig" fields={SETUP_FIELDS} abbyTip="Training programs create recurring revenue through licensing. One organization paying $25,000/year for your program license is worth 50 individual course sales." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ duration: "8-weeks", frequency: "weekly", delivery: "hybrid", capacity: "20-50", pricingModel: "per-org", price: 15000 }} />;
    case "curriculum":
      return <SharedContentStep contentKey="trainingCurriculum" title="Training Curriculum" description="Session-by-session curriculum with topics, objectives, activities, and assessments." abbyTip="Include pre- and post-program assessments to demonstrate measurable ROI to organizations." aiPrompt={`Generate a training program curriculum for "{bookTitle}". Config: {config}. Include: SESSION-BY-SESSION BREAKDOWN (topic, learning objectives, activities, materials needed, assessment), PRE-PROGRAM ASSESSMENT (baseline measurement), POST-PROGRAM ASSESSMENT (results measurement), MANAGER BRIEFING MATERIALS (for organizational buy-in). Format as professional markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="trainingConfig" />;
    case "materials":
      return <SharedContentStep contentKey="trainingMaterials" title="Training Materials" description="Participant handbook, facilitator guide, slide decks, exercises, case studies, and assessment rubrics." abbyTip="A train-the-trainer guide enables organizations to run the program internally — that's your path to licensing revenue." aiPrompt={`Generate training program materials for "{bookTitle}". Config: {config}. Include: 1) PARTICIPANT HANDBOOK outline, 2) FACILITATOR GUIDE (detailed, with timing and talking points), 3) SLIDE DECK outline per session, 4) EXERCISE WORKSHEETS (3-5 per session), 5) CASE STUDIES (3 scenarios from book content), 6) ASSESSMENT RUBRICS. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="trainingConfig" />;
    case "licensing":
      return <SharedContentStep contentKey="trainingLicensing" title="Licensing & Sales" description="Brochure, licensing agreement, train-the-trainer guide, ROI case study, and proposal template." abbyTip="Position licensing as saving the buyer time and money vs. creating training from scratch. Licensing = true passive income." aiPrompt={`Generate licensing and sales materials for a training program based on "{bookTitle}". Config: {config}. Include: 1) TRAINING PROGRAM BROCHURE content, 2) LICENSING AGREEMENT TEMPLATE, 3) TRAIN-THE-TRAINER GUIDE outline, 4) ROI CASE STUDY TEMPLATE, 5) PROPOSAL TEMPLATE for organizations. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="trainingConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Training Program" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Program configured", check: d => !!d.trainingConfig?.programName },
        { label: "Curriculum created", check: d => !!d.trainingCurriculum },
        { label: "Training materials ready", check: d => !!d.trainingMaterials },
        { label: "Licensing materials ready", check: d => !!d.trainingLicensing },
      ]} revenue={{ calculate: d => {
        const price = d.trainingConfig?.price || 15000;
        return { amount: price, description: `One enterprise license at $${price.toLocaleString()}/year requires zero additional effort` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <GraduationCap className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.trainingConfig?.programName || "Training Program"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.trainingConfig?.duration || "8 weeks"} • {d.trainingConfig?.delivery || "Hybrid"}</p>
          <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1">${(d.trainingConfig?.price || 15000).toLocaleString()}</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
