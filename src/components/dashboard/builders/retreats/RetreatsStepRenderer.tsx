import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Mountain } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "eventType", label: "Event Type", type: "pills", cols: 4, options: [
    { value: "weekend-retreat", label: "Weekend Retreat", badge: "2-3 days" },
    { value: "week-retreat", label: "Week-Long Retreat", badge: "5-7 days" },
    { value: "bootcamp", label: "Bootcamp", badge: "Intensive 2-3 days" },
    { value: "virtual", label: "Virtual Retreat", badge: "Online" },
  ]},
  { key: "eventName", label: "Event Name", type: "text", placeholder: "e.g. Transformation Intensive Retreat" },
  { key: "capacity", label: "Capacity", type: "pills", cols: 3, options: [
    { value: "10-20", label: "10-20", description: "Intimate" },
    { value: "20-50", label: "20-50", description: "Standard" },
    { value: "50-100", label: "50-100", description: "Large" },
  ]},
  { key: "locationType", label: "Location Type", type: "pills", cols: 4, options: [
    { value: "resort", label: "Resort" },
    { value: "conference", label: "Conference Center" },
    { value: "virtual", label: "Virtual" },
    { value: "custom", label: "Author's Choice" },
  ]},
  { key: "price", label: "Price Per Participant (USD)", type: "price" },
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

export default function RetreatsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="retreatConfig" fields={SETUP_FIELDS} abbyTip="Retreats are your highest per-person revenue product. A 3-day retreat at $2,997 with 20 participants is $59,940 — minus venue costs, you could net $30,000-$40,000." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ eventType: "weekend-retreat", capacity: "20-50", locationType: "resort", price: 2997 }} />;
    case "itinerary":
      return <SharedContentStep contentKey="retreatItinerary" title="Itinerary Builder" description="Day-by-day schedule with sessions, activities, meals, networking, and ceremonies." abbyTip="Create a transformative arc: Day 1 = Awareness, Day 2 = Action, Day 3 = Accountability. Include both structured and free time." aiPrompt={`Generate a detailed retreat itinerary for "{bookTitle}". Config: {config}. Include: DAY-BY-DAY SCHEDULE (time blocks for each session), sessions mapped to book content, group activities and exercises, free time and networking blocks, meals and social events, opening ceremony description, closing ceremony description. Format as detailed markdown with clear day headers and time slots.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="retreatConfig" />;
    case "marketing":
      return <SharedContentStep contentKey="retreatMarketing" title="Marketing Materials" description="Sales page, event brochure, email sequence, social media posts, and pricing strategy." abbyTip="Sell the transformation, not the schedule. 'Leave with a complete action plan' is more compelling than a bullet list of sessions." aiPrompt={`Generate retreat marketing materials for "{bookTitle}". Config: {config}. Include: 1) EVENT SALES PAGE copy (with countdown timer placeholder, hero section, what you'll experience, schedule preview, testimonials section, pricing with early bird option, payment plan, FAQ), 2) EVENT BROCHURE content, 3) EMAIL ANNOUNCEMENT SEQUENCE (5 emails), 4) SOCIAL MEDIA PROMOTION POSTS (10 posts), 5) EARLY BIRD PRICING STRATEGY. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="retreatConfig" />;
    case "logistics":
      return <SharedContentStep contentKey="retreatLogistics" title="Logistics Planning" description="Venue requirements, equipment list, welcome packet, travel info, waivers, and post-event survey." abbyTip="All-inclusive pricing simplifies the decision for attendees and increases perceived value. Cover everything in one price." aiPrompt={`Generate retreat logistics materials for "{bookTitle}". Config: {config}. Include: 1) VENUE REQUIREMENTS CHECKLIST, 2) EQUIPMENT AND MATERIALS LIST, 3) PARTICIPANT WELCOME PACKET, 4) TRAVEL INFORMATION TEMPLATE, 5) EMERGENCY CONTACT AND LIABILITY WAIVER template, 6) POST-EVENT SURVEY. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="retreatConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Retreat" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Event configured", check: d => !!d.retreatConfig?.eventName },
        { label: "Itinerary created", check: d => !!d.retreatItinerary },
        { label: "Marketing materials ready", check: d => !!d.retreatMarketing },
        { label: "Logistics planned", check: d => !!d.retreatLogistics },
      ]} revenue={{ calculate: d => {
        const price = d.retreatConfig?.price || 2997;
        const cap = d.retreatConfig?.capacity === "10-20" ? 15 : d.retreatConfig?.capacity === "50-100" ? 60 : 30;
        return { amount: price * cap, description: `At $${price.toLocaleString()} with ${cap} participants (gross, before venue costs)` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Mountain className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.retreatConfig?.eventName || "Retreat"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.retreatConfig?.eventType?.replace("-", " ") || "Weekend Retreat"}</p>
          <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1">${(d.retreatConfig?.price || 2997).toLocaleString()}</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
