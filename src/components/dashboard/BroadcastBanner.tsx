import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notif = { id: string; title: string; message: string | null; link: string | null; created_at: string };

export default function BroadcastBanner() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("ab_dismissed_broadcasts") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      // Recent unread admin broadcasts (last 14 days)
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, link, created_at")
        .eq("user_id", user.id)
        .eq("read", false)
        .gte("created_at", since)
        .ilike("title", "%")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!cancelled && data) {
        // We don't have event_key on notifications; filter on link/title heuristics is unreliable.
        // Surface unread system messages that look like broadcasts (no per-book link prefix).
        const filtered = data.filter(n => !n.link || !/^\/books\//.test(n.link));
        setItems(filtered);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const dismiss = (id: string) => {
    const next = new Set(dismissed); next.add(id);
    setDismissed(next);
    localStorage.setItem("ab_dismissed_broadcasts", JSON.stringify([...next]));
  };

  const visible = items.filter(i => !dismissed.has(i.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.slice(0, 1).map(n => (
        <div key={n.id} className="rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 flex items-start gap-3">
          <Megaphone className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{n.title}</p>
            {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
            {n.link && (
              <a href={n.link} className="text-xs font-medium text-secondary hover:underline mt-1 inline-block">
                View details →
              </a>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => dismiss(n.id)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
