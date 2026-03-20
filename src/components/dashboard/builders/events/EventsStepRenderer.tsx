import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Calendar } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "eventType", label: "Event Type", type: "pills", cols: 3, options: [
    { value: "virtual-summit", label: "Virtual Summit", description: "Low-risk, high-reward" },
    { value: "conference", label: "Conference", description: "In-person, premium" },
    { value: "workshop-day", label: "Workshop Day", description: "Intensive single-day" },
    { value: "gala", label: "Gala / Awards", description: "Premium networking" },
  ]},
  { key: "format", label: "Format", type: "pills", cols: 3, options: [
    { value: "virtual", label: "Virtual" },
    { value: "in-person", label: "In-Person" },
    { value: "hybrid", label: "Hybrid" },
  ]},
  { key: "title", label: "Event Name", type: "text", placeholder: "The [Topic] Summit 2026" },
  { key: "duration", label: "Duration", type: "pills", cols: 4, options: [
    { value: "1-day", label: "1 Day" },
    { value: "3-day", label: "3 Days" },
    { value: "5-day", label: "5 Days" },
    { value: "week", label: "Full Week" },
  ]},
  { key: "capacity", label: "Expected Attendees", type: "text", placeholder: "e.g. 500" },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function EventsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="eventsConfig" fields={SETUP_FIELDS} abbyTip="Virtual summits are low-risk, high-reward. 3-5 days, 15-25 speakers, free with VIP pass upsell." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ eventType: "virtual-summit", format: "virtual", duration: "3-day" }} />;
    case "speakers":
      return <SharedContentStep contentKey="speakerLineup" title="Speaker Lineup" description="Plan speaker outreach, session topics, and promotional partnerships." abbyTip="Each speaker promotes to their audience. 20 speakers × 5,000 each = 100,000 potential attendees." aiPrompt={`Generate a speaker lineup plan for "{bookTitle}" event. Config: {config}. Include: 1) SPEAKER CATEGORIES (keynote, breakout, panel, workshop), 2) 15-20 SPEAKER SLOT descriptions with ideal speaker profiles, 3) SPEAKER OUTREACH EMAIL TEMPLATE, 4) SPEAKER AGREEMENT template, 5) SPEAKER PROMOTION GUIDELINES, 6) SESSION TIME SLOTS and schedule grid. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="eventsConfig" />;
    case "content":
      return <SharedContentStep contentKey="eventContent" title="Event Content" description="Design sessions, workshops, and networking activities." abbyTip="Mix keynotes (30min), panels (45min), and workshops (60min) for variety." aiPrompt={`Generate event content plan for "{bookTitle}" event. Config: {config}. Include: 1) FULL EVENT SCHEDULE (day-by-day, hour-by-hour), 2) SESSION DESCRIPTIONS (10-15 sessions), 3) WORKSHOP OUTLINES, 4) NETWORKING ACTIVITIES, 5) OPENING & CLOSING CEREMONY scripts, 6) ATTENDEE WORKBOOK/HANDOUT outline. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="eventsConfig" />;
    case "monetization":
      return <SharedContentStep contentKey="eventMonetization" title="Monetization Plan" description="Design ticket tiers, sponsorships, and additional revenue streams." abbyTip="Free access + VIP pass ($97-$197) + Sponsorships ($2K-$10K each). Multiple revenue streams." aiPrompt={`Generate a monetization plan for "{bookTitle}" event. Config: {config}. Include: 1) TICKET TIERS (Free, General $97, VIP $197, All-Access $497), 2) SPONSORSHIP PACKAGES (3-4 tiers from $2K-$10K), 3) SPONSOR PROPOSAL template, 4) UPSELL OPPORTUNITIES (recordings, mastermind, coaching), 5) MARKETING TIMELINE (12-week countdown), 6) REVENUE PROJECTION (conservative, moderate, optimistic). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="eventsConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Events & Summits" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Event configured", check: d => !!d.eventsConfig?.eventType },
        { label: "Speaker lineup planned", check: d => !!d.speakerLineup },
        { label: "Event content designed", check: d => !!d.eventContent },
        { label: "Monetization plan ready", check: d => !!d.eventMonetization },
      ]} revenue={{ calculate: (d) => {
        const cap = parseInt(d.eventsConfig?.capacity) || 500;
        return { amount: Math.round(cap * 97 * 0.3), description: `${cap} attendees × $97 avg ticket × 30% conversion = significant event revenue` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Calendar className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.eventsConfig?.title || "Your Summit"}</h2>
          <p className="text-sm text-muted-foreground">{d.eventsConfig?.eventType || "Virtual Summit"} • {d.eventsConfig?.duration || "3 Days"}</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
