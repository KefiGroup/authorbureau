import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "partnershipType", label: "Partnership Type", type: "pills", cols: 3, options: [
    { value: "revenue-share", label: "Revenue Share", description: "Split profits on sales" },
    { value: "affiliate", label: "Affiliate", description: "Commission per sale" },
    { value: "co-creation", label: "Co-creation", description: "Joint product" },
    { value: "cross-promotion", label: "Cross-Promotion", description: "Mutual audience sharing" },
    { value: "bundle", label: "Bundle Deal", description: "Product bundle" },
  ]},
  { key: "revenueSplit", label: "Revenue Split", type: "pills", cols: 4, options: [
    { value: "50-50", label: "50/50" },
    { value: "60-40", label: "60/40" },
    { value: "70-30", label: "70/30" },
    { value: "custom", label: "Custom" },
  ]},
  { key: "partnerCriteria", label: "Partner Criteria", type: "textarea", placeholder: "Minimum audience size, niche alignment, content type..." },
  { key: "productsAvailable", label: "Products Available for Partnership", type: "textarea", placeholder: "List the products you want to offer through partnerships..." },
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {}

export default function JVPartnershipsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep bookId={bookId} configKey="jvConfig" fields={SETUP_FIELDS} abbyTip="JV partnerships are the fastest way to reach new audiences. I recommend starting with cross-promotions (free) before moving to revenue shares." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ partnershipType: "cross-promotion", revenueSplit: "50-50" }} />;
    case "materials":
      return <SharedContentStep contentKey="jvMaterials" title="Partner Materials" description="Proposal template, revenue sharing agreement, co-promotion email swipe copy, and social media templates." abbyTip="Lead with what you can offer them. Always propose a specific, low-risk first collaboration." aiPrompt={`Generate JV partnership materials for "{bookTitle}". Config: {config}. Include: 1) PARTNER PROPOSAL TEMPLATE (value proposition, partnership structure, expected results, next steps), 2) REVENUE SHARING AGREEMENT template, 3) CO-PROMOTION EMAIL SWIPE COPY (3 emails for partners to send to their list), 4) SOCIAL MEDIA PROMOTION TEMPLATES (5 posts for partners), 5) PARTNER TRACKING DASHBOARD description. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="jvConfig" />;
    case "onboarding":
      return <SharedContentStep contentKey="jvOnboarding" title="Partner Onboarding" description="Welcome email sequence, resource page, reporting template, and communication cadence." abbyTip="Great partnerships need clear communication. Set expectations early with monthly check-ins and transparent reporting." aiPrompt={`Generate partner onboarding materials for "{bookTitle}". Config: {config}. Include: 1) PARTNER WELCOME EMAIL SEQUENCE (3 emails), 2) PARTNER RESOURCE PAGE content (all materials in one place), 3) MONTHLY REVENUE SHARE REPORT template, 4) COMMUNICATION CADENCE (monthly check-in agenda template). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="jvConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="JV Partnership" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Partnership configured", check: d => !!d.jvConfig?.partnershipType },
        { label: "Partner materials created", check: d => !!d.jvMaterials },
        { label: "Onboarding ready", check: d => !!d.jvOnboarding },
      ]} revenue={{ calculate: d => ({ amount: 5000, description: "A single JV partner with a 10,000-person list could generate" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Handshake className="h-8 w-8 text-violet-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">JV Partnership Program</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.jvConfig?.partnershipType?.replace("-", " ") || "Partnership"} • {d.jvConfig?.revenueSplit || "50/50"} split</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
