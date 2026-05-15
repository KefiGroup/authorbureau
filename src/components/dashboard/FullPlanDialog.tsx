import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText, Target, Package, BarChart3, Rocket, X, Sparkles, TrendingUp, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printExportHtml } from "@/lib/print-export";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";

interface FullPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  /** Fallback: all assistant messages joined, used if no saved plan exists */
  chatContent?: string;
}

interface PlanSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  content: string;
}

function stripMarkers(text: string): string {
  return text
    .replace(/===NAV:[\w-]+===/g, "")
    .replace(/===BUILD_REQUEST===[\s\S]*?===END_BUILD_REQUEST===/g, "")
    .replace(/===SUBSCRIBE_CTA===/g, "")
    .replace(/===SHOW_FULL_PLAN===/g, "")
    .replace(/\[STOP\]/g, "")
    .trim();
}

/** Clean a label: strip markdown bold markers and trailing punctuation */
function cleanLabel(label: string): string {
  return label.replace(/\*+/g, "").replace(/[:#]+$/, "").trim();
}

/**
 * Improve content formatting:
 * - Strip stray ** markers
 * - Convert comma-separated product listings into bullet points
 * - Highlight revenue estimates
 * - Convert "Total projected revenue" into a callout
 */
function improveContentFormatting(content: string): string {
  let improved = content;

  // Fix stray lone ** that aren't part of bold syntax
  improved = improved.replace(/^\*\*\s*$/gm, "");

  // Split into lines and process
  const lines = improved.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) { result.push(""); continue; }

    // Handle "Sub-Phase X:" lines — convert items to bullets
    const subPhaseMatch = trimmed.match(/^Sub-Phase\s+([AB]):\s*(.+)/i);
    if (subPhaseMatch) {
      const [, phase, items] = subPhaseMatch;
      const itemList = items.replace(/\.\s*$/, "").split(/,\s+/).map(s => s.trim()).filter(Boolean);
      result.push(`**Sub-Phase ${phase}:**`);
      itemList.forEach(item => result.push(`- ${item}`));
      result.push("");
      continue;
    }

    // Handle "Estimated Revenue:" lines — make them blockquotes
    if (/^Estimated Revenue:/i.test(trimmed)) {
      result.push(`> **${trimmed.replace(/\.\s*$/, "")}**`);
      result.push("");
      continue;
    }

    // Handle "Total projected revenue:" lines — make them callouts
    if (/^Total projected revenue:/i.test(trimmed)) {
      result.push(`> 📊 **${trimmed.replace(/\.\s*$/, "")}**`);
      result.push("");
      continue;
    }

    // Lines with multiple products separated by commas (containing $ or parentheses) — convert to bullets
    const hasProducts = /\$[\d,]+/.test(trimmed) || /\(.*?\$.*?\)/.test(trimmed);
    const commaSegments = trimmed.replace(/\.\s*$/, "").split(/,\s+(?=[A-Z])/);
    if (hasProducts && commaSegments.length >= 2 && !trimmed.startsWith(">") && !trimmed.startsWith("-") && !trimmed.startsWith("*")) {
      commaSegments.forEach(seg => result.push(`- ${seg.trim()}`));
      result.push("");
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

function extractSections(fullContent: string): PlanSection[] {
  const sections: PlanSection[] = [];

  // --- Strategy 1: New v2.5 "PART N:" format (from chat) ---
  const partRegex = /#{0,3}\s*PART\s*(\d+)\s*:\s*[🎯📦🏗📈💰🔓✨🎉]*\s*(.+?)(?:\n|$)([\s\S]*?)(?=#{0,3}\s*PART\s*\d+\s*:|#{1,3}\s*Revenue Summary|$)/gi;
  const partConfigs: Record<number, { key: string; icon: React.ReactNode; accent: string }> = {
    1: { key: "analyse", icon: <Sparkles className="h-4 w-4" />, accent: "from-amber-500 to-yellow-400" },
    2: { key: "brand", icon: <Package className="h-4 w-4" />, accent: "from-emerald-500 to-green-400" },
    3: { key: "build", icon: <TrendingUp className="h-4 w-4" />, accent: "from-blue-500 to-cyan-400" },
    4: { key: "yield", icon: <Target className="h-4 w-4" />, accent: "from-purple-500 to-violet-400" },
  };

  let partMatch;
  while ((partMatch = partRegex.exec(fullContent)) !== null) {
    const partNum = parseInt(partMatch[1]);
    const partTitle = partMatch[2].trim();
    const partContent = partMatch[3].trim();
    const cfg = partConfigs[partNum] || { key: `part${partNum}`, icon: <FileText className="h-4 w-4" />, accent: "from-secondary to-amber-500" };
    if (partContent) {
      sections.push({ key: cfg.key, label: cleanLabel(partTitle).slice(0, 40), icon: cfg.icon, accent: cfg.accent, content: improveContentFormatting(stripMarkers(partContent)) });
    }
  }

  if (sections.length >= 2) {
    // Also extract revenue summary and total if present
    const revenueMatch = fullContent.match(/(?:#{1,3}\s*Revenue Summary|Your total projected revenue)([\s\S]*?)(?=Want to see|Click below|$)/i);
    if (revenueMatch?.[0]?.trim()) {
      const revContent = revenueMatch[0].replace(/^#{1,3}\s*Revenue Summary\s*/i, "").trim();
      sections.push({ key: "revenue", label: "Revenue Summary", icon: <BarChart3 className="h-4 w-4" />, accent: "from-orange-500 to-red-400", content: improveContentFormatting(stripMarkers(revContent)) });
    }
    return sections;
  }

  // --- Strategy 2: Structured SECTION format ---
  const patterns: Array<{ key: string; label: string; icon: React.ReactNode; accent: string; regex: RegExp }> = [
    { key: "transformation", label: "Transformation Promise", icon: <Sparkles className="h-4 w-4" />, accent: "from-amber-500 to-yellow-400", regex: /(?:#{1,3}.*?(?:TRANSFORMATION PROMISE|SECTION 1).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)|$)/i },
    { key: "brand", label: "B·Brand Products", icon: <Package className="h-4 w-4" />, accent: "from-emerald-500 to-green-400", regex: /(?:#{1,3}.*?(?:B[·.]?BRAND PRODUCTS|SECTION 2).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "build", label: "B·Build Authority", icon: <TrendingUp className="h-4 w-4" />, accent: "from-blue-500 to-cyan-400", regex: /(?:#{1,3}.*?(?:B[·.]?BUILD AUTHORITY|SECTION 3).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "yield", label: "Y·Yield Revenue", icon: <Target className="h-4 w-4" />, accent: "from-purple-500 to-violet-400", regex: /(?:#{1,3}.*?(?:Y[·.]?YIELD REVENUE|SECTION 4).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "monetization", label: "Monetisation Map", icon: <BarChart3 className="h-4 w-4" />, accent: "from-orange-500 to-red-400", regex: /(?:#{1,3}.*?(?:MONETIS?ATION MAP|SECTION 5).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "unlock", label: "Unlock Your Plan", icon: <Rocket className="h-4 w-4" />, accent: "from-pink-500 to-rose-400", regex: /(?:#{1,3}.*?(?:UNLOCK YOUR PLAN|SECTION 6).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "nextsteps", label: "Next Steps", icon: <Rocket className="h-4 w-4" />, accent: "from-secondary to-amber-500", regex: /(?:#{1,3}.*?(?:NEXT STEPS|SECTION 7).*?\n)([\s\S]*?)$/i },
    // Legacy format fallbacks
    { key: "brand", label: "Brand Plan", icon: <Package className="h-4 w-4" />, accent: "from-emerald-500 to-green-400", regex: /(?:#{1,3}.*?STARTER PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?PRO PACKAGE|$)/i },
    { key: "build", label: "Build Plan", icon: <TrendingUp className="h-4 w-4" />, accent: "from-blue-500 to-cyan-400", regex: /(?:#{1,3}.*?PRO PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?ENTERPRISE PACKAGE|$)/i },
    { key: "yield", label: "Yield Plan", icon: <Target className="h-4 w-4" />, accent: "from-purple-500 to-violet-400", regex: /(?:#{1,3}.*?ENTERPRISE PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?MONETIZATION MAP|$)/i },
  ];

  for (const p of patterns) {
    if (["brand", "build", "yield"].includes(p.key) && sections.some(s => ["brand", "build", "yield"].includes(s.key))) continue;
    const match = fullContent.match(p.regex);
    if (match?.[1]?.trim()) {
      sections.push({ key: p.key, label: cleanLabel(p.label), icon: p.icon, accent: p.accent, content: improveContentFormatting(stripMarkers(match[1].trim())) });
    }
  }

  if (sections.length === 0 && fullContent.trim()) {
    sections.push({ key: "full", label: "Full Plan", icon: <FileText className="h-4 w-4" />, accent: "from-secondary to-amber-500", content: improveContentFormatting(stripMarkers(fullContent)) });
  }

  return sections;
}

function markdownToCleanHtml(md: string): string {
  let text = md;
  // Headers (must go before inline bold)
  text = text.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold & italic (non-greedy, multi-line safe)
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, "<em>$1</em>");
  // Blockquotes
  text = text.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  // Horizontal rules
  text = text.replace(/^---+$/gm, "<hr/>");
  // Split into lines for list processing
  const lines = text.split("\n");
  const result: string[] = [];
  let inList: "ul" | "ol" | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)/);
    const numMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (bulletMatch) {
      if (inList !== "ul") { if (inList) result.push(`</${inList}>`); result.push("<ul>"); inList = "ul"; }
      result.push(`<li>${bulletMatch[1]}</li>`);
    } else if (numMatch) {
      if (inList !== "ol") { if (inList) result.push(`</${inList}>`); result.push("<ol>"); inList = "ol"; }
      result.push(`<li>${numMatch[1]}</li>`);
    } else {
      if (inList) { result.push(`</${inList}>`); inList = null; }
      if (!trimmed) { result.push(""); }
      else if (/^<[hbuo]/.test(trimmed) || /^<hr/.test(trimmed)) { result.push(trimmed); }
      else { result.push(`<p>${trimmed}</p>`); }
    }
  }
  if (inList) result.push(`</${inList}>`);
  // Clean empty paragraphs
  return result.join("\n").replace(/<p>\s*<\/p>/g, "");
}

function generateExportHtml(plan: string, bookTitle: string): string {
  const cleaned = stripMarkers(plan);
  const html = markdownToCleanHtml(cleaned);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ABBY Business Plan - ${bookTitle}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap');
@page { margin: 0.8in 1in; size: A4; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; line-height: 1.7; }

/* Cover page */
.cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%); color: white; text-align: center; padding: 60px; }
.cover-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 100px; padding: 8px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; }
.cover h1 { font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 800; margin-bottom: 16px; line-height: 1.2; }
.cover .subtitle { font-size: 18px; color: rgba(255,255,255,0.7); font-weight: 300; margin-bottom: 48px; }
.cover .divider { width: 80px; height: 3px; background: linear-gradient(90deg, #B8860B, #DAA520); border-radius: 2px; margin: 0 auto 48px; }
.cover .meta { font-size: 12px; color: rgba(255,255,255,0.5); }
.cover .meta strong { color: rgba(255,255,255,0.8); }

/* Content */
.content { max-width: 700px; margin: 0 auto; padding: 48px 40px; }
h1 { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 48px 0 20px; padding-bottom: 12px; border-bottom: 3px solid #B8860B; }
h1:first-child { margin-top: 0; }
h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 600; color: #16213e; margin: 36px 0 14px; padding-bottom: 8px; border-bottom: 1px solid #e8e8e8; }
h3 { font-size: 16px; font-weight: 600; color: #333; margin: 24px 0 10px; }
p { font-size: 14px; margin-bottom: 12px; color: #333; }
ul, ol { font-size: 14px; padding-left: 24px; margin-bottom: 16px; }
li { margin-bottom: 6px; color: #444; }
strong { color: #1a1a2e; font-weight: 600; }
em { color: #555; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th { background: #f8f6f0; padding: 10px 14px; text-align: left; font-weight: 600; color: #1a1a2e; border-bottom: 2px solid #B8860B; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
td { padding: 10px 14px; border-bottom: 1px solid #eee; color: #444; }
tr:hover td { background: #fafaf8; }

/* Blockquotes */
blockquote { border-left: 3px solid #B8860B; padding: 10px 16px; margin: 16px 0; background: #faf8f2; font-style: italic; color: #555; }

/* Disclaimer */
.disclaimer { margin-top: 48px; padding: 24px 28px; border: 1px solid #e0d6c0; border-radius: 8px; background: #fffbf0; text-align: center; }
.disclaimer-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #B8860B; margin-bottom: 10px; }
.disclaimer p { font-size: 12px; color: #666; margin-bottom: 8px; line-height: 1.6; }

/* Footer */
.footer { margin-top: 60px; padding-top: 24px; border-top: 2px solid #e8e8e8; text-align: center; }
.footer p { font-size: 11px; color: #999; margin-bottom: 4px; }
.footer .brand { font-family: 'Playfair Display', serif; font-size: 13px; color: #B8860B; font-weight: 600; }
</style></head><body>
<div class="cover">
  <div class="cover-badge">✦ ABBY Framework</div>
  <h1>Business Plan</h1>
  <p class="subtitle">${bookTitle}</p>
  <div class="divider"></div>
  <div class="meta">
    <p>Prepared by <strong>Authors Bureau — AI Marketing Studio</strong></p>
    <p style="margin-top:8px">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
</div>
<div class="content">
${html}
<div class="disclaimer">
  <p class="disclaimer-title">DISCLAIMER</p>
  <p>This business plan is a suggested roadmap generated by AI based on your manuscript and profile. All revenue projections are estimates only and <strong>there is no guarantee of income or results</strong>. Actual earnings depend on market conditions, audience engagement, execution, and many other factors.</p>
  <p>Want personalised guidance? Schedule a consultation with an Authors Bureau Business Consultant via Zoom — email us at <a href="mailto:support@authorsbureau.com" style="color:#B8860B;font-weight:600">support@authorsbureau.com</a></p>
</div>
<div class="footer">
  <p class="brand">Authors Bureau</p>
  <p>The ABBY Framework: Analyze · Brand · Build · Yield</p>
  <p>This plan is confidential and proprietary.</p>
</div>
</div></body></html>`;
}

export default function FullPlanDialog({ open, onOpenChange, bookId, bookTitle, chatContent }: FullPlanDialogProps) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await sharedSupabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    };
  }, []);

  useEffect(() => {
    if (!open || !bookId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: { session } } = await sharedSupabase.auth.getSession();
        const token = session?.access_token;
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "get-plan", bookId }),
        });
        if (resp.ok) {
          const result = await resp.json();
          if (result.content) {
            setPlan(result.content);
          } else if (chatContent) {
            // Fallback: use chat content and save it for future use
            setPlan(chatContent);
            try {
              await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ action: "save-plan", bookId, content: chatContent }),
              });
            } catch (_) { /* non-blocking save */ }
          }
        } else if (chatContent) {
          setPlan(chatContent);
        }
      } catch (err) {
        console.error("Failed to load plan:", err);
        if (chatContent) setPlan(chatContent);
      }
      setLoading(false);
    })();
  }, [open, bookId, chatContent]);

  const sections = useMemo(() => plan ? extractSections(plan) : [], [plan]);

  useEffect(() => {
    if (sections.length > 0 && !activeSection) {
      setActiveSection(sections[0].key);
    }
  }, [sections, activeSection]);

  const handleDownload = async () => {
    if (!plan) return;
    setDownloading(true);
    try {
      const fullHtml = generateExportHtml(plan, bookTitle);
      printExportHtml(fullHtml, `ABBY Business Plan - ${bookTitle}`);
      toast({ title: "Export ready!", description: "Use your browser's Save as PDF option for best results." });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
    setDownloading(false);
  };

  const handleGenerateFullPlan = async () => {
    if (!plan) return;
    setGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "expand-plan", bookId, summaryPlan: plan }),
      });
      if (!resp.ok) throw new Error("Failed to generate full plan");
      const result = await resp.json();
      if (result.content) {
        setPlan(result.content);
        setActiveSection("");
        // Save the expanded plan
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "save-plan", bookId, content: result.content }),
          });
        } catch (_) { /* non-blocking */ }
        toast({ title: "Full plan generated!", description: "Your complete 28-node revenue map is ready." });
      }
    } catch (err) {
      console.error("Failed to generate full plan:", err);
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    }
    setGenerating(false);
  };

  // Heuristic: the full 28-node plan lists every node code (BP-/BA-/YR-).
  // The consultation summary only lists 2-4 examples per Build/Yield section
  // and includes 🔒 lock markers. Use node-code count as the reliable signal.
  const nodeCodeCount = plan ? (plan.match(/\b(BP|BA|YR)-\d{2}\b/g)?.length || 0) : 0;
  const hasLockMarkers = plan ? /🔒|unlocked with the (Build|Yield) Package/i.test(plan) : false;
  const isFullPlan = !!plan && nodeCodeCount >= 20 && !hasLockMarkers;
  const isSummaryPlan = !!plan && !isFullPlan;

  const scrollToSection = (key: string) => {
    setActiveSection(key);
    const el = document.getElementById(`plan-section-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        {/* Premium Header */}
        <div className="relative shrink-0 bg-gradient-to-r from-[hsl(var(--navy))] via-[hsl(220,40%,20%)] to-[hsl(var(--navy))] text-white px-8 py-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvZz48L3N2Zz4=')] opacity-40" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary to-amber-400 flex items-center justify-center shadow-lg shadow-secondary/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-bold tracking-tight">ABBY Business Plan</h2>
                  {isFullPlan && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider">
                      ✓ Full 28-Node Plan
                    </span>
                  )}
                  {isSummaryPlan && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider">
                      Summary Preview
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-0.5">{bookTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isFullPlan && plan && (
                <Button
                  size="sm"
                  className="gap-2 text-xs h-9 bg-gradient-to-r from-secondary to-amber-400 text-white border-0 hover:from-secondary/90 hover:to-amber-400/90 shadow-lg"
                  onClick={handleGenerateFullPlan}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {generating ? "Expanding…" : "Generate Full 28-Node Plan"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs h-9 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
                onClick={handleDownload}
                disabled={downloading || !plan}
              >
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden bg-muted/30">
          {(loading || generating) ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
                <Sparkles className="h-6 w-6 text-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {generating ? "Generating your full 28-node plan… This may take a moment." : "Loading your business plan…"}
              </p>
            </div>
          ) : !plan || sections.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No plan found</p>
                <p className="text-sm text-muted-foreground mt-1">Chat with Abby to generate your business plan first.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Side Navigation */}
              <nav className="w-64 shrink-0 border-r border-border bg-background p-4 overflow-y-auto hidden md:block">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 px-3">Plan Sections</p>
                <div className="space-y-1">
                  {sections.map((s, i) => (
                    <button
                      key={s.key}
                      onClick={() => scrollToSection(s.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                        activeSection === s.key
                          ? "bg-secondary/10 text-secondary shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        activeSection === s.key
                          ? "bg-gradient-to-br " + s.accent + " text-white shadow-md"
                          : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
                      }`}>
                        {s.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${activeSection === s.key ? "text-secondary" : ""}`}>
                          {s.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">Section {i + 1}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick stats footer */}
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 border border-secondary/10">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-2">Plan Overview</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Sections</span>
                        <span className="font-semibold text-foreground">{sections.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Framework</span>
                        <span className="font-semibold text-foreground">ABBY</span>
                      </div>
                    </div>
                  </div>
                </div>
              </nav>

              {/* Main Content */}
              <div ref={contentRef} className="flex-1 overflow-y-auto">
                {/* Mobile tab bar */}
                <div className="md:hidden sticky top-0 z-10 bg-background border-b border-border p-3 overflow-x-auto flex gap-2">
                  {sections.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => scrollToSection(s.key)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeSection === s.key
                          ? "bg-secondary/10 text-secondary border border-secondary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 space-y-10">
                  {sections.map((s, i) => (
                    <section
                      key={s.key}
                      id={`plan-section-${s.key}`}
                      className="scroll-mt-20"
                    >
                      {/* Section header */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.accent} text-white flex items-center justify-center shadow-lg`}>
                          {s.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Section {i + 1}</p>
                          <h3 className="font-heading text-lg font-bold text-foreground">{s.label}</h3>
                        </div>
                      </div>

                      {/* Section content */}
                      <div className="bg-background rounded-xl border border-border shadow-sm p-6 md:p-8">
                        <div className="prose prose-sm max-w-none">
                          <MarkdownRenderer content={s.content} />
                        </div>
                      </div>
                    </section>
                  ))}

                  {/* Disclaimer */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40 p-5 text-center space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Disclaimer</p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
                      This business plan is a suggested roadmap generated by AI based on your manuscript and profile. 
                      All revenue projections are estimates only and <strong>there is no guarantee of income or results</strong>. 
                      Actual earnings depend on market conditions, audience engagement, execution, and many other factors.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
                      Want personalized guidance? Schedule a consultation with an Authors Bureau Business Consultant via Zoom — 
                      email us at{" "}
                      <a href="mailto:support@authorsbureau.com" className="text-secondary font-semibold hover:underline">
                        support@authorsbureau.com
                      </a>
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-6 pb-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Generated by <span className="font-semibold text-secondary">Authors Bureau</span> — The ABBY Framework
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Analyze · Brand · Build · Yield</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
