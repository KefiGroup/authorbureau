import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "eventType", label: "Event Type", type: "pills", cols: 3, options: [
    { value: "speaking", label: "Speaking Engagement" },
    { value: "conference-booth", label: "Conference Booth" },
    { value: "book-signing", label: "Book Signing" },
    { value: "workshop", label: "Workshop" },
    { value: "fundraiser", label: "Fundraiser" },
  ]},
  { key: "attendance", label: "Expected Attendance", type: "pills", cols: 3, options: [
    { value: "50", label: "~50" },
    { value: "100", label: "~100" },
    { value: "250", label: "~250" },
    { value: "500", label: "~500" },
    { value: "1000+", label: "1000+" },
  ]},
  { key: "pricingStrategy", label: "Pricing Strategy", type: "pills", cols: 3, options: [
    { value: "full", label: "Full Price" },
    { value: "event-discount", label: "Event Discount" },
    { value: "bundle", label: "Bundle with Products" },
  ]},
  { key: "paymentMethods", label: "Payment Methods", type: "textarea", placeholder: "Card reader, QR code, Cash, Pre-order link..." },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function BookSalesStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="bookSalesConfig" fields={SETUP_FIELDS} abbyTip="Back-of-room book sales after a keynote convert at 30-50% of the audience. For a 200-person event, bring 60-100 books." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ eventType: "speaking", attendance: "100", pricingStrategy: "bundle" }} />;
    case "materials":
      return <SharedContentStep contentKey="bookSalesMaterials" title="Sales Materials" description="Table display design, QR codes, business cards, bundle offer cards, and email capture cards." abbyTip="A QR code linking to your digital products turns a $20 book sale into a potential $200+ customer." aiPrompt={`Generate event book sales materials for "{bookTitle}". Config: {config}. Include: 1) TABLE DISPLAY DESIGN (banner description, book stand layout, pricing cards), 2) QR CODE LINK descriptions (to digital products, email signup, website), 3) BUSINESS CARD / BOOKMARK design with product links, 4) SPECIAL EVENT BUNDLE offer card copy, 5) EMAIL CAPTURE CARD (sign up for free workbook). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="bookSalesConfig" />;
    case "logistics":
      return <SharedContentStep contentKey="bookSalesLogistics" title="Logistics & Tracking" description="Inventory tracker, shipping calculator, packing checklist, follow-up email, and sales report." abbyTip="Track which events convert best so you can prioritize future appearances. Always capture emails — they're more valuable than the book sale." aiPrompt={`Generate event logistics materials for "{bookTitle}". Config: {config}. Include: 1) INVENTORY TRACKER template (books ordered, books brought, books sold, books remaining), 2) SHIPPING CALCULATOR for bulk orders, 3) EVENT PACKING CHECKLIST, 4) POST-EVENT FOLLOW-UP EMAIL to new contacts, 5) SALES REPORT TEMPLATE. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="bookSalesConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Event Sales Kit" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Event configured", check: d => !!d.bookSalesConfig?.eventType },
        { label: "Sales materials created", check: d => !!d.bookSalesMaterials },
        { label: "Logistics planned", check: d => !!d.bookSalesLogistics },
      ]} revenue={{ calculate: d => {
        const att = parseInt(d.bookSalesConfig?.attendance || "100");
        const books = Math.round(att * 0.4);
        return { amount: books * 20, description: `At ${att}-person event with 40% conversion, ${books} books sold` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <ShoppingBag className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{bookTitle} — Event Sales</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.bookSalesConfig?.eventType?.replace("-", " ") || "Speaking"} • ~{d.bookSalesConfig?.attendance || "100"} attendees</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
