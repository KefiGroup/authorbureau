import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { FileKey } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "licenseType", label: "License Type", type: "pills", cols: 3, options: [
    { value: "individual", label: "Individual ($297/yr)" },
    { value: "team", label: "Team ($997/yr)" },
    { value: "yield", label: "Enterprise ($4,997/yr)" },
  ]},
  { key: "content", label: "Licensable Content", type: "pills", cols: 3, options: [
    { value: "frameworks", label: "Frameworks" },
    { value: "assessments", label: "Assessments" },
    { value: "training", label: "Training Materials" },
    { value: "curriculum", label: "Curriculum" },
    { value: "templates", label: "Templates" },
  ]},
  { key: "title", label: "License Program Name", type: "text", placeholder: "The [Framework] License Program" },
  { key: "restrictions", label: "Usage Restrictions", type: "textarea", placeholder: "Define what licensees can and cannot do..." },
];

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

export default function LicensingStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "inventory":
      return <SharedSetupStep bookId={bookId} configKey="licensingConfig" fields={SETUP_FIELDS} abbyTip="Your frameworks, assessments, and training materials are your most licensable assets." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ licenseType: "team" }} />;
    case "packages":
      return <SharedContentStep contentKey="licensingPackages" title="License Packages" description="Create tiered licensing packages with benefits, pricing, and included materials." abbyTip="Offer Individual ($297/yr), Team ($997/yr), and Enterprise ($4,997/yr) licenses." aiPrompt={`Generate licensing packages for "{bookTitle}". Config: {config}. Create: 1) INDIVIDUAL LICENSE ($297/yr) — what's included, usage rights, 2) TEAM LICENSE ($997/yr) — up to 10 users, 3) ENTERPRISE LICENSE ($4,997/yr) — unlimited users, customization, 4) COMPARISON TABLE of all tiers, 5) FAQ for licensees. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="licensingConfig" />;
    case "terms":
      return <SharedContentStep contentKey="licensingTerms" title="License Agreement" description="Define usage rights, restrictions, and legal terms." abbyTip="Be clear on what licensees can and cannot do. Include attribution requirements." aiPrompt={`Generate a content licensing agreement template for "{bookTitle}". Config: {config}. Include: 1) GRANT OF LICENSE, 2) PERMITTED USES, 3) RESTRICTIONS (no sublicensing, attribution required), 4) TERM AND RENEWAL, 5) TERMINATION, 6) INDEMNIFICATION, 7) ATTRIBUTION REQUIREMENTS. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="licensingConfig" />;
    case "sales":
      return <SharedContentStep contentKey="licensingSales" title="Sales Materials" description="Create licensing sales page and outreach materials." abbyTip="Position licensing as saving the buyer time and money vs. creating from scratch." aiPrompt={`Generate licensing sales materials for "{bookTitle}". Config: {config}. Include: 1) SALES PAGE COPY (headline, benefits, social proof, pricing, FAQ), 2) OUTREACH EMAIL (for approaching organizations), 3) ONE-PAGE SELL SHEET, 4) ROI CALCULATOR (show value vs. building from scratch). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="licensingConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Content Licensing" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Content inventory completed", check: d => !!d.licensingConfig?.content },
        { label: "License packages created", check: d => !!d.licensingPackages },
        { label: "License terms defined", check: d => !!d.licensingTerms },
        { label: "Sales materials ready", check: d => !!d.licensingSales },
      ]} revenue={{ calculate: (d) => ({ amount: d.licensingConfig?.licenseType === "yield" ? 4997 : 997, description: "Each license generates recurring annual revenue with zero additional effort" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <FileKey className="h-8 w-8 text-violet-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.licensingConfig?.title || "Content License"}</h2>
          <p className="text-sm text-muted-foreground">{d.licensingConfig?.licenseType || "Team"} License</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
