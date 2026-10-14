import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Newspaper, CalendarCheck, X, Check, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Draft {
  id: string;
  platform: string;
  visual_format: string;
  content: string;
  book_anchor: string | null;
  news_title: string | null;
  news_url: string | null;
  news_source: string | null;
  suggested_at: string | null;
}

const FORMAT_LABEL: Record<string, string> = {
  news_split: "Hot take on the news",
  carousel: "Swipe carousel",
  comparison: "Old way vs book way",
  quote_card: "Authority quote card",
  cheat_sheet: "Save-worthy cheat sheet",
};

async function callEngine(body: Record<string, unknown>) {
  const token = await getActiveToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const res = await fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topical-social-engine`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }, 180000);
  const r = await res.json().catch(() => null);
  if (!r?.success) throw new Error(r?.message || "Something went wrong. Please try again.");
  return r;
}

export default function TopicalDraftsPanel({ bookId, onScheduled }: { bookId?: string | null; onScheduled?: () => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!bookId) { setDrafts([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("topical_social_drafts" as any)
      .select("id, platform, visual_format, content, book_anchor, news_title, news_url, news_source, suggested_at")
      .eq("book_id", bookId).eq("status", "pending").order("post_index");
    setDrafts((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [bookId]);

  const run = async (key: string, body: Record<string, unknown>, okMsg?: string) => {
    setBusy(key);
    try {
      const r = await callEngine(body);
      toast.success(okMsg || r.message);
      await load();
      if (body.action !== "dismiss" && body.action !== "generate") onScheduled?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  if (!bookId) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <Newspaper className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-foreground">This week's topical posts</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Every Monday ABBY reads trusted news in your book's field and pairs one real headline with one idea from your book. Nothing posts until you approve it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("gen", { action: "generate", book_id: bookId })}>
            {busy === "gen" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1.5">{drafts.length ? "Refresh with latest news" : "Generate now"}</span>
          </Button>
          {drafts.length > 0 && (
            <Button size="sm" disabled={!!busy} onClick={() => run("all", { action: "approve_all", book_id: bookId })}>
              {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Schedule all {drafts.length}</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : drafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No topical posts waiting. New ones arrive every Monday, or tap Generate now.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {drafts.map((d) => (
            <div key={d.id} className="rounded-md border border-border bg-card p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{FORMAT_LABEL[d.visual_format] || d.visual_format}</Badge>
                <Badge variant="outline" className="capitalize">{d.platform}</Badge>
                {d.suggested_at && <Badge variant="outline">{new Date(d.suggested_at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</Badge>}
              </div>
              {d.news_title && (
                <a href={d.news_url || "#"} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                  <span><strong>{d.news_source}:</strong> {d.news_title}</span>
                </a>
              )}
              {d.book_anchor && <p className="text-[11px] text-amber-700">Book idea used: {d.book_anchor}</p>}
              <p className="text-xs whitespace-pre-line text-foreground leading-relaxed line-clamp-[10]">{d.content}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run(d.id, { action: "approve", ids: [d.id] }, "Scheduled in your calendar")}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Schedule
                </Button>
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(d.id + "x", { action: "dismiss", ids: [d.id] }, "Removed")}>
                  <X className="h-3.5 w-3.5 mr-1" /> Skip
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
