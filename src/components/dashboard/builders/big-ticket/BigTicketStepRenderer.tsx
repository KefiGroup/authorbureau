import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "offerType", label: "Offer Type", type: "pills", cols: 4, options: [
    { value: "vip-day", label: "VIP Day", badge: "$2,500–$10,000" },
    { value: "intensive", label: "Intensive Weekend", badge: "$5,000–$15,000" },
    { value: "retainer", label: "Monthly Retainer", badge: "$2,000–$5,000/mo" },
    { value: "custom", label: "Custom Project", badge: "Custom pricing" },
  ]},
  { key: "offerName", label: "Offer Name", type: "text", placeholder: "e.g. VIP Strategy Intensive" },
  { key: "targetClient", label: "Target Client", type: "pills", cols: 4, options: [
    { value: "individual", label: "Individual" },
    { value: "small-business", label: "Small Business" },
    { value: "corporate", label: "Corporate" },
    { value: "organization", label: "Organization" },
  ]},
  { key: "deliverables", label: "Key Deliverables", type: "textarea", placeholder: "Strategy document, Implementation plan, Recorded sessions, Follow-up support..." },
  { key: "price", label: "Price (USD)", type: "price" },
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

export default function BigTicketStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep bookId={bookId} configKey="bigTicketConfig" fields={SETUP_FIELDS} abbyTip="Big ticket offers are where your expertise commands premium pricing. A VIP Day at $5,000 with 2 clients per month is $10,000/month — and it positions you as the expert." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ offerType: "vip-day", targetClient: "individual", price: 5000 }} />;
    case "package":
      return <SharedContentStep contentKey="bigTicketPackage" title="Package Builder" description="Pre-engagement questionnaires, detailed agenda, frameworks, and post-engagement deliverables." abbyTip="Structure creates confidence. Clients paying premium prices expect a clear process with tangible deliverables at each stage." aiPrompt={`Generate a complete consulting package for "{bookTitle}". Config: {config}. Include: PRE-ENGAGEMENT (intake questionnaire, pre-reading materials, goal-setting worksheet), DURING ENGAGEMENT (detailed agenda/schedule, frameworks and tools, templates and worksheets), POST-ENGAGEMENT (summary document, action plan, 30-day follow-up call plan, email support period details). Format as professional markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="bigTicketConfig" />;
    case "proposal":
      return <SharedContentStep contentKey="bigTicketProposal" title="Proposal & Sales Materials" description="Proposal template, application page, sales page, discovery call script, and follow-up sequence." abbyTip="Lead with outcomes, not processes. 'You'll walk away with a complete strategy' beats 'We'll spend 8 hours together.'" aiPrompt={`Generate consulting sales materials for "{bookTitle}". Config: {config}. Include: 1) PROPOSAL TEMPLATE (executive summary, problem statement, proposed solution, approach, timeline, investment, terms), 2) APPLICATION FORM (qualifying questions for high-ticket clients), 3) SALES PAGE COPY (authority-focused, testimonial sections, pricing, FAQ), 4) DISCOVERY CALL SCRIPT (15-min qualifying call), 5) FOLLOW-UP EMAIL SEQUENCE (3 emails). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="bigTicketConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Big Ticket Consulting" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Offer configured", check: d => !!d.bigTicketConfig?.offerName },
        { label: "Package created", check: d => !!d.bigTicketPackage },
        { label: "Proposal & sales ready", check: d => !!d.bigTicketProposal },
      ]} revenue={{ calculate: d => {
        const price = d.bigTicketConfig?.price || 5000;
        return { amount: price * 2, description: `At $${price.toLocaleString()} with 2 clients/month` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Crown className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.bigTicketConfig?.offerName || "VIP Consulting"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.bigTicketConfig?.offerType?.replace("-", " ") || "VIP Day"}</p>
          <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1">${(d.bigTicketConfig?.price || 5000).toLocaleString()}</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
