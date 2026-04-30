import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, Globe, Loader2 } from "lucide-react";
import { ALL_BUILDER_NODES } from "../builders/builderNodeConfig";
import { toast } from "@/hooks/use-toast";

interface LiveNode {
  node_id: string;
  delivery_url: string | null;
  microsite_url: string | null;
  status: string;
  activated_at: string | null;
  book_id: string | null;
}

/** Prefer the branded microsite URL; treat raw asset/storage URLs as not-displayable. */
const BRANDED_HOSTS = /(authorsbureau\.com|authorbureau\.lovable\.app|lovable\.app)$/i;
function isBrandedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return BRANDED_HOSTS.test(u.hostname);
  } catch { return false; }
}
function pickPublicUrl(n: LiveNode): string | null {
  const mu = n.microsite_url?.trim();
  if (mu && isBrandedUrl(mu)) return mu;
  const du = n.delivery_url?.trim();
  if (du && isBrandedUrl(du) && !/\.(mp3|mp4|wav|m4a|pdf|epub|zip)(\?|$)/i.test(du)) {
    return du;
  }
  // Reject anything else (S3, signed URLs, raw storage links).
  return null;
}

const CATEGORY_BADGE: Record<string, { label: string; className: string }> = {
  build: { label: "Brand", className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  bridge: { label: "Build", className: "bg-blue-500/15 text-blue-700 border-blue-300" },
  yield: { label: "Yield", className: "bg-amber-500/15 text-amber-700 border-amber-300" },
};

export default function LiveMicrositesGrid() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<LiveNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: prof } = await supabase
          .from("author_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!prof) { setLoading(false); return; }
        setAuthorId(prof.id);

        const { data } = await supabase
          .from("author_nodes")
          .select("node_id, delivery_url, microsite_url, status, activated_at, book_id")
          .eq("author_id", prof.id)
          .eq("status", "live")
          .order("activated_at", { ascending: false });
        setNodes((data as LiveNode[] | null) || []);
      } catch (e) {
        console.warn("[LiveMicrositesGrid] load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const copyLink = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({ title: "Link copied", description: url });
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="p-6 mb-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your live microsites...
      </Card>
    );
  }

  const liveNodes = nodes.map(n => ({ ...n, _publicUrl: pickPublicUrl(n) })).filter(n => n._publicUrl);
  const allLiveNodeIds = new Set(nodes.map(n => n.node_id));
  const inactive = ALL_BUILDER_NODES.filter(n => !allLiveNodeIds.has(n.id));

  return (
    <div className="space-y-6 mb-8">
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              Your Live Microsites
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {liveNodes.length} of 28 nodes published. Copy any link to share or promote.
            </p>
          </div>
          <Badge className="bg-emerald-600 text-white">{liveNodes.length} LIVE</Badge>
        </div>

        {liveNodes.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No live microsites yet. Activate a node from the sidebar to publish your first one.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liveNodes.map(n => {
              const meta = ALL_BUILDER_NODES.find(m => m.id === n.node_id);
              const cat = meta?.category || "build";
              const badge = CATEGORY_BADGE[cat];
              return (
                <Card key={n.node_id} className="p-4 border bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground font-mono">{n.node_id}</div>
                      <div className="font-semibold truncate">{meta?.label || n.node_id}</div>
                    </div>
                    <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mb-3 font-mono">
                    {n._publicUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyLink(n.node_id, n._publicUrl!)}
                    >
                      {copiedId === n.node_id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedId === n.node_id ? "Copied" : "Copy link"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(n._publicUrl!, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {inactive.length > 0 && (
        <Card className="p-6 border-dashed">
          <h3 className="font-semibold text-base mb-1">Activate more revenue streams</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {inactive.length} nodes are still inactive. Each one opens a new revenue channel.
          </p>
          <div className="flex flex-wrap gap-2">
            {inactive.slice(0, 12).map(n => (
              <Badge key={n.id} variant="outline" className="text-xs font-normal">
                {n.id} · {n.label}
              </Badge>
            ))}
            {inactive.length > 12 && (
              <Badge variant="outline" className="text-xs font-normal">+{inactive.length - 12} more</Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
