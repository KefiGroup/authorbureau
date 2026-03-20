import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Magnet } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "type", label: "Lead Magnet Type", type: "pills", cols: 3, options: [
    { value: "checklist", label: "Checklist", description: "Quick-win format, highest conversions" },
    { value: "cheatsheet", label: "Cheat Sheet", description: "Reference guide readers keep" },
    { value: "mini-course", label: "Mini Email Course", description: "3-5 day drip sequence" },
    { value: "quiz", label: "Quiz / Assessment", description: "Interactive, high engagement" },
    { value: "template", label: "Template Pack", description: "Ready-to-use tools" },
    { value: "chapter", label: "Free Chapter", description: "Preview of your book" },
  ]},
  { key: "title", label: "Lead Magnet Title", type: "text", placeholder: "The 5-Step Framework for..." },
  { key: "audience", label: "Target Audience", type: "textarea", placeholder: "Who will find this irresistible? Describe their main pain point..." },
  { key: "deliveryMethod", label: "Delivery Method", type: "pills", cols: 3, options: [
    { value: "pdf", label: "PDF Download" },
    { value: "email", label: "Email Drip" },
    { value: "landing", label: "Landing Page" },
  ]},
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function LeadMagnetStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="leadMagnetConfig" fields={SETUP_FIELDS} abbyTip="Checklists and cheat sheets convert best. They promise a quick win with minimal effort from the reader." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ type: "checklist", deliveryMethod: "pdf" }} />;
    case "generate":
      return <SharedContentStep contentKey="leadMagnetContent" title="Lead Magnet Content" description="AI generates your lead magnet content from your book's most actionable advice." abbyTip="I'll pull the most actionable insights from your manuscript into a compact, high-value format." aiPrompt={`Generate a complete lead magnet for "{bookTitle}". Config: {config}. Create: 1) HEADLINE & SUBHEADLINE (benefit-driven), 2) MAIN CONTENT (the actual lead magnet content — checklist items, cheat sheet sections, templates, etc.), 3) INTRODUCTION (why this matters), 4) CALL-TO-ACTION (what to do next — buy the book, take the course, etc.), 5) AUTHOR BIO BLURB. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="leadMagnetConfig" />;
    case "edit":
      return <SharedContentStep contentKey="leadMagnetEdited" title="Edit & Polish" description="Customize the generated content. Add personal stories, refine language, adjust structure." abbyTip="Include your photo and a short bio. It builds trust and leads to book sales." aiPrompt={`Refine and polish this lead magnet content for "{bookTitle}". Existing content: {config}. Make it more compelling, add storytelling elements, ensure CTA is strong.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="leadMagnetContent" />;
    case "design":
      return <SharedContentStep contentKey="leadMagnetDesign" title="Design Brief" description="Generate design specifications and opt-in page copy." abbyTip="Professional design increases perceived value. Use your book's color palette." aiPrompt={`Generate design specifications and opt-in landing page copy for a lead magnet for "{bookTitle}". Config: {config}. Include: 1) DESIGN BRIEF (color palette, font suggestions, layout notes), 2) OPT-IN PAGE HEADLINE, 3) OPT-IN PAGE BULLET POINTS (3-5 benefits), 4) FORM FIELDS needed, 5) THANK-YOU PAGE copy, 6) CONFIRMATION EMAIL copy. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="leadMagnetConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Lead Magnet" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Type and audience configured", check: d => !!d.leadMagnetConfig?.type },
        { label: "Content generated", check: d => !!d.leadMagnetContent },
        { label: "Design brief ready", check: d => !!d.leadMagnetDesign },
      ]} revenue={{ calculate: () => ({ amount: 0, description: "Lead magnets are free — but they build your email list which drives all other revenue" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Magnet className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.leadMagnetConfig?.title || "Lead Magnet"}</h2>
          <p className="text-sm text-muted-foreground">{d.leadMagnetConfig?.type || "Checklist"} • Free Download</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
