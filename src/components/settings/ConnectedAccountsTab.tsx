import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, RefreshCw, Rocket, AlertTriangle } from "lucide-react";

interface DeployedNode {
  id: string;
  node_name: string;
  node_id: string;
  status: string;
  activated_at: string | null;
  microsite_url: string | null;
}

export default function ConnectedAccountsTab({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);
  const [ghlStatus, setGhlStatus] = useState<string | null>(null);
  const [ghlSubAccountId, setGhlSubAccountId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<DeployedNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [redeploying, setRedeploying] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    // Always resolve author_profiles.id from user_id
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id, ghl_provision_status, ghl_sub_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile) {
      setAuthorProfileId(profile.id);
      setGhlStatus(profile.ghl_provision_status);
      setGhlSubAccountId(profile.ghl_sub_account_id);

      // Fetch nodes using the correct author_profiles.id
      const { data: nodesData } = await supabase
        .from("author_nodes")
        .select("id, node_name, node_id, status, activated_at, microsite_url")
        .eq("author_id", profile.id)
        .in("status", ["live", "published_pending_ghl"]);

      setNodes((nodesData as DeployedNode[]) || []);
    } else {
      setAuthorProfileId(null);
      setGhlStatus(null);
      setGhlSubAccountId(null);
      setNodes([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleConnect = async () => {
    if (!authorProfileId) {
      toast({ title: "Profile not found", description: "Please complete your author profile first.", variant: "destructive" });
      return;
    }
    setProvisioning(true);
    try {
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-provision-author`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ author_id: authorProfileId }),
        },
        30000,
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Provisioning failed");
      toast({ title: "Marketing Hub connected ✓", description: "Your opt-in pages and automations are now ready." });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    }
    setProvisioning(false);
  };

  const handleRedeploy = async (node: DeployedNode) => {
    if (!authorProfileId) return;
    setRedeploying(node.id);
    try {
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-bp02-to-ghl`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ author_id: authorProfileId }),
        },
        30000,
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || "Deploy failed");
      toast({ title: `${node.node_name} deployed ✓` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Re-deploy failed", description: err.message, variant: "destructive" });
    }
    setRedeploying(null);
  };

  const isConnected = ghlStatus === "provisioned" || !!ghlSubAccountId;
  const isFailed = ghlStatus === "failed";
  const isPending = ghlStatus === "pending" || ghlStatus === "provisioning";

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-heading font-semibold text-lg mb-4">Marketing Hub</h3>
        <div className="flex items-start gap-4 p-4 rounded-xl border border-border">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isConnected ? "bg-accent/10" : "bg-muted"}`}>
            {isConnected ? <Wifi className="h-5 w-5 text-accent" /> : <WifiOff className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">GoHighLevel</p>
              {isConnected && <Badge variant="secondary" className="bg-accent/10 text-accent text-[10px]">Connected</Badge>}
              {isFailed && <Badge variant="destructive" className="text-[10px]">Failed</Badge>}
              {isPending && <Badge variant="outline" className="text-[10px]">Pending</Badge>}
              {!isConnected && !isFailed && !isPending && <Badge variant="outline" className="text-[10px]">Not Connected</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Powers your opt-in pages, email automations, and social media distribution from the Marketing Hub.
            </p>
            {!isConnected && (
              <Button onClick={handleConnect} disabled={provisioning} size="sm" className="mt-3">
                {provisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wifi className="h-3.5 w-3.5 mr-1.5" />}
                Connect Now
              </Button>
            )}
            {isFailed && (
              <Button onClick={handleConnect} disabled={provisioning} size="sm" variant="outline" className="mt-3">
                {provisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Retry Connection
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Deployed Nodes */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-3">What's Deployed</h3>
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products deployed yet. Publish from a builder to see them here.</p>
        ) : (
          <div className="space-y-2">
            {nodes.map(node => (
              <div key={node.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{node.node_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {node.status === "live" ? (
                    <Badge variant="secondary" className="bg-accent/10 text-accent text-[10px]">Live</Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Pending
                      </Badge>
                      {isConnected && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={redeploying === node.id}
                          onClick={() => handleRedeploy(node)}
                        >
                          {redeploying === node.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                          Re-deploy
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
