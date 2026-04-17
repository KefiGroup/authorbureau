import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, CreditCard, Sparkles, CheckCircle2, AlertCircle, Loader2,
  Share2, Linkedin, Instagram, Facebook, Twitter, ExternalLink, RefreshCw,
} from "lucide-react";

const PLATFORMS = [
  { key: "linkedin", name: "LinkedIn", Icon: Linkedin },
  { key: "instagram", name: "Instagram", Icon: Instagram },
  { key: "facebook", name: "Facebook", Icon: Facebook },
  { key: "x", name: "X (Twitter)", Icon: Twitter },
] as const;

function maskKey(k: string): string {
  if (!k) return "";
  const tail = k.slice(-4);
  return "••••••••" + tail;
}

export default function ConnectSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Social Accounts state
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  const [apiKey, setApiKey] = useState("");
  const [savedKeyMask, setSavedKeyMask] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadConnections = async (aid: string) => {
    const { data } = await supabase
      .from("social_connections")
      .select("platform, buffer_api_key, status")
      .eq("author_id", aid);
    const platforms = new Set<string>();
    let storedKey: string | null = null;
    (data || []).forEach((row: any) => {
      if (row.status === "active" && row.platform) platforms.add(row.platform);
      if (!storedKey && row.buffer_api_key) storedKey = row.buffer_api_key;
    });
    setConnectedPlatforms(platforms);
    setSavedKeyMask(storedKey ? maskKey(storedKey) : null);
  };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, stripe_connected_account_id, stripe_onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      setStripeConnected(!!profile?.stripe_onboarding_complete);
      if (profile?.id) {
        setAuthorId(profile.id);
        await loadConnections(profile.id);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSync = async () => {
    if (!authorId) return;
    console.log("[ConnectSettings] Starting sync from Buffer...", { authorId, hasNewKey: !!apiKey.trim() });
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-buffer-channels", {
        body: { author_id: authorId, buffer_api_key: apiKey.trim() || undefined },
      });
      console.log("[ConnectSettings] Buffer sync response:", { data, error });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to sync from Buffer");

      await loadConnections(authorId);
      // Belt-and-suspenders: re-query 600ms later to catch DB read-replica lag after upserts
      setTimeout(() => { loadConnections(authorId).catch(() => {}); }, 600);
      // Re-query to log accurate count (state update is async)
      const { data: rows } = await supabase
        .from("social_connections")
        .select("platform")
        .eq("author_id", authorId);
      console.log(`[ConnectSettings] social_connections rows after sync: ${rows?.length ?? 0}`);

      setApiKey("");
      const count = data.count ?? 0;
      toast.success(
        `Done! I found ${count} connected account${count === 1 ? "" : "s"}. Go back to Social Media and click Activate to schedule your posts.`
      );
    } catch (err: any) {
      console.error("[ConnectSettings] Sync error:", err);
      toast.error(err?.message || "Failed to sync from Buffer");
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const syncDisabled = syncing || (!apiKey.trim() && !savedKeyMask) || !authorId;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Connect Settings</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Stripe */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">Stripe Payments</p>
                {stripeConnected ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
                    <AlertCircle className="h-3 w-3 mr-1" /> Not Connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {stripeConnected
                  ? "Your Stripe account is connected. You can receive payments for your products."
                  : "Connect Stripe to accept payments for your products and services."}
              </p>
              <Button
                variant={stripeConnected ? "outline" : "default"}
                size="sm"
                onClick={() => navigate("/dashboard?section=connect-stripe")}
              >
                {stripeConnected ? "Manage Stripe" : "Connect Stripe"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Email Marketing — native */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">Email Marketing</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">Native</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                ABBY manages all your email marketing, lead capture, and nurture sequences natively inside Authors Bureau. No external email tools or connections needed.
              </p>
            </div>
          </div>
        </Card>

        {/* Social Accounts */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">Social Accounts</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">via Buffer</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your social accounts through Buffer so ABBY can schedule and publish posts on your behalf.
              </p>

              {/* Buffer API key */}
              <div className="space-y-2 mb-5">
                <Label htmlFor="buffer-api-key">Buffer API Key</Label>
                <Input
                  id="buffer-api-key"
                  type="text"
                  autoComplete="off"
                  placeholder={savedKeyMask ? `${savedKeyMask}  (saved — paste a new key to replace)` : "Paste your Buffer API key here"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your key from Buffer → Settings → API → New Key
                </p>
                <a
                  href="https://buffer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Don't have Buffer? Set it up free <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Platform list */}
              <div className="space-y-2 mb-5">
                {PLATFORMS.map(({ key, name, Icon }) => {
                  const connected = connectedPlatforms.has(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                      {connected ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Connected via Buffer
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button onClick={handleSync} disabled={syncDisabled} size="sm">
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Sync from Buffer
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
