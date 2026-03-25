import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "participationType", label: "Participation Type", type: "pills", cols: 4, options: [
    { value: "speaker", label: "Speaker" },
    { value: "exhibitor", label: "Exhibitor" },
    { value: "sponsor", label: "Sponsor" },
    { value: "attendee", label: "Attendee-Networker" },
  ]},
  { key: "niche", label: "Conference Niche", type: "pills", cols: 3, options: [
    { value: "industry", label: "Industry-Specific" },
    { value: "author", label: "Author/Publishing" },
    { value: "business", label: "Business" },
    { value: "wellness", label: "Wellness" },
    { value: "education", label: "Education" },
  ]},
  { key: "goals", label: "Goals", type: "textarea", placeholder: "Sell books, generate leads, build partnerships, get speaking gigs..." },
  { key: "budget", label: "Budget", type: "pills", cols: 3, options: [
    { value: "500-1000", label: "$500–$1,000" },
    { value: "1000-3000", label: "$1,000–$3,000" },
    { value: "3000-10000", label: "$3,000–$10,000" },
  ]},
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

export default function ConventionsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep bookId={bookId} configKey="conventionConfig" fields={SETUP_FIELDS} abbyTip="Conferences are where you build your professional network. I recommend submitting speaker proposals to 5-10 conferences per year in your niche." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ participationType: "speaker", budget: "1000-3000" }} />;
    case "submissions":
      return <SharedContentStep contentKey="conventionSubmissions" title="Submission Materials" description="Speaker proposals, session descriptions, exhibitor booth plan, and sponsorship proposals." abbyTip="Submit to 5-10 conferences per year. Each acceptance builds your speaking bio for the next pitch." aiPrompt={`Generate conference submission materials for "{bookTitle}". Config: {config}. Include: 1) SPEAKER PROPOSAL TEMPLATE (title, abstract, learning outcomes, bio, past speaking experience), 2) SESSION DESCRIPTIONS (keynote, breakout, panel, workshop versions), 3) EXHIBITOR BOOTH PLAN (if applicable), 4) SPONSORSHIP PROPOSAL (if seeking sponsorship). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="conventionConfig" />;
    case "kit":
      return <SharedContentStep contentKey="conventionKit" title="Conference Kit" description="Networking strategy, elevator pitches, digital contact card, follow-up templates, and lead capture." abbyTip="One conference typically generates 20-50 qualified leads. Have your follow-up emails pre-written before you go." aiPrompt={`Generate a conference preparation kit for "{bookTitle}". Config: {config}. Include: 1) NETWORKING STRATEGY (who to meet, how to approach, conversation starters), 2) ELEVATOR PITCHES (30-second, 60-second, 2-minute versions), 3) DIGITAL CONTACT CARD description, 4) FOLLOW-UP EMAIL TEMPLATES (per contact type: potential client, potential partner, media, organizer), 5) SOCIAL MEDIA POSTS (before, during, after conference — 8 posts), 6) LEAD CAPTURE SYSTEM (QR code to landing page). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="conventionConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Conference Kit" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Conference configured", check: d => !!d.conventionConfig?.participationType },
        { label: "Submissions prepared", check: d => !!d.conventionSubmissions },
        { label: "Conference kit ready", check: d => !!d.conventionKit },
      ]} revenue={{ calculate: () => ({ amount: 5000, description: "One conference generates 20-50 qualified leads. At 10% conversion, that's 2-5 new clients" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <MapPin className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">Conference Kit</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.conventionConfig?.participationType || "Speaker"} • {d.conventionConfig?.niche || "Business"}</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
