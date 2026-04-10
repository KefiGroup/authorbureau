import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText, Target, Package, BarChart3, Rocket, X, Sparkles, TrendingUp } from "lucide-react";
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

function extractSections(fullContent: string): PlanSection[] {
  const sections: PlanSection[] = [];

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
    // Skip legacy patterns if we already found new-format sections
    if (["brand", "build", "yield"].includes(p.key) && sections.some(s => ["brand", "build", "yield"].includes(s.key))) continue;
    const match = fullContent.match(p.regex);
    if (match?.[1]?.trim()) {
      sections.push({ key: p.key, label: p.label, icon: p.icon, accent: p.accent, content: stripMarkers(match[1].trim()) });
    }
  }

  if (sections.length === 0 && fullContent.trim()) {
    sections.push({ key: "full", label: "Full Plan", icon: <FileText className="h-4 w-4" />, accent: "from-secondary to-amber-500", content: stripMarkers(fullContent) });
  }

  return sections;
}

function generateExportHtml(plan: string, bookTitle: string): string {
  const cleaned = stripMarkers(plan);
  let html = cleaned
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    .replace(/^(?!<[hulo])((?!<).+)$/gm, "<p>$1</p>")
    .replace(/\n\n/g, "");

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
  const [activeSection, setActiveSection] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
                <h2 className="font-heading text-xl font-bold tracking-tight">ABBY Business Plan</h2>
                <p className="text-sm text-white/60 mt-0.5">{bookTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
                <Sparkles className="h-6 w-6 text-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Loading your business plan…</p>
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
