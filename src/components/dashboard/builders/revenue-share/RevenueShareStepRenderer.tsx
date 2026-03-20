import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { TrendingUp } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "model", label: "Revenue Share Model", type: "pills", cols: 3, options: [
    { value: "affiliate", label: "Affiliate (30-40%)", description: "Partners promote, you fulfill" },
    { value: "co-created", label: "Co-Created (50/50)", description: "Joint product development" },
    { value: "licensing", label: "Licensing (70/30)", description: "They distribute your content" },
    { value: "bundle", label: "Bundle Deal", description: "Cross-promote complementary products" },
  ]},
  { key: "partnerProfile", label: "Ideal Partner Profile", type: "textarea", placeholder: "Coaches with 5K+ email lists in [your niche]..." },
  { key: "products", label: "Products Available", type: "pills", cols: 3, options: [
    { value: "course", label: "Online Course" },
    { value: "coaching", label: "Coaching" },
    { value: "workshop", label: "Workshop" },
    { value: "book", label: "Book" },
    { value: "membership", label: "Membership" },
  ]},
  { key: "split", label: "Revenue Split", type: "text", placeholder: "e.g. 60/40 (you/partner)" },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function RevenueShareStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "identify":
      return <SharedSetupStep bookId={bookId} configKey="revenueShareConfig" fields={SETUP_FIELDS} abbyTip="Look for partners with distribution but no content, or content but no audience." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ model: "affiliate" }} />;
    case "structure":
      return <SharedContentStep contentKey="dealStructure" title="Deal Structure" description="Design revenue sharing models, terms, and performance benchmarks." abbyTip="Standard splits: 60/40 (content creator/distributor) for digital, 70/30 for licensing." aiPrompt={`Generate revenue sharing deal structures for "{bookTitle}". Config: {config}. Include: 1) DEAL STRUCTURE (terms, revenue split, responsibilities per party), 2) PERFORMANCE BENCHMARKS (minimum sales, reporting cadence), 3) PAYMENT TERMS (monthly, quarterly, net-30), 4) PILOT PROGRAM (30-60 day trial terms), 5) SCALING CRITERIA (when to move from pilot to full partnership). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="revenueShareConfig" />;
    case "agreements":
      return <SharedContentStep contentKey="agreements" title="Partnership Agreements" description="Create partnership agreement templates and outreach materials." abbyTip="Include performance benchmarks, reporting cadence, and clear termination clauses." aiPrompt={`Generate partnership agreement templates for "{bookTitle}" revenue sharing program. Config: {config}. Include: 1) PARTNERSHIP AGREEMENT TEMPLATE (scope, revenue split, reporting, IP rights, termination), 2) OUTREACH EMAIL TEMPLATE (introducing the partnership opportunity), 3) PARTNER PROPOSAL (one-page pitch with benefits), 4) FOLLOW-UP SEQUENCE (3 emails). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="revenueShareConfig" />;
    case "tracking":
      return <SharedContentStep contentKey="revenueTracking" title="Revenue Tracking" description="Set up revenue tracking dashboards and reporting." abbyTip="Transparent tracking builds trust. Share dashboards with partners monthly." aiPrompt={`Generate a revenue tracking and reporting system for "{bookTitle}" partnerships. Config: {config}. Include: 1) TRACKING DASHBOARD LAYOUT (metrics to track: clicks, conversions, revenue, payout), 2) MONTHLY REPORT TEMPLATE, 3) PARTNER COMMUNICATION CADENCE, 4) DISPUTE RESOLUTION PROCESS, 5) QUARTERLY REVIEW TEMPLATE. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="revenueShareConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Revenue Sharing" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Revenue model configured", check: d => !!d.revenueShareConfig?.model },
        { label: "Deal structure defined", check: d => !!d.dealStructure },
        { label: "Agreement templates created", check: d => !!d.agreements },
        { label: "Tracking system designed", check: d => !!d.revenueTracking },
      ]} revenue={{ calculate: () => ({ amount: 5000, description: "One active revenue share partner generating $5K+/month is common for established authors" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <TrendingUp className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">Revenue Sharing Program</h2>
          <p className="text-sm text-muted-foreground">{d.revenueShareConfig?.model || "Affiliate"} Model • {d.revenueShareConfig?.split || "60/40"}</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
