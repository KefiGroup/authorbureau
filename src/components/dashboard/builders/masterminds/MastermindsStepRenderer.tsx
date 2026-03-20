import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "mastermindName", label: "Mastermind Name", type: "text", placeholder: "e.g. Inner Circle Mastermind" },
  { key: "groupSize", label: "Group Size", type: "pills", cols: 3, options: [
    { value: "5-8", label: "5-8", description: "Intimate" },
    { value: "8-12", label: "8-12", description: "Standard", badge: "Recommended" },
    { value: "12-20", label: "12-20", description: "Large" },
  ]},
  { key: "duration", label: "Duration", type: "pills", cols: 3, options: [
    { value: "6-months", label: "6 Months" },
    { value: "12-months", label: "12 Months", badge: "Recommended" },
    { value: "ongoing", label: "Ongoing" },
  ]},
  { key: "meetingFrequency", label: "Meeting Frequency", type: "pills", cols: 3, options: [
    { value: "weekly", label: "Weekly" },
    { value: "bi-weekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
  ]},
  { key: "meetingFormat", label: "Meeting Format", type: "pills", cols: 3, options: [
    { value: "virtual", label: "Virtual" },
    { value: "hybrid", label: "In-person quarterly + virtual" },
    { value: "in-person", label: "All in-person" },
  ]},
  { key: "price", label: "Annual Price (USD)", type: "price" },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function MastermindsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep bookId={bookId} configKey="mastermindConfig" fields={SETUP_FIELDS} abbyTip="Masterminds are your highest-value recurring product. 8 members at $10,000/year = $80,000 — and the community creates its own retention." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ groupSize: "8-12", duration: "12-months", meetingFrequency: "bi-weekly", meetingFormat: "hybrid", price: 10000 }} />;
    case "structure":
      return <SharedContentStep contentKey="mastermindStructure" title="Structure & Framework" description="Meeting agenda template, member intake, onboarding materials, quarterly planning, and optional retreat." abbyTip="The hot seat rotation is key — each meeting, one member gets focused group coaching while others contribute insights." aiPrompt={`Generate mastermind structure and framework for "{bookTitle}". Config: {config}. Include: 1) MEETING AGENDA TEMPLATE (hot seat rotation, group coaching, accountability check-in, resource sharing), 2) MEMBER APPLICATION AND INTAKE process, 3) ONBOARDING MATERIALS (welcome guide, member directory template, communication channels setup), 4) QUARTERLY PLANNING SESSION framework, 5) ANNUAL RETREAT COMPONENT (optional, 2-day format). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="mastermindConfig" />;
    case "application":
      return <SharedContentStep contentKey="mastermindApplication" title="Application & Sales" description="Application form, sales page, interview script, acceptance/rejection emails, and payment setup." abbyTip="Exclusivity is key. A rigorous application process increases perceived value and ensures group quality." aiPrompt={`Generate mastermind application and sales materials for "{bookTitle}". Config: {config}. Include: 1) APPLICATION FORM (10-12 qualifying questions: business stage, revenue, goals, commitment, what they bring to the group), 2) SALES PAGE copy (exclusivity-focused, benefits, structure, member profiles section, investment, FAQ), 3) INTERVIEW SCRIPT for applicant calls, 4) ACCEPTANCE EMAIL template, 5) WAITLIST/REJECTION EMAIL template, 6) PAYMENT SETUP (annual and monthly installment options). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="mastermindConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Mastermind" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Mastermind configured", check: d => !!d.mastermindConfig?.mastermindName },
        { label: "Structure created", check: d => !!d.mastermindStructure },
        { label: "Application & sales ready", check: d => !!d.mastermindApplication },
      ]} revenue={{ calculate: d => {
        const price = d.mastermindConfig?.price || 10000;
        const size = d.mastermindConfig?.groupSize === "5-8" ? 6 : d.mastermindConfig?.groupSize === "12-20" ? 15 : 10;
        return { amount: price * size, description: `${size} members at $${price.toLocaleString()}/year` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Users className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.mastermindConfig?.mastermindName || "Mastermind"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.mastermindConfig?.groupSize || "8-12"} members • {d.mastermindConfig?.meetingFrequency || "Bi-weekly"}</p>
          <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1">${(d.mastermindConfig?.price || 10000).toLocaleString()}/year</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
