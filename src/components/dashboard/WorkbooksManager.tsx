import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth, TIERS } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import SubscriptionPricing from "@/components/dashboard/framework-dashboard/SubscriptionPricing";
import { FileText, Loader2, Edit3, Eye, Download, Save, X, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { redirectToPublishNow } from "@/lib/publishnow-redirect";
import BookBuilderContextBar from "./BookBuilderContextBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase as sharedSupabase } from "@/lib/shared-backend";

interface Workbook {
  id: string;
  title: string;
  description: string | null;
  content_markdown: string;
  status: string;
  price: number;
  currency: string;
  book_id: string;
  created_at: string;
}

export default function WorkbooksManager({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const { user, isPremium, isAdmin, tier } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleSubscribeTier = async (tierKey: "brand" | "build" | "yield", promoCode?: string) => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await sharedSupabase.functions.invoke("create-checkout", {
        body: { priceId: TIERS[tierKey].price_id, source_platform: "authorsbureau", ...(promoCode ? { promoCode } : {}) },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      toast.error(err?.message || "Could not start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await sharedSupabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      toast.error(err?.message || "Could not open portal");
    } finally {
      setCheckoutLoading(false);
    }
  };
  const [searchParams] = useSearchParams();
  const bookFilterId = searchParams.get("bookId");
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchWorkbooks = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("workbooks" as any)
      .select("*");

    if (bookFilterId) {
      query = query.eq("book_id", bookFilterId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      const rows = (data ?? []) as unknown as Workbook[];
      setWorkbooks(rows);
      if (bookFilterId && rows.length > 0) {
        setSelectedId(rows[0].id);
      }
    } else {
      setWorkbooks([]);
    }

    setLoading(false);
  }, [bookFilterId]);

  useEffect(() => {
    if (!user) return;
    fetchWorkbooks();
  }, [user, bookFilterId, fetchWorkbooks]);

  const selected = workbooks.find(w => w.id === selectedId);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("workbooks" as any)
      .update({
        title: editTitle,
        description: editDescription,
        price: parseFloat(editPrice) || 0,
      } as any)
      .eq("id", selected.id);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Workbook updated");
      setEditing(false);
      fetchWorkbooks();
    }
    setSaving(false);
  };

  const [publishingSSO, setPublishingSSO] = useState(false);

  const handlePublishViaPublishNow = async () => {
    setPublishingSSO(true);
    toast.info("Redirecting to AI Publishing Studio…");
    const result = await redirectToPublishNow("/publishing");
    if (result.error) {
      toast.error(result.error);
      if (result.fallbackUrl) {
        window.open(result.fallbackUrl, "_blank");
      }
    }
    setPublishingSSO(false);
  };

  const fileSlug = (title: string) => title.toLowerCase().replace(/\s+/g, "-");

  const handleDownloadMd = (wb: Workbook) => {
    const blob = new Blob([wb.content_markdown], { type: "text/markdown" });
    downloadBlob(blob, `${fileSlug(wb.title)}.md`);
  };

  const handleDownloadPdf = async (wb: Workbook) => {
    toast.info("Generating PDF…");
    const htmlContent = markdownToHtml(wb.content_markdown);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download PDF.");
      return;
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${wb.title}</title><style>
      @page { size: A4; margin: 15mm; }
      body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; padding: 40px; }
      h1, h2, h3 { margin-top: 1.5em; }
      @media print { body { padding: 0; } }
    </style></head><body>${htmlContent}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    toast.success("PDF print dialog opened!");
  };

  const handleDownloadDocx = async (wb: Workbook) => {
    const { printExportHtml } = await import("@/lib/print-export");
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.6;}</style></head><body>${markdownToHtml(wb.content_markdown)}</body></html>`;
    printExportHtml(htmlContent, wb.title);
    toast.success("Print dialog opened!");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markdownToHtml = (md: string): string => {
    // Simple markdown-to-HTML conversion for export
    return md
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      .replace(/\n\n/g, "<br/><br/>")
      .replace(/\n/g, "<br/>");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading workbooks…
      </div>
    );
  }

  if (workbooks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <BookBuilderContextBar backTab="automate" />
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">Workbooks</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-6">
          AI-generated companion workbooks appear here after you run "Build My Author Business" for a book. Each workbook contains exercises, reflection questions, and action plans from your book chapters.
        </p>
        {(isPremium || isAdmin) ? (
          bookFilterId ? (
            <Button variant="secondary" onClick={() => {
              const titleParam = searchParams.get("bookTitle");
              const qs = titleParam ? `&bookTitle=${titleParam}` : "";
              window.location.href = `/dashboard?section=builder&builder=workbook&bookId=${bookFilterId}${qs}`;
            }}>
              Open Workbook Builder →
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onNavigate?.("build-business")}>Generate from AI Engine → Build My Business</Button>
          )
        ) : (
          <div className="mt-4 max-w-3xl mx-auto">
            <SubscriptionPricing
              currentTier={tier}
              onSubscribe={handleSubscribeTier}
              onManage={handleManageSubscription}
              loading={checkoutLoading}
            />
          </div>
        )}
      </div>
    );
  }
  if (selected) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(null); setEditing(false); }}>
            ← Back to Workbooks
          </Button>
          <div className="flex gap-2">
            {!editing && (
              <>
                <Button variant="outline" size="sm" onClick={() => {
                  setEditTitle(selected.title);
                  setEditDescription(selected.description || "");
                  setEditPrice(String(selected.price || 0));
                  setEditing(true);
                }}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(selected.content_markdown);
                  toast.success("Workbook content copied to clipboard!");
                }}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Copy Content
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Download <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownloadMd(selected)}>Download .md</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadPdf(selected)}>Download .pdf</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadDocx(selected)}>Download .docx</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={handlePublishViaPublishNow} disabled={publishingSSO}>
                  {publishingSSO
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  }
                  Open AI Publishing Studio
                </Button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Price (USD)</label>
                <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1.5" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-lg">{selected.title}</h3>
                  {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
                </div>
                <Badge variant={selected.status === "published" ? "default" : "secondary"}>
                  {selected.status}
                </Badge>
              </div>
              <div className="px-6 py-3 border-b border-border bg-amber-50/60 text-xs text-amber-800 flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span>To publish as a book: <strong>Copy Content</strong> or <strong>Download</strong> (.md / .pdf / .docx), then paste into the "Add Creations" dialog in AI Publishing Studio.</span>
              </div>
              <div className="px-6 py-6">
                <MarkdownRenderer content={selected.content_markdown} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-4xl space-y-6">
      <BookBuilderContextBar backTab="automate" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Workbooks</h2>
          <p className="text-sm text-muted-foreground mt-1">{workbooks.length} workbook{workbooks.length !== 1 ? "s" : ""} generated</p>
        </div>
      </div>

      <div className="grid gap-4">
        {workbooks.map(wb => (
          <Card key={wb.id} className="hover:shadow-md hover:border-primary/20 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 cursor-pointer flex-1 min-w-0" onClick={() => setSelectedId(wb.id)}>
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">{wb.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{wb.description || "No description"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {wb.price > 0 && <span className="text-sm font-medium">${wb.price}</span>}
                <Badge variant={wb.status === "published" ? "default" : "secondary"} className="text-xs">
                  {wb.status}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setSelectedId(wb.id)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handlePublishViaPublishNow(); }}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
