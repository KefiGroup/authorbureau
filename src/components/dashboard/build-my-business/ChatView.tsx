import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import BusinessPlanActions, { isBusinessPlanMessage } from "@/components/dashboard/BusinessPlanActions";
import FullPlanDialog from "@/components/dashboard/FullPlanDialog";
import SavedBusinessPlan from "@/components/dashboard/SavedBusinessPlan";
import FrameworkInterviewModal, { type BuildMode } from "@/components/dashboard/FrameworkInterviewModal";
import SubscriptionSalesPitch from "@/components/dashboard/framework-dashboard/SubscriptionSalesPitch";
import AbbyNarrativeLoading from "@/components/dashboard/builders/AbbyNarrativeLoading";
import ChatChoiceButtons, { parseChoices, parseConfirmation } from "@/components/dashboard/ChatChoiceButtons";
import type { AuthorFramework } from "@/components/dashboard/FrameworksEditor";
import {
  Loader2, Send, ArrowLeft, Sparkles, User, RotateCcw,
  Wrench, Crown, Rocket,
} from "lucide-react";
import type { SubscriptionTier } from "@/hooks/useAuth";
import type { Book, ChatMessage } from "./types";
import { parseBuildRequests, parseAnalysisData, parseNavMarkers, NAV_CONFIG } from "./parsers";

interface ChatViewProps {
  selectedBook: Book;
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  isBuildingPlan: boolean;
  isBuilding: string | null;
  isPremium: boolean;
  isAdmin: boolean;
  tier: SubscriptionTier;
  userId: string;
  checkoutLoading: boolean;
  portalLoading: boolean;
  showFrameworkModal: boolean;
  pendingBuildReq: Record<string, string> | null;
  onSendMessage: (content: string) => void;
  onReset: (goBack?: boolean) => void;
  onSubscribe: () => void;
  onSubscribeTier: (tier: "brand" | "build" | "yield") => void;
  onManageSubscription: () => void;
  onStartBuild: (req: Record<string, string>) => void;
  onFrameworkConfirm: (frameworks: AuthorFramework[], mode: BuildMode) => void;
  onCloseFrameworkModal: () => void;
}

