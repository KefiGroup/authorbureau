import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Zap, X } from "lucide-react";
import { toast } from "sonner";
import { callPulse, PulseConnection } from "@/lib/pulse";

const LABELS: Record<string, string> = { linkedin: "LinkedIn", facebook: "Facebook Page", instagram: "Instagram" };

interface Props {
  /** Called after connections change so parents can refresh connected-platform state. */
  onChange?: (connectedPlatforms: string[]) => void;
  compact?: boolean;
}

/**
 * One-click channel connection through Pulse. Optional: the copy-paste
 * workflow keeps working for any author who never connects.
 */
export default function PulseChannelsPanel({ onChange, compact }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connections, setConnections] = useState<PulseConnection[]>([]);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const apply = useCallback((list: PulseConnection[]) => {
    setConnections(list);
    onChange?.(Array.from(new Set(list.filter((c) => c.status === "active").map((c) => c.network))));
  }, [onChange]);

  const refresh = useCallback(async () => {
    try {
      const r = await callPulse<{ connections: PulseConnection[] }>("status");
      apply(r.connections || []);
      setUnavailable(null);
    } catch (e) {
      setUnavailable(e instanceof Error ? e.message : "Unavailable");
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const connect = async () => {
    // Open the window synchronously so popup blockers allow it.
    const win = window.open("about:blank", "_blank");
    setBusy(true);
    try {
      const r = await callPulse<{ url: string }>("connect_session");
      if (win) win.location.href = r.url; else window.location.href = r.url;
      toast.info("Connect your accounts in the new tab, then come back here.");
    } catch (e) {
      win?.close();
      toast.error(e instanceof Error ? e.message : "Couldn't open the connect window");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (c: PulseConnection) => {
    if (!confirm(`Disconnect ${LABELS[c.network] || c.network}? Posts already queued for it will not go out.`)) return;
    setBusy(true);
    try {
      const r = await callPulse<{ connections: PulseConnection[] }>("disconnect", { connection_id: c.id });
      apply(r.connections || []);
      toast.success("Disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect");
    } finally {
      setBusy(false);
    }
  };

  const active = connections.filter((c) => c.status === "active" && LABELS[c.network]);
  const needsReconnect = connections.filter((c) => c.status !== "active" && LABELS[c.network]);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Zap className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Automatic posting (optional)</p>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Connect LinkedIn, a Facebook Page or an Instagram Business/Creator account once. Then each post gets a{" "}
              <strong>Post automatically</strong> button, and scheduled posts go out on their date. Copy caption and Mark as posted still work for everything, including X.
            </p>
          )}
        </div>
        <Button size="sm" onClick={connect} disabled={busy || loading || !!unavailable}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
          {active.length ? "Manage channels" : "Connect channels"}
        </Button>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking your channels…</p>
      ) : unavailable ? (
        <p className="text-xs text-muted-foreground">{unavailable}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {active.length === 0 && <span className="text-xs text-muted-foreground">No channels connected yet.</span>}
          {active.map((c) => (
            <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
              {LABELS[c.network]}{c.label ? ` · ${c.label}` : ""}
              <button type="button" aria-label={`Disconnect ${LABELS[c.network]}`} onClick={() => disconnect(c)} className="ml-1 rounded hover:bg-muted p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {needsReconnect.map((c) => (
            <Badge key={c.id} variant="outline" className="text-amber-600 border-amber-500/40">
              {LABELS[c.network]} needs reconnecting
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
