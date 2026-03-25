import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "programName", label: "Program Name", type: "text", placeholder: "e.g. Transformation Accelerator Cohort" },
  { key: "cohortSize", label: "Cohort Size", type: "pills", cols: 4, options: [
    { value: "5-10", label: "5-10", description: "Intimate" },
    { value: "10-20", label: "10-20", description: "Standard" },
    { value: "20-50", label: "20-50", description: "Large" },
    { value: "50+", label: "50+", description: "Scalable" },
  ]},
  { key: "duration", label: "Duration", type: "pills", cols: 4, options: [
    { value: "4-weeks", label: "4 Weeks" },
    { value: "6-weeks", label: "6 Weeks" },
    { value: "8-weeks", label: "8 Weeks", badge: "Recommended" },
    { value: "12-weeks", label: "12 Weeks" },
  ]},
  { key: "frequency", label: "Session Frequency", type: "pills", cols: 2, options: [
    { value: "weekly", label: "Weekly", description: "Best for engagement" },
    { value: "bi-weekly", label: "Bi-weekly", description: "Less time commitment" },
  ]},
  { key: "price", label: "Price Per Participant (USD)", type: "price" },
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

export default function GroupCoachingStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="groupConfig" fields={SETUP_FIELDS} abbyTip="Group coaching is your highest-leverage coaching product. At $497 per person with 20 participants, that's $9,940 per cohort — and you only run it once." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ cohortSize: "10-20", duration: "8-weeks", frequency: "weekly", price: 497 }} />;
    case "curriculum":
      return <SharedContentStep contentKey="groupCurriculum" title="Week-by-Week Curriculum" description="AI generates a complete curriculum with themes, pre-work, session agendas, exercises, and homework." abbyTip="I'll create weekly themes from your book with group exercises and accountability partners. Each week builds on the last." aiPrompt={`Generate a week-by-week group coaching curriculum for the book "{bookTitle}". Config: {config}. Include for each week: theme, learning objective, pre-work (chapter to read), live session agenda (60 min), group exercise, homework assignment, discussion prompts, and accountability partner activities. Format as clean markdown with ## headers per week.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="groupConfig" />;
    case "materials":
      return <SharedContentStep contentKey="groupMaterials" title="Group Materials" description="Welcome guide, community guidelines, worksheets, facilitation guide, and graduation materials." abbyTip="Professional materials increase perceived value and completion rates. Pre-work before each session boosts engagement." aiPrompt={`Generate complete group coaching materials for "{bookTitle}". Include: 1) Welcome Guide (what to expect, schedule, how to prepare), 2) Community Guidelines (behavior, participation, confidentiality), 3) Weekly Worksheet Template, 4) Facilitator Guide (for the author: how to run sessions, manage dynamics, handle difficult situations), 5) Graduation/Completion Certificate text. Format as clean markdown with clear section headers.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="groupConfig" />;
    case "sales-page":
      return <SharedContentStep contentKey="groupSalesPage" title="Sales & Enrollment Page" description="Enrollment page with countdown, application form, sales copy, early bird pricing, and email sequence." abbyTip="Include a countdown timer and limited spots messaging. Scarcity drives enrollment. Run a free workshop first to warm up your audience." aiPrompt={`Generate a complete group coaching sales and enrollment package for "{bookTitle}". Config: {config}. Include: 1) Sales page copy (headline, subheadline, who it's for, what you'll learn, week-by-week preview, testimonials section, FAQ, pricing with early bird option, payment plan option), 2) Application form questions (5-7 qualifying questions), 3) Enrollment email sequence (5 emails: announcement, details, early bird reminder, last chance, welcome). Format as clean markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="groupConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Group Coaching" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Program configured", check: d => !!d.groupConfig?.programName },
        { label: "Curriculum generated", check: d => !!d.groupCurriculum },
        { label: "Group materials created", check: d => !!d.groupMaterials },
        { label: "Sales page ready", check: d => !!d.groupSalesPage },
      ]} revenue={{ calculate: d => {
        const price = d.groupConfig?.price || 497;
        const size = d.groupConfig?.cohortSize === "5-10" ? 8 : d.groupConfig?.cohortSize === "20-50" ? 30 : d.groupConfig?.cohortSize === "50+" ? 60 : 15;
        return { amount: price * size, description: `At $${price} per person with ${size} participants per cohort` };
      }}} previewContent={(d, mode) => (
        <div className={`p-6 text-center ${mode === "mobile" ? "px-4" : ""}`}>
          <Users className="h-8 w-8 text-violet-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.groupConfig?.programName || "Group Coaching"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.groupConfig?.duration || "8 weeks"} • {d.groupConfig?.frequency || "Weekly"} sessions</p>
          <Badge className="bg-violet-500/10 text-violet-700 text-sm px-4 py-1">${(d.groupConfig?.price || 497).toLocaleString()}/person</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
