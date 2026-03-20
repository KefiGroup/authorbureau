import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import { MessageCircle } from "lucide-react";

const SETUP_FIELDS: SetupField[] = [
  { key: "platform", label: "Platform", type: "pills", cols: 3, options: [
    { value: "circle", label: "Circle", description: "Premium community platform" },
    { value: "discord", label: "Discord", description: "Free, tech-savvy audience" },
    { value: "facebook", label: "Facebook Group", description: "Largest reach, free" },
    { value: "skool", label: "Skool", description: "Community + course combo" },
  ]},
  { key: "type", label: "Community Type", type: "pills", cols: 3, options: [
    { value: "free", label: "Free Community", description: "Build audience, funnel to paid" },
    { value: "paid", label: "Paid Community", description: "$27–$97/month" },
    { value: "hybrid", label: "Hybrid", description: "Free tier + premium tier" },
  ]},
  { key: "title", label: "Community Name", type: "text", placeholder: "The [Book Topic] Circle" },
  { key: "description", label: "Community Description", type: "textarea", placeholder: "What will members get from joining?" },
];

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

export default function CommunityStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="communityConfig" fields={SETUP_FIELDS} abbyTip="Circle or Discord for premium communities. Facebook Groups for free communities." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ platform: "circle", type: "hybrid" }} />;
    case "structure":
      return <SharedContentStep contentKey="communityStructure" title="Community Structure" description="Design channels, categories, and roles for your community." abbyTip="Keep it simple: General, Wins, Q&A, Resources, and one topic-specific channel." aiPrompt={`Design a community structure for "{bookTitle}". Config: {config}. Include: 1) CHANNEL LIST with descriptions (General, Introductions, Wins & Celebrations, Q&A, Resources, 2-3 topic channels from book), 2) MEMBER ROLES (New Member, Active Member, Champion, Moderator), 3) WELCOME POST template, 4) CHANNEL RULES per category, 5) PINNED RESOURCES list. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="communityConfig" />;
    case "content-plan":
      return <SharedContentStep contentKey="communityEngagement" title="Engagement Plan" description="Create a weekly content and engagement calendar." abbyTip="Weekly: 1 live session, 1 challenge, 1 resource share, 1 celebration thread." aiPrompt={`Generate a 4-week community engagement calendar for "{bookTitle}". Config: {config}. Include: 1) WEEKLY SCHEDULE (Monday: Discussion prompt, Tuesday: Resource share, Wednesday: Live Q&A, Thursday: Challenge, Friday: Win celebration), 2) 20 DISCUSSION PROMPTS tied to book chapters, 3) 4 WEEKLY CHALLENGES, 4) LIVE SESSION TOPICS (4 sessions), 5) ONBOARDING SEQUENCE (Day 1-7 automated messages), 6) RETENTION STRATEGIES. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="communityConfig" />;
    case "guidelines":
      return <SharedContentStep contentKey="communityGuidelines" title="Community Guidelines" description="Create clear rules and expectations for members." abbyTip="Clear rules create safe spaces. Include expectations for tone, self-promotion, and conflict resolution." aiPrompt={`Generate community guidelines for "{bookTitle}" community. Config: {config}. Include: 1) COMMUNITY VALUES (3-5 core values), 2) CODE OF CONDUCT, 3) POSTING GUIDELINES, 4) SELF-PROMOTION POLICY, 5) CONFLICT RESOLUTION PROCESS, 6) MODERATION POLICY, 7) CONSEQUENCES for violations. Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="communityConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Community Hub" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Platform & type configured", check: d => !!d.communityConfig?.platform },
        { label: "Community structure designed", check: d => !!d.communityStructure },
        { label: "Engagement plan created", check: d => !!d.communityEngagement },
        { label: "Guidelines written", check: d => !!d.communityGuidelines },
      ]} revenue={{ calculate: (d) => ({ amount: d.communityConfig?.type === "paid" ? 2700 : 0, description: d.communityConfig?.type === "paid" ? "100 members × $27/mo = $2,700/mo recurring revenue" : "Free community funnels members to paid products" })}} previewContent={(d) => (
        <div className="p-6 text-center">
          <MessageCircle className="h-8 w-8 text-violet-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{d.communityConfig?.title || "Community Hub"}</h2>
          <p className="text-sm text-muted-foreground">{d.communityConfig?.platform || "Circle"} • {d.communityConfig?.type || "Hybrid"}</p>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
