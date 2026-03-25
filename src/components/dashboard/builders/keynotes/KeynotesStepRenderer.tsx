import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Presentation } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "keynoteCount", label: "Number of Keynote Topics", type: "pills", cols: 3, options: [
    { value: "1", label: "1 Topic", description: "Start focused" },
    { value: "2", label: "2 Topics", description: "Versatile" },
    { value: "3", label: "3 Topics", badge: "Recommended" },
  ]},
  { key: "primaryTitle", label: "Primary Keynote Title", type: "text", placeholder: "e.g. The Future of Leadership" },
  { key: "primaryDuration", label: "Primary Duration", type: "pills", cols: 4, options: [
    { value: "30", label: "30 min" },
    { value: "45", label: "45 min", badge: "Popular" },
    { value: "60", label: "60 min" },
    { value: "90", label: "90 min" },
  ]},
  { key: "targetAudience", label: "Target Audience", type: "pills", cols: 4, options: [
    { value: "corporate", label: "Corporate" },
    { value: "conference", label: "Conference" },
    { value: "university", label: "University" },
    { value: "nonprofit", label: "Nonprofit" },
  ]},
  { key: "feeRange", label: "Speaker Fee Range", type: "pills", cols: 3, options: [
    { value: "emerging", label: "Emerging", badge: "$500–$2,500" },
    { value: "established", label: "Established", badge: "$2,500–$10,000" },
    { value: "authority", label: "Authority", badge: "$10,000+" },
  ]},
  { key: "fee", label: "Specific Fee (USD)", type: "price" },
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

export default function KeynotesStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "topics":
      return <SharedSetupStep bookId={bookId} configKey="keynoteConfig" fields={SETUP_FIELDS} abbyTip="Your book naturally supports 3 keynote topics. I recommend starting with the broadest topic for maximum booking potential, then adding niche topics as you build your speaking reputation." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ keynoteCount: "3", primaryDuration: "45", feeRange: "established", fee: 5000 }} />;
    case "talk-builder":
      return <SharedContentStep contentKey="keynoteTalks" title="Talk Builder" description="Complete talk outlines with hooks, key points, interactive elements, and closing CTAs." abbyTip="Open with a story from your book, deliver 3-5 actionable points, and close with a clear transformation promise." aiPrompt={`Generate keynote talk outlines for "{bookTitle}". Config: {config}. For each talk, include: OPENING HOOK (compelling story from the book), 3-5 KEY POINTS (with supporting stories/data), INTERACTIVE ELEMENTS (audience exercises, polls, Q&A prompts), CLOSING (call-to-action and transformation promise), CUSTOMIZATION NOTES (how to adapt for corporate vs conference vs university). Format as detailed markdown with time markers.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="keynoteConfig" />;
    case "speaker-materials":
      return <SharedContentStep contentKey="speakerMaterials" title="Speaker Materials" description="Speaker one-sheet, bio versions, introduction script, tech requirements, and travel rider." abbyTip="Lead with outcomes and credibility. Include 3 bio versions (50, 150, 300 words) for different contexts." aiPrompt={`Generate professional speaker materials for "{bookTitle}". Config: {config}. Include: 1) SPEAKER ONE-SHEET content (photo placeholder, bio, keynote topics, testimonials section, contact), 2) SPEAKER BIO (3 versions: 50 words, 150 words, 300 words), 3) INTRODUCTION SCRIPT (for event MC to read), 4) TECHNICAL REQUIREMENTS LIST, 5) TRAVEL & LOGISTICS RIDER TEMPLATE. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="keynoteConfig" />;
    case "booking":
      return <SharedContentStep contentKey="keynoteBooking" title="Booking System" description="Inquiry form, automated responses, booking confirmation, pre-event questionnaire, and follow-up." abbyTip="Every speaking gig should generate leads. Post-event follow-up with a testimonial request + product upsell is essential." aiPrompt={`Generate a complete keynote booking system for "{bookTitle}". Config: {config}. Include: 1) SPEAKER INQUIRY FORM fields (event details, date, budget, audience size, AV needs), 2) AUTOMATED RESPONSE EMAIL (availability, pricing, next steps), 3) BOOKING CONFIRMATION TEMPLATE, 4) PRE-EVENT QUESTIONNAIRE (to customize the talk), 5) POST-EVENT FOLLOW-UP (testimonial request + upsell to coaching/courses). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="keynoteConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Keynote Package" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Keynote topics configured", check: d => !!d.keynoteConfig?.primaryTitle },
        { label: "Talk outlines created", check: d => !!d.keynoteTalks },
        { label: "Speaker materials ready", check: d => !!d.speakerMaterials },
        { label: "Booking system set up", check: d => !!d.keynoteBooking },
      ]} revenue={{ calculate: d => {
        const fee = d.keynoteConfig?.fee || 5000;
        return { amount: fee * 4, description: `Speaking is the highest-ROI activity. At $${fee.toLocaleString()}/keynote with 4 gigs/quarter` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Presentation className="h-8 w-8 text-violet-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.keynoteConfig?.primaryTitle || "Keynote Speaking"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.keynoteConfig?.primaryDuration || "45"} min • {d.keynoteConfig?.targetAudience || "Conference"}</p>
          <Badge className="bg-violet-500/10 text-violet-700 text-sm px-4 py-1">${(d.keynoteConfig?.fee || 5000).toLocaleString()}</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
