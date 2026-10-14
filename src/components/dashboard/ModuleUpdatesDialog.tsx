import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { NODE_UPDATES } from "@/lib/node-updates";

type Notif = { id: string; title: string; message: string | null; link: string | null };

export const UPDATE_PREFIX = "Update available:";

const bookFromMessage = (m: string | null) => m?.match(/"([^"]+)"/)?.[1] ?? "Your book";
const nodeFromLink = (l: string | null) => l?.match(/node-builder\/([A-Z]{2}-\d{2})/)?.[1] ?? null;

/** Pop-up that groups every unread module-upgrade notification by module, listing each affected book. */
export default function ModuleUpdatesDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, link")
        .eq("user_id", user.id)
        .eq("read", false)
        .ilike("title", `${UPDATE_PREFIX}%`)
        .order("created_at", { ascending: false });
      if (!cancelled && data?.length) { setItems(data); setOpen(true); }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; node: string | null; rows: Notif[] }>();
    for (const n of items) {
      const g = map.get(n.title) ?? { title: n.title.replace(UPDATE_PREFIX, "").trim(), node: nodeFromLink(n.link), rows: [] };
      g.rows.push(n);
      map.set(n.title, g);
    }
    return [...map.values()];
  }, [items]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
  };

  const dismissAll = () => { markRead(items.map(i => i.id)); setOpen(false); };

  const openBook = (n: Notif) => {
    markRead([n.id]);
    setItems(prev => prev.filter(p => p.id !== n.id));
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  if (!groups.length) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" /> Better versions are ready
          </DialogTitle>
          <DialogDescription>
            Modules you already built have been improved. Open each book to review and refresh.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {groups.map(g => {
            const upd = g.node ? NODE_UPDATES[g.node] : undefined;
            return (
              <div key={g.title} className="rounded-lg border border-border p-4 space-y-3">
                <p className="font-semibold">{g.title}</p>
                {upd?.highlights?.length ? (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {upd.highlights.map((c: string) => <li key={c}>{c}</li>)}
                  </ul>
                ) : null}
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {g.rows.length} {g.rows.length === 1 ? "book" : "books"} affected
                </p>
                <div className="space-y-2">
                  {g.rows.map(n => (
                    <button key={n.id} onClick={() => openBook(n)}
                      className="w-full flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted">
                      <span className="break-words">{bookFromMessage(n.message)}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-secondary" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Remind me later</Button>
          <Button onClick={dismissAll}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
