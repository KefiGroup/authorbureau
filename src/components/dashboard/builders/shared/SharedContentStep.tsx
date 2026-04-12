import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Wand2, Send, MessageCircle } from "lucide-react";
import ContentSectionCards from "./ContentSectionCards";
import { executeCrossBuilderPushes } from "@/lib/cross-builder-push";
import { supabase } from "@/integrations/supabase/client";
import { type BuilderCategory } from "./StepInstructions";
import AbbyRecommendationCard from "./AbbyRecommendationCard";
import { useToast } from "@/hooks/use-toast";
import { getActiveToken } from "@/lib/get-active-token";

/** Strip markdown formatting symbols, keeping plain text */
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-•]\s+/gm, "• ")
    .replace(/^>\s?/gm, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, m => m.replace(/`/g, ""))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^---$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Check if content ends with a [STOP] marker (Abby is waiting for a reply) */
function hasStopMarker(text: string): boolean {
  return /\[STOP\]\s*$/i.test(text.trim());
}

/** Remove [STOP] from display text */
function stripStopMarker(text: string): string {
  return text.replace(/\[STOP\]\s*$/gi, "").trim();
}

/** Extract numbered options like "1) ...", "2) ...", "3) ..." from text */
function extractQuickOptions(text: string): { number: string; label: string }[] {
  const options: { number: string; label: string }[] = [];
  const regex = /^(\d)\)\s*(.+)$/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    options.push({ number: match[1], label: match[2].trim().slice(0, 60) });
  }
  return options;
}

function isLeadMagnetTypeMismatch(text: string, type: string): boolean {
  const normalized = text.toLowerCase();

  if (type === "checklist") {
    return /\bquiz\b|\bassessment\b|\bscoring\b|\bscore\b|\bself-assessment\b/.test(normalized);
  }

  if (type === "quiz") {
    return !/\bquiz\b|\bassessment\b/.test(normalized);
  }

  return false;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  contentKey: string;
  title: string;
  description: string;
  abbyTip: string;
  aiPrompt: string;
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  stepId: string;
  bookId: string;
  bookTitle: string;
  configKey?: string;
  category?: BuilderCategory;
  builderId?: string;
  builderLabel?: string;
  /** Override the default "How It Works" step instructions */
  stepInstructions?: { label: string; description: string }[];
  /** If contentKey is empty, seed it from this other stepData key on mount */
  seedFromKey?: string;
}

export default function SharedContentStep({
  contentKey, title, description, abbyTip, aiPrompt,
  stepData, setStepData, onMarkEdited, stepId, bookId, bookTitle, configKey,
  builderId, builderLabel, seedFromKey,
}: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [replyInput, setReplyInput] = useState("");
  const replyInputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const rawContent: string = stepData[contentKey] || "";
  const contentHasStop = hasStopMarker(rawContent);
  const content: string = rawContent && !contentHasStop ? stripMarkdown(rawContent) : "";
  const config = configKey ? stepData[configKey] || {} : {};
  const leadMagnetType = contentKey === "leadMagnetContent" ? String(config?.type || "").toLowerCase() : "";

  // Seed from a previous step's content if this key is empty
  useEffect(() => {
    if (!stepData[contentKey] && seedFromKey && stepData[seedFromKey]) {
      setStepData(prev => ({ ...prev, [contentKey]: prev[seedFromKey!] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedFromKey, contentKey]);

  // If saved content has [STOP], bootstrap conversation from it
  useEffect(() => {
    if (contentHasStop && conversation.length === 0) {
      setConversation([
        { role: "assistant" as const, content: rawContent },
      ]);
      // Clear the saved content so conversation mode activates
      setStepData(prev => ({ ...prev, [contentKey]: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHasStop, contentKey, setStepData]);

  // Guard against stale/mismatched lead magnet content from previous type selections
  useEffect(() => {
    if (!leadMagnetType || !rawContent || contentHasStop) return;
    if (isLeadMagnetTypeMismatch(rawContent, leadMagnetType)) {
      setStepData(prev => ({ ...prev, [contentKey]: "" }));
      toast({
        title: "Content reset to match your selected type",
        description: `Your ${leadMagnetType} setting changed, so Abby will generate a fresh version.`,
      });
    }
  }, [leadMagnetType, rawContent, contentHasStop, contentKey, setStepData, toast]);

  // Check if the latest assistant message has [STOP]
  const lastAssistantMsg = [...conversation].reverse().find(m => m.role === "assistant");
  const isAwaitingReply = lastAssistantMsg ? hasStopMarker(lastAssistantMsg.content) : false;
  const quickOptions = lastAssistantMsg ? extractQuickOptions(lastAssistantMsg.content) : [];

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Auto-focus reply input when awaiting reply
  useEffect(() => {
    if (isAwaitingReply) {
      setTimeout(() => replyInputRef.current?.focus(), 100);
    }
  }, [isAwaitingReply]);

  const callAI = async (messages: { role: string; content: string }[]): Promise<string> => {
    const token = await getActiveToken();

    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages,
        bookId,
        isPremium: true,
        builderMode: true,
        builderId: builderId || stepId,
        builderLabel: builderLabel || title,
        builderStep: stepId,
      }),
    });

    if (!resp.ok) throw new Error("Generation failed");

    const text = await resp.text();
    let fullText = "";
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") break;
      try {
        const parsed = JSON.parse(json);
        fullText += parsed.choices?.[0]?.delta?.content || "";
      } catch (error) {
      console.error(error);
    }
    }
    return fullText;
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const prompt = aiPrompt
        .replace(/\{bookTitle\}/g, bookTitle)
        .replace(/\{config\}/g, JSON.stringify(config, null, 2));

      const messages = [{ role: "user", content: prompt }];
      let fullText = await callAI(messages);

      if (leadMagnetType && isLeadMagnetTypeMismatch(fullText, leadMagnetType)) {
        const correctionPrompt = `Rewrite the draft below so it EXACTLY matches lead magnet type "${leadMagnetType}".

Rules:
- If type is checklist: do NOT include quiz, assessment, score, or scoring.
- If type is quiz: structure as quiz/assessment.
- Keep these sections: HEADLINE & SUBHEADLINE, MAIN CONTENT, INTRODUCTION, CALL-TO-ACTION, AUTHOR BIO BLURB.
- Return markdown only.

Draft to fix:
${fullText}`;

        fullText = await callAI([{ role: "user", content: correctionPrompt }]);
      }

      // Check if Abby is asking a question
      if (hasStopMarker(fullText)) {
        // Enter conversation mode
        setConversation([
          { role: "user" as const, content: prompt },
          { role: "assistant" as const, content: fullText },
        ]);
        // Don't save to stepData yet — conversation isn't finished
      } else {
        // No stop — save directly
        setStepData(prev => ({ ...prev, [contentKey]: stripMarkdown(fullText) }));
        onMarkEdited(stepId);
        setConversation([]);

        // Cross-builder push for lead-magnet content
        if (builderId === "lead-magnet" || contentKey === "leadMagnetContent") {
          try {
            let parsedJson: any = null;
            try { parsedJson = JSON.parse(fullText); } catch { /* not JSON, skip push */ }
            if (parsedJson && parsedJson.social_media_posts) {
              // Look up author_id from the book
              const { data: bookData } = await supabase
                .from("books")
                .select("author_id")
                .eq("id", bookId)
                .single();
              const authorId = bookData?.author_id;
              if (authorId) {
                const outputs: Record<string, { title: string; description?: string; content: Record<string, any> }> = {};
                if (parsedJson.social_media_posts) {
                  outputs["quiz-promo-posts"] = {
                    title: "Quiz Promotion Posts",
                    description: "Social media posts promoting the lead magnet quiz",
                    content: { posts: parsedJson.social_media_posts },
                  };
                }
                if (parsedJson.quiz_insights_for_social) {
                  outputs["quiz-insight-posts"] = {
                    title: "Quiz Insight Posts",
                    description: "Standalone insight posts from quiz content",
                    content: { insights: parsedJson.quiz_insights_for_social },
                  };
                }
                await executeCrossBuilderPushes({
                  sourceBuilder: "lead-magnet",
                  authorId,
                  bookId,
                  outputs,
                });
              }
            }
          } catch (pushErr) {
            console.error("Cross-builder push failed (non-blocking):", pushErr);
          }
        }
      }
      toast({ title: `${title} generated!` });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setGenerating(false);
  };

  const sendReply = async (replyText?: string) => {
    const reply = replyText || replyInput.trim();
    if (!reply || generating) return;

    setReplyInput("");
    setGenerating(true);

    const updatedConversation: ConversationMessage[] = [
      ...conversation,
      { role: "user", content: reply },
    ];
    setConversation(updatedConversation);

    try {
      const fullText = await callAI(updatedConversation);

      const newConversation: ConversationMessage[] = [
        ...updatedConversation,
        { role: "assistant", content: fullText },
      ];
      setConversation(newConversation);

      // If no more [STOP], the conversation is complete — save the final output
      if (!hasStopMarker(fullText)) {
        setStepData(prev => ({ ...prev, [contentKey]: stripMarkdown(fullText) }));
        onMarkEdited(stepId);
        toast({ title: `${title} finalized!` });
        // Keep conversation visible so author can see the flow
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Reply failed", variant: "destructive" });
    }
    setGenerating(false);
  };

  // Conversation mode: show the back-and-forth with Abby
  const isInConversation = conversation.length > 0 && !content;

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">{abbyTip}</p>
      </AbbyRecommendationCard>

      {/* Conversation mode: Abby asked a [STOP] question */}
      {isInConversation && (
        <Card className="overflow-hidden border-secondary/30">
          {/* Conversation header */}
          <div className="px-4 py-3 bg-secondary/5 border-b border-secondary/20 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-secondary/20 flex items-center justify-center">
              <MessageCircle className="h-3.5 w-3.5 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Abby needs your input</p>
              <p className="text-[10px] text-muted-foreground">Answer below to continue generating</p>
            </div>
          </div>

          {/* Messages — rendered in order */}
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
            {conversation.slice(1).map((msg, i) => (
              <div key={i}>
                {msg.role === "assistant" ? (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-secondary" />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {stripStopMarker(msg.content)}
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm max-w-[80%]">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {generating && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs">Abby is thinking...</span>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* Quick-pick options + reply input */}
          {isAwaitingReply && !generating && (
            <div className="border-t border-border p-4 space-y-3 bg-muted/30">
              {quickOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickOptions.map(opt => (
                    <Button
                      key={opt.number}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-secondary/40 text-secondary hover:bg-secondary/10 text-xs"
                      onClick={() => sendReply(opt.number)}
                    >
                      {opt.number}) {opt.label}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  ref={replyInputRef}
                  value={replyInput}
                  onChange={e => setReplyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendReply(); } }}
                  placeholder="Type your answer..."
                  className="text-sm"
                />
                <Button
                  onClick={() => sendReply()}
                  disabled={!replyInput.trim()}
                  size="icon"
                  className="shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* No content yet and no conversation */}
      {!content && !isInConversation && (
        <Card className="p-8 text-center border-2 border-secondary/20 bg-gradient-to-b from-secondary/5 to-transparent">
          <Sparkles className="h-10 w-10 text-secondary/40 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">✨ Ready to Design</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Abby will analyze your book and create your {title.toLowerCase()} content.
          </p>
          <Button onClick={generate} disabled={generating} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Generating..." : `Let Abby Design This →`}
          </Button>
        </Card>
      )}

      {/* Content ready — editable textarea */}
      {content && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
              </Badge>
              <Button variant="outline" size="sm" onClick={() => { setConversation([]); generate(); }} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Regenerate
              </Button>
            </div>
          </div>
          <ContentSectionCards
            content={content}
            onChange={val => {
              onMarkEdited(stepId);
              setStepData(prev => ({ ...prev, [contentKey]: val }));
            }}
            stepTitle={title}
          />
        </div>
      )}
    </div>
  );
}
