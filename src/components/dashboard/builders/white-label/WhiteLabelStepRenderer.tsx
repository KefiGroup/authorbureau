import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Layers } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "products", label: "Products to White-Label", type: "pills", cols: 3, options: [
    { value: "workbook", label: "Workbooks" },
    { value: "course", label: "Courses" },
    { value: "assessments", label: "Assessments" },
    { value: "templates", label: "Templates" },
    { value: "training", label: "Training Programs" },
  ]},
  { key: "pricing", label: "Pricing Model", type: "pills", cols: 3, options: [
    { value: "per-seat", label: "Per-Seat ($50-$200/user)" },
    { value: "flat", label: "Flat Rate ($2K-$10K)" },
    { value: "subscription", label: "Annual License ($5K+/yr)" },
  ]},
  { key: "title", label: "White-Label Program Name", type: "text", placeholder: "The [Method] White-Label Program" },
  { key: "customization", label: "Customization Allowed", type: "textarea", placeholder: "What can licensees change? Branding, colors, logos..." },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function WhiteLabelStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "inventory":
      return <SharedSetupStep configKey="whiteLabelConfig" fields={SETUP_FIELDS} abbyTip="Workbooks, courses, and assessments are the easiest to white-label." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ pricing: "per-seat" }} />;
    case "customize":
      return <SharedContentStep contentKey="whiteLabelCustomization" title="Customization Options" description="Define what licensees can and cannot customize." abbyTip="Allow branding changes but not content changes. Protect your methodology's integrity." aiPrompt={`Generate white-label customization guide for "{bookTitle}". Config: {config}. Include: 1) CUSTOMIZABLE ELEMENTS (logo, colors, company name, footer, headers), 2) PROTECTED ELEMENTS (core content, methodology, frameworks, citations), 3) BRAND GUIDELINES for white-label partners, 4) CANVA TEMPLATE descriptions for each product, 5) CUSTOMIZATION WALKTHROUGH (step-by-step). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="whiteLabelConfig" />;
    case "pricing":
      return <SharedContentStep contentKey="whiteLabelPricing" title="License Pricing" description="Set pricing tiers for white-label licenses." abbyTip="Per-seat licensing ($50-$200/user) for courses, flat rate ($2K-$10K) for standalone products." aiPrompt={`Generate white-label pricing structure for "{bookTitle}". Config: {config}. Include: 1) PRICING TIERS (Starter, Professional, Enterprise with features per tier), 2) VOLUME DISCOUNTS, 3) RENEWAL TERMS, 4) COMPARISON TABLE, 5) ROI CALCULATOR for potential licensees, 6) PRICING FAQ. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="whiteLabelConfig" />;
    case "delivery":
      return <SharedContentStep contentKey="whiteLabelDelivery" title="Delivery System" description="Create white-label package delivery system." abbyTip="Provide Canva templates, editable files, and a brand customization guide." aiPrompt={`Generate a white-label delivery system for "{bookTitle}". Config: {config}. Include: 1) DELIVERY PACKAGE CONTENTS (list of files and formats), 2) ONBOARDING GUIDE for new licensees, 3) SUPPORT DOCUMENTATION, 4) QUALITY ASSURANCE checklist, 5) PARTNER AGREEMENT TEMPLATE, 6) OUTREACH EMAIL to potential licensees. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="whiteLabelConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="White-Label Products" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Products selected", check: d => !!d.whiteLabelConfig?.products },
        { label: "Customization defined", check: d => !!d.whiteLabelCustomization },
        { label: "Pricing structure set", check: d => !!d.whiteLabelPricing },
        { label: "Delivery system ready", check: d => !!d.whiteLabelDelivery },
      ]} revenue={{ calculate: (d) => ({ amount: d.whiteLabelConfig?.pricing === "subscription" ? 5000 : 2000, description: "Each white-label partner generates $2K-$10K+ with zero ongoing effort from you" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Layers className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.whiteLabelConfig?.title || "White-Label Program"}</h2>
          <p className="text-sm text-muted-foreground">{d.whiteLabelConfig?.pricing || "Per-Seat"} Pricing</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
