import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "campaignType", label: "Campaign Type", type: "pills", cols: 3, options: [
    { value: "charity-sales", label: "Book Sales for Charity" },
    { value: "speaking-cause", label: "Speaking for a Cause" },
    { value: "crowdfunding", label: "Crowdfunding Next Book" },
    { value: "scholarship", label: "Scholarship Fund" },
    { value: "community", label: "Community Project" },
  ]},
  { key: "causeAlignment", label: "Cause Alignment", type: "textarea", placeholder: "How does your book's message connect to this cause?" },
  { key: "goal", label: "Fundraising Goal", type: "pills", cols: 4, options: [
    { value: "1000-5000", label: "$1K–$5K" },
    { value: "5000-25000", label: "$5K–$25K" },
    { value: "25000-100000", label: "$25K–$100K" },
  ]},
  { key: "duration", label: "Campaign Duration", type: "pills", cols: 4, options: [
    { value: "2-weeks", label: "2 Weeks" },
    { value: "30-days", label: "30 Days" },
    { value: "60-days", label: "60 Days" },
    { value: "ongoing", label: "Ongoing" },
  ]},
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function FundraisingStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep bookId={bookId} configKey="fundraisingConfig" fields={SETUP_FIELDS} abbyTip="Cause-aligned fundraising builds incredible goodwill and media coverage. Donating $1 per book sold to a relevant cause creates a compelling story." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ campaignType: "charity-sales", goal: "5000-25000", duration: "30-days" }} />;
    case "campaign":
      return <SharedContentStep contentKey="campaignMaterials" title="Campaign Materials" description="Campaign page, donation tiers, press release, social media posts, email sequence, and partner outreach." abbyTip="Donation tiers with rewards (signed book, coaching call, VIP event access) dramatically increase average donation size." aiPrompt={`Generate fundraising campaign materials for "{bookTitle}". Config: {config}. Include: 1) CAMPAIGN PAGE copy (compelling story, goal, impact description, progress bar description), 2) DONATION TIERS with rewards (5 tiers from $10 to $500+), 3) PRESS RELEASE TEMPLATE, 4) SOCIAL MEDIA CAMPAIGN POSTS (10 posts), 5) EMAIL SEQUENCE to supporters (5 emails), 6) PARTNER OUTREACH TEMPLATE (for organizations to co-promote). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="fundraisingConfig" />;
    case "event":
      return <SharedContentStep contentKey="fundraisingEvent" title="Event Component" description="Fundraising event plan, sponsorship packages, volunteer materials, and thank-you materials." abbyTip="A fundraising event with author involvement raises 3-5x more than a standard campaign. Even a virtual reading event works." aiPrompt={`Generate fundraising event materials for "{bookTitle}". Config: {config}. Include: 1) FUNDRAISING EVENT PLAN (format options: gala, auction, reading, workshop), 2) SPONSORSHIP PACKAGES (3 tiers), 3) VOLUNTEER COORDINATION MATERIALS, 4) THANK-YOU AND RECOGNITION MATERIALS (donor acknowledgment, social media shoutouts, annual report mention). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="fundraisingConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Fundraising Campaign" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Campaign configured", check: d => !!d.fundraisingConfig?.campaignType },
        { label: "Campaign materials created", check: d => !!d.campaignMaterials },
        { label: "Event component ready", check: d => !!d.fundraisingEvent },
      ]} revenue={{ calculate: d => {
        const goal = d.fundraisingConfig?.goal || "5000-25000";
        const amount = goal === "1000-5000" ? 3000 : goal === "25000-100000" ? 50000 : 15000;
        return { amount, description: `Fundraising campaigns with author involvement raise 3-5x more. Target` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Heart className="h-8 w-8 text-rose-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">Fundraising Campaign</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.fundraisingConfig?.campaignType?.replace("-", " ") || "Charity"} • {d.fundraisingConfig?.duration || "30 days"}</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
