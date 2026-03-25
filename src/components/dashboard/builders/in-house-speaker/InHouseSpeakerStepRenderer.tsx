import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "packageType", label: "Package Type", type: "pills", cols: 4, options: [
    { value: "lunch-learn", label: "Lunch & Learn", badge: "$1,500–$3,000", description: "1 hour" },
    { value: "half-day", label: "Half-Day Workshop", badge: "$3,000–$7,500", description: "3-4 hours" },
    { value: "full-day", label: "Full-Day Workshop", badge: "$5,000–$15,000", description: "6-8 hours" },
    { value: "multi-day", label: "Multi-Day Program", badge: "$15,000+", description: "2-5 days" },
  ]},
  { key: "topic", label: "Workshop Topic", type: "text", placeholder: "Adapted from your keynote topics" },
  { key: "targetOrg", label: "Target Organizations", type: "pills", cols: 3, options: [
    { value: "corporate", label: "Corporate" },
    { value: "nonprofit", label: "Nonprofit" },
    { value: "government", label: "Government" },
    { value: "education", label: "Education" },
    { value: "healthcare", label: "Healthcare" },
  ]},
  { key: "price", label: "Package Price (USD)", type: "price" },
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

export default function InHouseSpeakerStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="inHouseConfig" fields={SETUP_FIELDS} abbyTip="Corporate workshops are your highest per-hour revenue. A full-day workshop at $10,000 often leads to repeat bookings and training program contracts." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ packageType: "half-day", price: 5000 }} />;
    case "workshop":
      return <SharedContentStep contentKey="workshopContent" title="Workshop Builder" description="Detailed agenda, participant workbook, facilitator guide, interactive exercises, and evaluation forms." abbyTip="Include interactive exercises every 20-30 minutes. Corporate audiences value engagement over lectures." aiPrompt={`Generate a complete corporate workshop package for "{bookTitle}". Config: {config}. Include: 1) DETAILED AGENDA (with time blocks for each segment), 2) PARTICIPANT WORKBOOK outline (exercises, note-taking sections, action planning), 3) FACILITATOR GUIDE (detailed notes, timing cues, how to handle Q&A), 4) INTERACTIVE EXERCISES (3-5 group activities), 5) PRE-WORKSHOP SURVEY (5 questions for participants), 6) POST-WORKSHOP EVALUATION FORM. Format as professional markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="inHouseConfig" />;
    case "proposal":
      return <SharedContentStep contentKey="corporateProposal" title="Corporate Proposal" description="Proposal template, case study template, ROI calculator, and follow-up program options." abbyTip="Quantify ROI. 'Teams that complete this training show 30% improvement in X metric.' Decision-makers need numbers." aiPrompt={`Generate corporate sales materials for "{bookTitle}". Config: {config}. Include: 1) PROPOSAL TEMPLATE (problem → solution → approach → investment → next steps, with ROI section), 2) CASE STUDY TEMPLATE (for after first engagement), 3) ROI CALCULATOR description (metrics to track, expected outcomes), 4) FOLLOW-UP PROGRAM OPTIONS (ongoing training, coaching, certification pathways). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="inHouseConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="In-House Speaker Package" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Package configured", check: d => !!d.inHouseConfig?.topic },
        { label: "Workshop content created", check: d => !!d.workshopContent },
        { label: "Corporate proposal ready", check: d => !!d.corporateProposal },
      ]} revenue={{ calculate: d => {
        const price = d.inHouseConfig?.price || 5000;
        return { amount: price * 3, description: `At $${price.toLocaleString()} per engagement with 3 bookings/quarter` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Building2 className="h-8 w-8 text-violet-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.inHouseConfig?.topic || "Corporate Workshop"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.inHouseConfig?.packageType?.replace("-", " ") || "Half-Day"}</p>
          <Badge className="bg-violet-500/10 text-violet-700 text-sm px-4 py-1">${(d.inHouseConfig?.price || 5000).toLocaleString()}</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
