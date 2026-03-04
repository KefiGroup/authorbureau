import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { FileText, Loader2, Edit3, Eye, Download, Save, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { redirectToPublishNow } from "@/lib/publishnow-redirect";

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

export default function WorkbooksManager() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) return;
    fetchWorkbooks();
  }, [user, bookFilterId]);

  const fetchWorkbooks = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const cloudUserId = authData.user?.id;

    let query = supabase
      .from("workbooks" as any)
      .select("*");

    if (cloudUserId) {
      query = query.eq("author_id", cloudUserId);
    }

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
  };

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

  const handleDownload = (wb: Workbook) => {
    const blob = new Blob([wb.content_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wb.title.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">Workbooks</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-6">
          AI-generated companion workbooks appear here after you run "Build My Author Business" for a book. Each workbook contains exercises, reflection questions, and action plans from your book chapters.
        </p>
        <Badge variant="secondary">Generate from AI Engine → Build My Business</Badge>
      </div>
    );
  }

  // Detail view
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
                <Button variant="outline" size="sm" onClick={() => handleDownload(selected)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                </Button>
                <Button size="sm" onClick={handlePublishViaPublishNow} disabled={publishingSSO}>
                  {publishingSSO
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  }
                  Publish via AI Publishing Studio
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Workbooks</h2>
          <p className="text-sm text-muted-foreground mt-1">{workbooks.length} workbook{workbooks.length !== 1 ? "s" : ""} generated</p>
        </div>
      </div>

      <div className="grid gap-4">
        {workbooks.map(wb => (
          <Card key={wb.id} className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all" onClick={() => setSelectedId(wb.id)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{wb.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{wb.description || "No description"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {wb.price > 0 && <span className="text-sm font-medium">${wb.price}</span>}
                <Badge variant={wb.status === "published" ? "default" : "secondary"} className="text-xs">
                  {wb.status}
                </Badge>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
