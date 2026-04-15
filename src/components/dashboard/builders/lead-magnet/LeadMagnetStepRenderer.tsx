import { useNavigate } from "react-router-dom";
import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import OptInPageBuilder from "./OptInPageBuilder";
import { Magnet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

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

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

const GENERATE_PROMPT = `Generate a complete lead magnet for "{bookTitle}". Config: {config}. You MUST follow config.type exactly.

CRITICAL RULES FOR CHECKLIST FORMAT:
If config.type is "checklist": output a checklist-style lead magnet that is STRICTLY ASSESSMENT-ONLY.
- Each section has ONLY "Tick what's true:" items — statements the reader checks if they relate.
- ABSOLUTELY NO "Next step", "Next step (pick 1):", "Choose one:", "Try this:", action items, exercises, or tasks ANYWHERE inside the checklist sections.
- FORBIDDEN phrases ANYWHERE in the document: "Next step", "pick 1", "choose one", "do this", "try this", "action step", "your task", "exercise", "write your", "message one person", "ask for support", "pick one section", "do one action", "I will ___ for".
- FORBIDDEN open-ended prompts: Do NOT ask the reader to fill in blanks, write anything, or take any self-directed action. They are stuck and need specific guidance.
- Each section ends with ONLY an interpretive note like "The more items you checked, the more this area needs attention."
- The checklist should take 2-3 minutes to complete and simply reveal where the reader stands.

CRITICAL RULES FOR CALL-TO-ACTION SECTION:
- The CTA MUST provide exactly 3 SPECIFIC product recommendations that tell the reader exactly what to do next based on their results.
- Each recommendation must name the specific product, explain what it helps with based on their checklist results, and why it is the logical next step.
- Format:
  1. "If [specific checklist finding], get the {bookTitle} Companion Workbook — it gives you [specific exercises/tools] to [specific outcome]."
  2. "If [specific checklist finding], the Home Study Course walks you through [specific transformation] at your own pace over [timeframe]."
  3. "For a complete guided experience across all areas, the Online Course provides [specific benefit] with structured accountability."
- Do NOT include ANY generic actions, open-ended prompts, or fill-in-the-blank exercises in the CTA.
- The reader is STUCK — tell them exactly which product solves their problem. No vague suggestions.

If config.type is "quiz": output a scored self-assessment that takes 90 SECONDS (NOT 5-7 minutes). Limit to exactly 8 questions (1 per framework stage). No action plans inside — just diagnosis and scoring. CTA follows the same 3-product recommendation format above.
If config.type is "cheatsheet": output a cheat-sheet reference format.
If config.type is "mini-course": output a 3-5 day email mini-course format.
If config.type is "template": output reusable template pack format.
If config.type is "chapter": output free chapter preview format.
Create: 1) HEADLINE & SUBHEADLINE (benefit-driven), 2) INTRODUCTION (why this matters), 3) MAIN CONTENT in the selected format, 4) CALL-TO-ACTION (3 specific product recommendations as described above), 5) AUTHOR BIO BLURB. Format as markdown.`;

const EDIT_PROMPT = `Refine and polish this lead magnet content for "{bookTitle}". Existing content: {config}. CRITICAL: If the lead magnet type is checklist or quiz/assessment, it MUST remain STRICTLY ASSESSMENT-ONLY. REMOVE any "Next step (pick 1):", "Choose one:", action items, exercises, tasks, open-ended prompts, or fill-in-the-blank exercises from ANYWHERE in the document. FORBIDDEN phrases: "Next step", "pick 1", "choose one", "do this", "try this", "write your", "message one person", "ask for support", "pick one section", "do one action", "I will ___ for". Each section should ONLY have "Tick what's true:" items and end with an interpretive note. The CALL-TO-ACTION must contain exactly 3 SPECIFIC product recommendations (Workbook, Home Study Course, Online Course) that tell the stuck reader exactly which product to get based on their results. No vague or open-ended suggestions. Make the introduction more compelling with storytelling.`;

export default function LeadMagnetStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  const navigate = useNavigate();
  const publishLeadMagnet = async (): Promise<{ status?: string; liveUrl?: string; message?: string }> => {
    // Resolve author profile id
    const { data: authorProfile, error: authorError } = await supabase
      .from("author_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (authorError || !authorProfile?.id) {
      throw new Error("Author profile not found. Please complete your profile first.");
    }

    // Build content payload to send to the edge function (which handles the DB upsert via service role)
    const contentPayload = {
      leadMagnetConfig: stepData.leadMagnetConfig || {},
      leadMagnetContent: stepData.leadMagnetContent || "",
      leadMagnetEdited: stepData.leadMagnetEdited || "",
      leadMagnetPage: stepData.leadMagnetPage || "",
      leadMagnetDesignData: stepData.leadMagnetDesignData || {},
    };

    // Native ABBY activation — update author_nodes directly
    const { data: existingNode } = await supabase
      .from("author_nodes")
      .select("id")
      .eq("author_id", authorProfile.id)
      .eq("node_id", "BP-02")
      .maybeSingle();

    if (existingNode) {
      const { error: updateErr } = await supabase.from("author_nodes").update({
        status: "live",
        content_json: contentPayload,
        activated_at: new Date().toISOString(),
      }).eq("id", existingNode.id);
      if (updateErr) throw new Error(updateErr.message);
    } else {
      const { error: insertErr } = await supabase.from("author_nodes").insert({
        author_id: authorProfile.id,
        node_id: "BP-02",
        node_name: "Lead Magnets",
        status: "live",
        content_json: contentPayload,
        activated_at: new Date().toISOString(),
      });
      if (insertErr) throw new Error(insertErr.message);
    }

    return {
      status: "live",
      liveUrl: undefined,
      message: "Your lead magnet is live! ABBY will use it to attract leads automatically.",
    };
  };

  switch (stepId) {
    case "configure":
      return <SharedSetupStep bookId={bookId} configKey="leadMagnetConfig" fields={SETUP_FIELDS} abbyTip="Checklists and cheat sheets convert best. They promise a quick win with minimal effort from the reader." stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} plan={plan} bookTitle={bookTitle} defaults={{ type: "checklist", deliveryMethod: "pdf" }} invalidateOnFieldChange={{
        type: ["leadMagnetContent", "leadMagnetEdited", "leadMagnetDesign"],
      }} />;
    case "generate":
      return <SharedContentStep contentKey="leadMagnetContent" title="Lead Magnet Content" description="Abby generates your lead magnet content from your book's most actionable advice." abbyTip="I'll pull the most actionable insights from your manuscript into a compact, high-value format." aiPrompt={GENERATE_PROMPT} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="leadMagnetConfig" stepInstructions={[
        { label: "Click Generate", description: "Abby creates your lead magnet from your book's best ideas." },
        { label: "Review sections", description: "Expand each card to read headline options, content, and CTA." },
        { label: "Pick your favorite", description: "Select from multiple headline/content options Abby provides." },
        { label: "Edit & refine", description: "Click Edit on any section to customize the text." },
      ]} />;
    case "edit":
      return <SharedContentStep contentKey="leadMagnetEdited" title="Edit & Polish" description="Customize the generated content. Add personal stories, refine language, adjust structure." abbyTip="Focus on the lead magnet content — headline, introduction, and your quiz or checklist questions. The product recommendations are managed separately." aiPrompt={EDIT_PROMPT} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="leadMagnetConfig" seedFromKey="leadMagnetContent" hideSections={["call-to-action", "author bio", "product recommendation", "cta"]} hideGenerateWhenSeeded generateLabel="Save Changes" stepInstructions={[
        { label: "Review draft", description: "Read through the generated content from Step 2." },
        { label: "Add your voice", description: "Include personal stories and adjust the tone." },
        { label: "Polish & finalize", description: "Fix wording and save your changes." },
      ]} />;
    case "design": {
      const optinData = stepData.leadMagnetDesignData || stepData.leadMagnetConfig || {};
      const audience = stepData.leadMagnetConfig?.audience || "";
      const typeLabel = stepData.leadMagnetConfig?.type === "quiz" ? "self-assessment" : stepData.leadMagnetConfig?.type || "resource";
      const autoSubheadline = audience
        ? `A 90-second ${typeLabel} for ${audience.toLowerCase().replace(/\.$/, "")}.`
        : `A 90-second ${typeLabel} that reveals exactly where you stand.`;
      return (
        <div className="space-y-6">
          <OptInPageBuilder
            data={{
              headline: optinData.headline || stepData.leadMagnetConfig?.title || "",
              subheadline: optinData.subheadline || autoSubheadline,
              bullet_points: optinData.bullet_points || [],
              cta_button_text: optinData.cta_button_text || "Discover My Stage →",
              privacy_note: optinData.privacy_note || "No spam. Unsubscribe anytime.",
              color_palette: optinData.color_palette,
            }}
            authorName={stepData._authorName}
            authorPhotoUrl={stepData._authorPhotoUrl}
            bookCoverUrl={stepData._bookCoverUrl}
            onChange={(updated) => {
              onMarkEdited(stepId);
              setStepData(prev => ({ ...prev, leadMagnetDesignData: updated }));
            }}
            onSaveHtml={(html) => {
              setStepData(prev => ({ ...prev, leadMagnetPage: html }));
            }}
          />
        </div>
      );
    }
    case "preview":
      return <SharedPublishStep builderLabel="Lead Magnet" userId={userId} publishFn={publishLeadMagnet} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} onNavigate={(section) => navigate(`/dashboard?section=${section}&highlight=lead-magnets`)} checklist={[
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
