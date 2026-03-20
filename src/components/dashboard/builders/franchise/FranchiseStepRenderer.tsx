import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Network } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "model", label: "Model Type", type: "pills", cols: 3, options: [
    { value: "licensed-practitioner", label: "Licensed Practitioner", description: "Lower barrier, fastest to launch" },
    { value: "certified-facilitator", label: "Certified Facilitator", description: "Train-the-trainer model" },
    { value: "full-franchise", label: "Full Franchise", description: "Complete business model" },
  ]},
  { key: "title", label: "Program Name", type: "text", placeholder: "Certified [Method] Practitioner Program" },
  { key: "upfrontFee", label: "Upfront License Fee", type: "text", placeholder: "$5,000 - $25,000" },
  { key: "royalty", label: "Ongoing Royalty", type: "text", placeholder: "10-15% of revenue" },
  { key: "territory", label: "Territory Model", type: "pills", cols: 3, options: [
    { value: "exclusive", label: "Exclusive Territory" },
    { value: "non-exclusive", label: "Non-Exclusive" },
    { value: "regional", label: "Regional Zones" },
  ]},
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function FranchiseStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "model":
      return <SharedSetupStep bookId={bookId} configKey="franchiseConfig" fields={SETUP_FIELDS} abbyTip="Start with a 'licensed practitioner' model before full franchise. Lower barrier to entry." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ model: "licensed-practitioner", territory: "non-exclusive" }} />;
    case "training":
      return <SharedContentStep contentKey="franchiseTraining" title="Practitioner Training" description="Create the facilitator training program curriculum." abbyTip="Include initial certification (40hrs), ongoing development (quarterly), and quality standards." aiPrompt={`Generate a practitioner training program for "{bookTitle}" franchise model. Config: {config}. Include: 1) TRAINING CURRICULUM (40-hour initial certification with modules), 2) ASSESSMENT CRITERIA (knowledge tests, practical demonstrations), 3) ONGOING DEVELOPMENT (quarterly workshops, annual recertification), 4) QUALITY STANDARDS & AUDITING process, 5) MENTORSHIP PROGRAM for new practitioners, 6) TRAINING MATERIALS LIST. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="franchiseConfig" />;
    case "operations":
      return <SharedContentStep contentKey="franchiseOps" title="Operations Manual" description="Create the franchise operations guide covering all business processes." abbyTip="Document everything: branding, delivery, pricing, marketing, and customer service standards." aiPrompt={`Generate a franchise operations manual outline for "{bookTitle}". Config: {config}. Include: 1) BRAND STANDARDS (logo use, messaging, visual identity), 2) SERVICE DELIVERY PROTOCOLS, 3) PRICING GUIDELINES, 4) MARKETING PLAYBOOK (templates, campaigns, social media), 5) CLIENT ONBOARDING PROCESS, 6) REPORTING REQUIREMENTS, 7) TECHNOLOGY STACK recommendations. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="franchiseConfig" />;
    case "financials":
      return <SharedContentStep contentKey="franchiseFinancials" title="Financial Model" description="Design the pricing, royalty, and revenue model." abbyTip="License fee ($5K-$25K upfront) + ongoing royalties (10-15% of revenue) is standard." aiPrompt={`Generate a financial model for "{bookTitle}" franchise program. Config: {config}. Include: 1) FEE STRUCTURE (upfront license fee, ongoing royalty, renewal fee), 2) FRANCHISEE P&L PROJECTION (Year 1-3), 3) FRANCHISOR REVENUE MODEL (scaling from 5 to 50 practitioners), 4) BREAK-EVEN ANALYSIS for both parties, 5) PAYMENT TERMS AND SCHEDULE, 6) FINANCIAL REPORTING template. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="franchiseConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Franchise Model" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Franchise model configured", check: d => !!d.franchiseConfig?.model },
        { label: "Training program designed", check: d => !!d.franchiseTraining },
        { label: "Operations manual created", check: d => !!d.franchiseOps },
        { label: "Financial model ready", check: d => !!d.franchiseFinancials },
      ]} revenue={{ calculate: (d) => {
        const fee = parseInt(d.franchiseConfig?.upfrontFee?.replace(/\D/g, "")) || 10000;
        return { amount: fee * 5, description: `5 practitioners × $${fee.toLocaleString()} upfront + ongoing royalties` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Network className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.franchiseConfig?.title || "Franchise Program"}</h2>
          <p className="text-sm text-muted-foreground">{d.franchiseConfig?.model || "Licensed Practitioner"} Model</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
