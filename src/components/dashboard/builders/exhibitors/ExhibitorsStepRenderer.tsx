import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "partnershipType", label: "Partnership Type", type: "pills", cols: 3, options: [
    { value: "event-exhibitor", label: "Event Exhibitor" },
    { value: "co-hosted", label: "Co-Hosted Event" },
    { value: "product-bundle", label: "Product Bundle" },
    { value: "cross-promotion", label: "Cross-Promotion" },
    { value: "sponsored", label: "Sponsored Content" },
  ]},
  { key: "partnerProfile", label: "Partner Profile", type: "pills", cols: 3, options: [
    { value: "author", label: "Author" },
    { value: "coach", label: "Coach" },
    { value: "organization", label: "Organization" },
    { value: "brand", label: "Brand" },
    { value: "media", label: "Media" },
  ]},
  { key: "youBring", label: "What You Bring", type: "textarea", placeholder: "Book, audience, expertise, content, products..." },
  { key: "youWant", label: "What You Want", type: "textarea", placeholder: "Audience access, credibility, revenue, distribution..." },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function ExhibitorsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep bookId={bookId} configKey="exhibitorConfig" fields={SETUP_FIELDS} abbyTip="The best JV partnerships are where both parties bring something the other doesn't have. You bring expertise and content; they bring audience and distribution." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ partnershipType: "cross-promotion" }} />;
    case "materials":
      return <SharedContentStep contentKey="exhibitorMaterials" title="Partnership Materials" description="Proposal, co-marketing plan, revenue sharing agreement, joint bundle design, and co-branded templates." abbyTip="Lead with value. Show potential partners exactly what you can offer them before asking for anything." aiPrompt={`Generate exhibitor/JV partnership materials for "{bookTitle}". Config: {config}. Include: 1) PARTNERSHIP PROPOSAL (customizable per partner: value proposition, proposed structure, expected outcomes), 2) CO-MARKETING PLAN TEMPLATE, 3) REVENUE SHARING AGREEMENT template, 4) JOINT PRODUCT BUNDLE DESIGN, 5) CO-BRANDED CONTENT TEMPLATES (for webinar, email, social media). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="exhibitorConfig" />;
    case "kit":
      return <SharedContentStep contentKey="exhibitorKit" title="Exhibitor Kit" description="Booth design, product display, lead capture system, giveaway materials, and follow-up sequence." abbyTip="Your booth is a 3-second pitch. Lead with your book's biggest transformation, not your product catalog." aiPrompt={`Generate an exhibitor kit for "{bookTitle}". Config: {config}. Include: 1) BOOTH DESIGN CONCEPT and materials list, 2) PRODUCT DISPLAY STRATEGY, 3) LEAD CAPTURE SYSTEM (QR code to landing page, email signup), 4) GIVEAWAY / RAFFLE MATERIALS, 5) FOLLOW-UP EMAIL SEQUENCE for booth visitors (3 emails). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="exhibitorConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Exhibitor / JV Package" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Partnership configured", check: d => !!d.exhibitorConfig?.partnershipType },
        { label: "Materials created", check: d => !!d.exhibitorMaterials },
        { label: "Exhibitor kit ready", check: d => !!d.exhibitorKit },
      ]} revenue={{ calculate: () => ({ amount: 10000, description: "A strong JV partnership can generate $10,000+ in the first quarter" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Handshake className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">Exhibitor / JV Package</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.exhibitorConfig?.partnershipType?.replace("-", " ") || "Partnership"}</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
