import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { Badge } from "@/components/ui/badge";
import { Link } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "programName", label: "Program Name", type: "text", placeholder: "e.g. Author Ambassador Program" },
  { key: "commissionType", label: "Commission Structure", type: "pills", cols: 3, options: [
    { value: "flat", label: "Flat Rate", description: "$X per sale" },
    { value: "percentage", label: "Percentage", description: "10-50% of sale" },
    { value: "tiered", label: "Tiered", description: "Higher % for more sales" },
  ]},
  { key: "commissionRate", label: "Commission Rate", type: "text", placeholder: "e.g. 30% or $50 per sale" },
  { key: "cookieDuration", label: "Cookie Duration", type: "pills", cols: 4, options: [
    { value: "30", label: "30 Days" },
    { value: "60", label: "60 Days" },
    { value: "90", label: "90 Days", badge: "Recommended" },
    { value: "365", label: "365 Days" },
  ]},
  { key: "payoutSchedule", label: "Payout Schedule", type: "pills", cols: 3, options: [
    { value: "monthly", label: "Monthly" },
    { value: "bi-weekly", label: "Bi-weekly" },
    { value: "on-request", label: "Upon Request" },
  ]},
  { key: "minPayout", label: "Minimum Payout", type: "pills", cols: 3, options: [
    { value: "25", label: "$25" },
    { value: "50", label: "$50" },
    { value: "100", label: "$100" },
  ]},
  { key: "productsIncluded", label: "Products Included", type: "textarea", placeholder: "List the products affiliates can promote..." },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function AffiliatesStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep configKey="affiliateConfig" fields={SETUP_FIELDS} abbyTip="Affiliates are your unpaid sales team. I recommend 30-40% commission on digital products — it's generous enough to motivate promotion and you still profit because there's no cost of goods." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ commissionType: "percentage", commissionRate: "30%", cookieDuration: "90", payoutSchedule: "monthly", minPayout: "50" }} />;
    case "materials":
      return <SharedContentStep contentKey="affiliateMaterials" title="Affiliate Materials" description="Signup page copy, promotional email swipe, social media templates, banner descriptions, and review template." abbyTip="The easier you make it for affiliates to promote, the more they'll promote. Provide ready-to-use content." aiPrompt={`Generate affiliate program materials for "{bookTitle}". Config: {config}. Include: 1) AFFILIATE SIGNUP PAGE copy (benefits of joining, commission details, how it works), 2) PROMOTIONAL EMAIL SWIPE COPY (5 ready-to-send emails affiliates can use), 3) SOCIAL MEDIA POST TEMPLATES (10 platform-ready posts), 4) BANNER AD descriptions (3 sizes: square, landscape, vertical), 5) PRODUCT REVIEW TEMPLATE, 6) COMPARISON PAGE TEMPLATE. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="affiliateConfig" />;
    case "dashboard":
      return <SharedContentStep contentKey="affiliateDashboard" title="Affiliate Dashboard Design" description="Dashboard layout, leaderboard structure, commission tracking, and promotional material library." abbyTip="Gamification works. A leaderboard motivates top affiliates. Monthly contests with bonus prizes drive extra promotion." aiPrompt={`Generate an affiliate dashboard design spec for "{bookTitle}". Config: {config}. Include: 1) DASHBOARD LAYOUT (metrics: total sales, commission earned, click tracking, conversion rate, top-performing links), 2) AFFILIATE LEADERBOARD structure (monthly rankings, prizes for top performers), 3) COMMISSION PAYOUT HISTORY template, 4) PROMOTIONAL MATERIAL LIBRARY organization (categories, search, favorites), 5) AFFILIATE ONBOARDING CHECKLIST. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="affiliateConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Affiliate Program" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Program configured", check: d => !!d.affiliateConfig?.programName },
        { label: "Affiliate materials created", check: d => !!d.affiliateMaterials },
        { label: "Dashboard designed", check: d => !!d.affiliateDashboard },
      ]} revenue={{ calculate: d => ({ amount: 9850, description: "10 active affiliates each making 5 sales/month at $197" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <Link className="h-8 w-8 text-violet-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.affiliateConfig?.programName || "Affiliate Program"}</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.affiliateConfig?.commissionRate || "30%"} commission • {d.affiliateConfig?.cookieDuration || "90"}-day cookie</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