export default function ChatView({
  selectedBook, messages, input, setInput, isStreaming, isBuildingPlan,
  isBuilding, isPremium, isAdmin, tier, userId, checkoutLoading, portalLoading,
  showFrameworkModal, pendingBuildReq,
  onSendMessage, onReset, onSubscribe, onSubscribeTier, onManageSubscription,
  onStartBuild, onFrameworkConfirm, onCloseFrameworkModal,
}: ChatViewProps) {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(input); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onReset(true)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 text-lg">👩‍💼</div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-sm truncate">Abby — Business Advisor</h2>
            <p className="text-xs text-muted-foreground truncate">Strategy for: {selectedBook.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onReset(false)} className="text-xs gap-1.5">
          <RotateCcw className="h-3 w-3" /> New Session
        </Button>
      </div>

      {/* Free plan banner */}
      {!(isPremium || isAdmin) && (
        <div className="mb-4 flex-shrink-0">
          <Card className="border-secondary/40 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 overflow-hidden">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="h-4 w-4 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">You're on the Free Plan</p>
                <p className="text-[11px] text-muted-foreground">Abby's consultation is free. Subscribe to unlock AI builders.</p>
              </div>
              <Button size="sm" className="flex-shrink-0 gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full text-xs px-4"
                onClick={onSubscribe} disabled={checkoutLoading}>
                {checkoutLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crown className="h-3 w-3" />}
                Subscribe
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Saved plan */}
      <div className="mb-4 flex-shrink-0">
        <SavedBusinessPlan bookId={selectedBook.id} bookTitle={selectedBook.title} authorId={userId} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.filter(m => !(m.role === "user" && messages.indexOf(m) === 0 && messages.length > 1)).length === 0 && !isStreaming && !messages.length && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Starting analysis…
          </div>
        )}

        {/* Session time estimate */}
        <div className="rounded-lg border border-secondary/15 bg-secondary/5 px-4 py-3 flex items-start gap-2.5 text-xs text-muted-foreground">
          <span className="text-base leading-none mt-0.5">⏱</span>
          <p>
            This consultation takes <span className="font-medium text-foreground">5–10 minutes</span>. Abby cross-references your book against 34 proven frameworks — including Russell Brunson's Value Ladder, McKinsey SCQ, Bloom's Taxonomy, and the Expert Business Model — to build your personalised strategy.
          </p>
        </div>

        {messages.map((msg, idx) => {
          if (idx === 0 && msg.role === "user" && (msg.content.includes("I'd like to build a business") || msg.content.includes("Start a brand new consultation"))) return null;
          const buildRequests = msg.role === "assistant" ? parseBuildRequests(msg.content) : [];
          const hasSubscribeCta = msg.role === "assistant" && msg.content.includes("===SUBSCRIBE_CTA===");
          const navMarkers = msg.role === "assistant" ? parseNavMarkers(msg.content) : [];
          const displayContent = msg.content
            .replace(/===BUILD_REQUEST===[\s\S]*?===END_BUILD_REQUEST===/g, "")
            .replace(/===SUBSCRIBE_CTA===/g, "")
            .replace(/===CHOICE_SINGLE:\s*.*?===/g, "")
            .replace(/===CHOICE_MULTI:\s*.*?===/g, "")
            .replace(/===NEXT:\s*.*?===/g, "")
            .replace(/===NAV:[\w-]+===/g, "")
            .replace(/\[STOP\]/g, "")
            .replace(/#{1,4}\s*TURN\s+\d+[A-F]?\s*[—–-]\s*.+/gi, "")
            .trim();

          const lastAssistantIdx = messages.reduce((acc, m, i) => m.role === "assistant" ? i : acc, -1);
          const isLastAssistantMsg = msg.role === "assistant" && idx === lastAssistantIdx;

          return (
            <div key={idx} ref={isLastAssistantMsg ? lastAssistantRef : undefined} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-1 text-sm">👩‍💼</div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3"
                : `rounded-2xl rounded-bl-md px-5 py-4 ${displayContent.includes("This is your complete ABBY Business Plan") ? "border-l-4 border-secondary bg-secondary/5" : ""}`
              }`}>
                {msg.role === "assistant" ? <div><MarkdownRenderer content={displayContent} /></div> : <p className="text-sm">{msg.content}</p>}

                {/* Build requests */}
                {buildRequests.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {buildRequests.map((req, i) => {
                      const canBuild = isPremium || isAdmin;
                      return (
                        <Card key={i} className="border-secondary/30 bg-background">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Wrench className="h-4 w-4 text-secondary" />
                              <span className="font-heading font-semibold text-sm">Ready to Build: {req.product_type?.charAt(0).toUpperCase() + req.product_type?.slice(1)}</span>
                            </div>
                            {req.target_audience && <p className="text-xs text-muted-foreground mb-1">Audience: {req.target_audience}</p>}
                            {req.pricing_strategy && <p className="text-xs text-muted-foreground mb-3">Pricing: {req.pricing_strategy}</p>}
                            {canBuild ? (
                              <Button size="sm" className="w-full gap-2" onClick={() => onStartBuild(req)} disabled={!!isBuilding}>
                                {isBuilding === req.product_type ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Building…</> : <><Rocket className="h-3.5 w-3.5" />Approve & Build</>}
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5"><Crown className="h-3.5 w-3.5" />Premium required</p>
                                <Button size="sm" className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={onSubscribe} disabled={checkoutLoading}>
                                  {checkoutLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening…</> : <><Crown className="h-3.5 w-3.5" /> Subscribe to Build</>}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Subscription sales pitch */}
                {((hasSubscribeCta || (msg.role === "assistant" && !isStreaming && isBusinessPlanMessage(displayContent)))) && (
                  <div className="mt-5">
                    <SubscriptionSalesPitch
                      currentTier={tier}
                      onSubscribe={onSubscribeTier}
                      onManage={onManageSubscription}
                      loading={checkoutLoading || portalLoading}
                      analysisData={parseAnalysisData(displayContent, selectedBook?.title || "")}
                    />
                  </div>
                )}

                {msg.role === "assistant" && !isStreaming && isBusinessPlanMessage(displayContent) && (
                  <BusinessPlanActions content={displayContent} bookId={selectedBook.id} bookTitle={selectedBook.title} authorId={userId} />
                )}

                {/* Nav markers */}
                {msg.role === "assistant" && !isStreaming && navMarkers.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {navMarkers.map((key) => {
                      const cfg = NAV_CONFIG[key];
                      if (!cfg) return null;
                      return (
                        <Button key={key} size="sm" className="gap-2 rounded-full" variant={key === navMarkers[0] ? "default" : "outline"}
                          onClick={() => {
                            if (key === "profile") navigate("/dashboard?section=profile");
                            else if (key.endsWith("-studio") && selectedBook) {
                              navigate(`/dashboard?section=${cfg.tab}&bookId=${selectedBook.id}&title=${encodeURIComponent(selectedBook.title)}`);
                            }
                            else if (selectedBook) navigate(`/dashboard/book/${selectedBook.id}?tab=${cfg.tab}`);
                          }}>
                          <span>{cfg.icon}</span>{cfg.label}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {/* Choice buttons */}
                {msg.role === "assistant" && !isStreaming && (() => {
                  const parsed = parseChoices(msg.content);
                  const isLastAssistant = idx === messages.length - 1;
                  if (parsed) {
                    return (
                      <ChatChoiceButtons
                        choices={parsed.choices}
                        multiSelect={parsed.multiSelect}
                        onSubmit={(text) => onSendMessage(text)}
                        disabled={isStreaming || !isLastAssistant}
                      />
                    );
                  }
                  const confirmOpts = parseConfirmation(msg.content);
                  if (confirmOpts) {
                    return (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {confirmOpts.map((opt) => (
                          <Button
                            key={opt}
                            variant={opt.toLowerCase().startsWith("yes") ? "default" : "outline"}
                            size="sm"
                            className="rounded-full px-5"
                            disabled={isStreaming || !isLastAssistant}
                            onClick={() => onSendMessage(opt)}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}

              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1"><User className="h-4 w-4 text-primary" /></div>
              )}
            </div>
          );
        })}

        {/* Narrative loading */}
        {isBuildingPlan && isStreaming && (
          <AbbyNarrativeLoading
            messages={[
              "Reading your book's core frameworks…",
              "Mapping your transformation promise…",
              "Designing your Brand Products suite…",
              "Building your Authority growth strategy…",
              "Calculating revenue projections…",
              "Assembling your complete ABBY Business Plan…",
            ]}
            builderLabel="Business Plan"
            bookTitle={selectedBook?.title || "your book"}
          />
        )}

        {/* Standard loading */}
        {isStreaming && !isBuildingPlan && (messages[messages.length - 1]?.role !== "assistant" || (messages[messages.length - 1]?.content || "").length < 20) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-secondary/20 bg-secondary/5 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-9 h-9 rounded-full bg-secondary/15 flex items-center justify-center"
              >
                <Sparkles className="h-4.5 w-4.5 text-secondary" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-foreground">Abby is analyzing your answer…</p>
                <p className="text-xs text-muted-foreground">Building your personalized strategy</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-secondary/60 via-secondary to-secondary/60 rounded-full"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: "50%" }}
              />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border pt-2 pb-1">
        <div className="flex gap-2 items-end">
          <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about your business strategy…" className="resize-none min-h-[36px] max-h-[80px] text-sm py-2" rows={1} disabled={isStreaming} />
          <Button size="icon" onClick={() => onSendMessage(input)} disabled={!input.trim() || isStreaming} className="h-[36px] w-[36px] flex-shrink-0">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">Abby • AI Business Consultant by Authors Bureau</p>
      </div>

      <FrameworkInterviewModal open={showFrameworkModal} onClose={onCloseFrameworkModal}
        onConfirm={onFrameworkConfirm} productType={pendingBuildReq?.product_type || "product"} bookTitle={selectedBook?.title || ""} bookId={selectedBook?.id} />
    </div>
  );
}
