import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Download, FileText, Target, Package, BarChart3, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printExportHtml } from "@/lib/print-export";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";

interface FullPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
}

interface PlanSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  content: string;
}

function stripMarkers(text: string): string {
  return text
    .replace(/===NAV:[\w-]+===/g, "")
    .replace(/===BUILD_REQUEST===[\s\S]*?===END_BUILD_REQUEST===/g, "")
    .replace(/===SUBSCRIBE_CTA===/g, "")
    .replace(/\[STOP\]/g, "")
    .trim();
}

function extractSections(fullContent: string): PlanSection[] {
  const sections: PlanSection[] = [];

  const patterns: Array<{ key: string; label: string; icon: React.ReactNode; regex: RegExp }> = [
    { key: "transformation", label: "Transformation Promise", icon: <Target className="h-3.5 w-3.5" />, regex: /(?:#{1,3}.*?TRANSFORMATION PROMISE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?STARTER PACKAGE|$)/i },
    { key: "starter", label: "Starter Package", icon: <Package className="h-3.5 w-3.5" />, regex: /(?:#{1,3}.*?STARTER PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?PRO PACKAGE|$)/i },
    { key: "pro", label: "Pro Package", icon: <Package className="h-3.5 w-3.5" />, regex: /(?:#{1,3}.*?PRO PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?ENTERPRISE PACKAGE|$)/i },
    { key: "enterprise", label: "Enterprise Package", icon: <Package className="h-3.5 w-3.5" />, regex: /(?:#{1,3}.*?ENTERPRISE PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?MONETIZATION MAP|$)/i },
    { key: "monetization", label: "Monetization Map", icon: <BarChart3 className="h-3.5 w-3.5" />, regex: /(?:#{1,3}.*?MONETIZATION MAP.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?NEXT STEPS|$)/i },
    { key: "nextsteps", label: "Next Steps", icon: <Rocket className="h-3.5 w-3.5" />, regex: /(?:#{1,3}.*?NEXT STEPS.*?\n)([\s\S]*?)$/i },
  ];

  for (const p of patterns) {
    const match = fullContent.match(p.regex);
    if (match?.[1]?.trim()) {
      sections.push({ key: p.key, label: p.label, icon: p.icon, content: stripMarkers(match[1].trim()) });
    }
  }

  // Fallback: if no sections extracted, show the whole plan
  if (sections.length === 0 && fullContent.trim()) {
    sections.push({ key: "full", label: "Full Plan", icon: <FileText className="h-3.5 w-3.5" />, content: stripMarkers(fullContent) });
  }

  return sections;
}

export default function FullPlanDialog({ open, onOpenChange, bookId, bookTitle }: FullPlanDialogProps) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
          setPlan(result.content || null);
        }
      } catch (err) {
        console.error("Failed to load plan:", err);
      }
      setLoading(false);
    })();
  }, [open, bookId]);

  const sections = plan ? extractSections(plan) : [];

  const handleDownload = async () => {
    if (!plan) return;
    setDownloading(true);
    try {
      let html = stripMarkers(plan)
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
        .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
        .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
        .replace(/^(?!<[hulo])((?!<).+)$/gm, "<p>$1</p>")
        .replace(/\n\n/g, "<br/>");

      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:'Calibri',sans-serif;color:#1a1a1a;line-height:1.6;padding:40px;max-width:800px;margin:0 auto}h1{font-size:26px;color:#B8860B;border-bottom:3px solid #B8860B;padding-bottom:12px}h2{font-size:20px;color:#333;margin-top:28px;border-bottom:1px solid #e0e0e0;padding-bottom:6px}h3{font-size:16px;color:#555;margin-top:20px}p{font-size:13px;margin-bottom:8px}ul,ol{font-size:13px}li{margin-bottom:4px}strong{color:#222}</style></head><body>${html}
<div style="margin-top:40px;padding-top:16px;border-top:2px solid #e0e0e0;font-size:11px;color:#999;text-align:center"><p>Generated by Authors Bureau — AI Marketing Studio</p><p>The ABBY Framework: Analyze · Build · Bridge · Yield</p></div></body></html>`;

      printExportHtml(fullHtml, `ABBY Business Plan - ${bookTitle}`);
      toast({ title: "Downloaded!", description: "Business plan exported" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
    setDownloading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary/10 border-2 border-secondary/30 flex items-center justify-center text-lg">
                📋
              </div>
              <div>
                <DialogTitle className="font-heading text-lg">ABBY Business Plan</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{bookTitle}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={handleDownload}
              disabled={downloading || !plan}
            >
              {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Export
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
              <p className="text-sm text-muted-foreground">Loading your business plan…</p>
            </div>
          ) : !plan || sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No saved plan found for this book.</p>
              <p className="text-xs text-muted-foreground/60">Chat with Abby to generate your business plan first.</p>
            </div>
          ) : (
            <Tabs defaultValue={sections[0].key} className="w-full">
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0 mb-5 justify-start">
                {sections.map((s) => (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="text-xs px-3 py-2 gap-1.5 data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary data-[state=active]:shadow-none rounded-lg border border-transparent data-[state=active]:border-secondary/20"
                  >
                    {s.icon}
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {sections.map((s) => (
                <TabsContent key={s.key} value={s.key} className="mt-0">
                  <div className="prose prose-sm max-w-none rounded-xl bg-muted/20 border border-border/50 p-6">
                    <MarkdownRenderer content={s.content} />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
