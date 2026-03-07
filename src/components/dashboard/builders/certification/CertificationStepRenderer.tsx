import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "certName", label: "Certification Name", type: "text", placeholder: 'e.g. "Certified [Method] Practitioner"' },
  { key: "levels", label: "Certification Levels", type: "pills", cols: 3, options: [
    { value: "1", label: "1 Level", description: "Single certification" },
    { value: "2", label: "2 Levels", description: "Practitioner + Master" },
    { value: "3", label: "3 Levels", description: "Foundation + Practitioner + Master" },
  ]},
  { key: "duration", label: "Duration Per Level", type: "pills", cols: 4, options: [
    { value: "4-weeks", label: "4 Weeks" },
    { value: "8-weeks", label: "8 Weeks" },
    { value: "12-weeks", label: "12 Weeks" },
    { value: "6-months", label: "6 Months" },
  ]},
  { key: "delivery", label: "Delivery", type: "pills", cols: 3, options: [
    { value: "online", label: "Online" },
    { value: "in-person", label: "In-Person" },
    { value: "hybrid", label: "Hybrid" },
  ]},
  { key: "renewal", label: "Renewal", type: "pills", cols: 3, options: [
    { value: "annual", label: "Annual" },
    { value: "biennial", label: "Biennial" },
    { value: "lifetime", label: "Lifetime" },
  ]},
  { key: "price", label: "Price Per Level (USD)", type: "price" },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function CertificationStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep configKey="certConfig" fields={SETUP_FIELDS} abbyTip="Certification is the ultimate authority builder. Certified practitioners become your ambassadors AND a recurring revenue stream through renewal fees." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ levels: "2", duration: "12-weeks", delivery: "hybrid", renewal: "annual", price: 5000 }} />;
    case "curriculum":
      return <SharedContentStep contentKey="certCurriculum" title="Certification Curriculum" description="Module-by-module breakdown with theory, practical exercises, supervised practice, and assessments." abbyTip="8-12 modules with assessments at each stage. Include a capstone project for credibility. Theory (60%) + Practice (40%)." aiPrompt={`Generate a certification program curriculum for "{bookTitle}". Config: {config}. Include: MODULE-BY-MODULE BREAKDOWN (theory from the book, practical application exercises, supervised practice requirements, assessment criteria per module), FINAL CERTIFICATION EXAM/PROJECT requirements, CONTINUING EDUCATION requirements for renewal. Format as detailed markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="certConfig" />;
    case "assessment":
      return <SharedContentStep contentKey="certAssessment" title="Assessment & Licensing" description="Knowledge assessment, practical rubric, case study requirements, certification agreement, and code of ethics." abbyTip="Professional assessments with clear rubrics create credibility. Include both knowledge tests and practical demonstration." aiPrompt={`Generate certification assessment and licensing materials for "{bookTitle}". Config: {config}. Include: 1) KNOWLEDGE ASSESSMENT (sample exam questions, scoring rubric), 2) PRACTICAL ASSESSMENT RUBRIC (criteria for hands-on evaluation), 3) CASE STUDY REQUIREMENTS, 4) CERTIFICATION AGREEMENT / CODE OF ETHICS, 5) LICENSE TO USE methodology and materials terms, 6) RENEWAL REQUIREMENTS (continuing education, annual fee). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="certConfig" />;
    case "directory":
      return <SharedContentStep contentKey="certDirectory" title="Certified Directory" description="Practitioner profile template, public directory page, badge design, and referral system." abbyTip="A public directory of certified practitioners creates ongoing value for graduates and drives referrals back to you." aiPrompt={`Generate certified practitioner directory materials for "{bookTitle}". Config: {config}. Include: 1) CERTIFIED PRACTITIONER PROFILE template (fields: name, photo, bio, specialties, location, contact), 2) PUBLIC DIRECTORY PAGE layout description, 3) PRACTITIONER BADGE/LOGO description (for certified individuals to display), 4) REFERRAL SYSTEM (how the author refers clients to certified practitioners), 5) ALUMNI COMMUNITY guidelines. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="certConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Certification Program" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Certification configured", check: d => !!d.certConfig?.certName },
        { label: "Curriculum created", check: d => !!d.certCurriculum },
        { label: "Assessment & licensing ready", check: d => !!d.certAssessment },
        { label: "Directory set up", check: d => !!d.certDirectory },
      ]} revenue={{ calculate: d => {
        const price = d.certConfig?.price || 5000;
        return { amount: price * 10 + 5000, description: `10 certified practitioners at $${price.toLocaleString()} = $${(price * 10).toLocaleString()} + $5,000/year renewal fees` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Award className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.certConfig?.certName || "Certification Program"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.certConfig?.levels || "2"} level(s) • {d.certConfig?.duration || "12 weeks"}</p>
          <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1">${(d.certConfig?.price || 5000).toLocaleString()}/level</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
