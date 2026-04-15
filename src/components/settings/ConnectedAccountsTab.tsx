import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Rocket } from "lucide-react";

interface DeployedNode {
  id: string;
  node_name: string;
  node_id: string;
  status: string;
  activated_at: string | null;
  microsite_url: string | null;
}

export default function ConnectedAccountsTab({ userId }: { userId: string }) {
  const [nodes, setNodes] = useState<DeployedNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const { data: nodesData } = await supabase
          .from("author_nodes")
          .select("id, node_name, node_id, status, activated_at, microsite_url")
          .eq("author_id", profile.id)
          .eq("status", "live");

        setNodes((nodesData as DeployedNode[]) || []);
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      {/* ABBY manages everything */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-4">Marketing Automation</h3>
        <div className="flex items-start gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">ABBY — Your Marketing Manager</p>
              <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ABBY manages all your marketing automatically. No external tools needed. Your campaigns, email sequences, and social media are all handled natively inside Authors Bureau.
            </p>
          </div>
        </div>
      </div>

      {/* What's Live */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-3">What's Live</h3>
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products activated yet. Publish from a builder to see them here.</p>
        ) : (
          <div className="space-y-2">
            {nodes.map(node => (
              <div key={node.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{node.node_name}</span>
                </div>
                <Badge variant="secondary" className="bg-accent/10 text-accent text-[10px]">Live</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
