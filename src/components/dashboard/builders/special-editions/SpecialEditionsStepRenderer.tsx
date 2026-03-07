import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "editionType", label: "Edition Type", type: "pills", cols: 3, options: [
    { value: "signed", label: "Signed Copy", badge: "$29.99–$49.99" },
    { value: "collectors", label: "Hardcover Collector's", badge: "$49.99–$99.99" },
    { value: "gift-set", label: "Gift Set", badge: "$79.99–$149.99", description: "Book + Workbook + Extras" },
    { value: "anniversary", label: "Anniversary Edition" },
    { value: "illustrated", label: "Illustrated Edition" },
  ]},
  { key: "printRun", label: "Print Run", type: "pills", cols: 3, options: [
    { value: "limited", label: "Limited (50-200)", description: "Creates urgency" },
    { value: "standard", label: "Standard (200-1000)" },
    { value: "open", label: "Open Run" },
  ]},
  { key: "extras", label: "Extras Included", type: "textarea", placeholder: "Author letter, bookplate, bookmark, dust jacket art, sprayed edges..." },
  { key: "price", label: "Edition Price (USD)", type: "price" },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function SpecialEditionsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return <SharedSetupStep configKey="editionConfig" fields={SETUP_FIELDS} abbyTip="Special editions create urgency and premium positioning. A limited run of 100 signed copies at $49.99 sells out fast and generates $4,999 in a single launch." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ editionType: "signed", printRun: "limited", price: 49 }} />;
    case "content":
      return <SharedContentStep contentKey="editionContent" title="Edition Content" description="Author's foreword, bonus chapter, discussion guide, photo suggestions, and packaging description." abbyTip="New exclusive content justifies the premium price. An author's letter about the book's journey creates emotional connection." aiPrompt={`Generate special edition content for "{bookTitle}". Config: {config}. Include: 1) AUTHOR'S FOREWORD OR LETTER (new content exclusive to this edition, personal story about the book's journey), 2) BONUS CHAPTER OR BEHIND-THE-SCENES content, 3) DISCUSSION GUIDE / BOOK CLUB QUESTIONS (15-20 questions), 4) PHOTO/ILLUSTRATION SUGGESTIONS (describe 5-8 potential images), 5) PACKAGING DESCRIPTION AND MOCKUP details (unboxing experience). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="editionConfig" />;
    case "sales":
      return <SharedContentStep contentKey="editionSales" title="Sales & Fulfillment" description="Pre-order page, numbering system, fulfillment checklist, launch emails, and social posts." abbyTip="Create FOMO with a countdown and 'X of Y remaining' counter. Pre-orders with a specific ship date work best." aiPrompt={`Generate special edition sales and fulfillment materials for "{bookTitle}". Config: {config}. Include: 1) PRE-ORDER PAGE copy (countdown, edition details, what's included, limited availability messaging), 2) LIMITED EDITION NUMBERING SYSTEM, 3) FULFILLMENT CHECKLIST (printing, signing, packaging, shipping), 4) LAUNCH EMAIL SEQUENCE (5 emails), 5) SOCIAL MEDIA ANNOUNCEMENT POSTS (8 posts with countdown). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="editionConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Special Edition" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Edition configured", check: d => !!d.editionConfig?.editionType },
        { label: "Edition content created", check: d => !!d.editionContent },
        { label: "Sales materials ready", check: d => !!d.editionSales },
      ]} revenue={{ calculate: d => {
        const price = d.editionConfig?.price || 49;
        const qty = d.editionConfig?.printRun === "limited" ? 100 : d.editionConfig?.printRun === "standard" ? 500 : 1000;
        return { amount: price * qty, description: `${qty} copies at $${price} each` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <BookOpen className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{bookTitle} — Special Edition</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.editionConfig?.editionType?.replace("-", " ") || "Signed Copy"} • {d.editionConfig?.printRun || "Limited"} run</p>
          <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1">${(d.editionConfig?.price || 49).toLocaleString()}</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
