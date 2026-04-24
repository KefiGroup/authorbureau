import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CreditCard, Sparkles, CheckCircle2, AlertCircle, Loader2,
  Share2, Linkedin, Instagram, Facebook, Twitter, ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type ConnRow = {
  id: string;
  platform: string;
  account_name: string | null;
  status: string;
};

const PLATFORMS = [
  {
    key: "linkedin",
    name: "LinkedIn",
    Icon: Linkedin,
    autoPost: true,
    capability: "Auto-post enabled",
    note: "Posts publish to your LinkedIn profile automatically on the scheduled date.",
  },
  {
    key: "facebook",
    name: "Facebook Page",
    Icon: Facebook,
    autoPost: true,
    capability: "Auto-post (Pages only)",
    note: "Auto-posts to your Facebook Page. Personal profiles are not supported by Meta.",
  },
  {
    key: "instagram",
    name: "Instagram Business",
    Icon: Instagram,
    autoPost: true,
    capability: "Auto-post (Business accounts)",
    note: "Requires an IG Business or Creator account linked to a Facebook Page. Each post needs an image.",
  },
  {
    key: "x",
    name: "X (Twitter)",
    Icon: Twitter,
    autoPost: false,
    capability: "Manual posting",
    note: "X requires a paid API tier ($200/mo) for auto-posting. For now, copy the post and publish manually.",
  },
] as const;

export default function ConnectSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stripeConnected, setStripeConnected] = useState(false);
  const [connections, setConnections] = useState<ConnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [pendingPaidCount, setPendingPaidCount] = useState(0);

  const refresh = async () => {
    if (!user?.id) return;
    const [{ data: profile }, { data: conns }] = await Promise.all([
      supabase.from("author_profiles").select("id, stripe_onboarding_complete").eq("user_id", user.id).maybeSingle(),
      supabase.from("social_connections").select("id, platform, account_name, status").eq("user_id", user.id),
    ]);
    setStripeConnected(!!profile?.stripe_onboarding_complete);
    setConnections((conns as ConnRow[]) || []);

    // Count paid products waiting for Stripe activation.
    if (profile?.id && !profile?.stripe_onboarding_complete) {
      const { data: nodes } = await supabase
        .from("author_nodes")
        .select("id, content_json, status")
        .eq("author_id", profile.id);
      const pending = (nodes || []).filter((n: any) => {
        const cj = (n.content_json ?? {}) as Record<string, any>;
        const price = Number(cj.suggested_price_usd ?? cj.price_usd ?? 0);
        const isPaid = price > 0 || cj.pricing_recommendation === "paid";
        return isPaid && n.status !== "live";
      }).length;
      setPendingPaidCount(pending);
    } else {
      setPendingPaidCount(0);
    }

    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const connFor = (p: string) => connections.find(c => c.platform === p && c.status === "connected");

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Please sign in again", variant: "destructive" }); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-connect-start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ platform, origin: window.location.origin }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: data.needs_setup ? "Setup needed" : "Could not start connection",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      window.location.href = data.authUrl;
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (id: string, name: string) => {
    const { error } = await supabase.from("social_connections").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not disconnect", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Disconnected ${name}` });
    refresh();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">Connect Settings</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {pendingPaidCount > 0 && !stripeConnected && (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {pendingPaidCount} paid product{pendingPaidCount === 1 ? "" : "s"} waiting for Stripe to go live
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect Stripe below to publish your paid products. Free products are unaffected.
                </p>
              </div>
            </div>
          </Card>
        )}

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

        {/* Email Marketing — native (Resend-powered) */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-semibold text-sm">Email Marketing</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">Native</Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Resend Connected
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                ABBY manages all your email marketing, lead capture, and nurture sequences natively via Resend. The first email in each sequence fires the moment a lead opts in — no setup required.
              </p>
            </div>
          </div>
        </Card>

        {/* Social Media — native direct connections */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">Social Media — Direct Connections</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">Native</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect each network directly. Posts will publish automatically on their scheduled date — no Buffer, no third-party scheduler.
              </p>

              <div className="space-y-3">
                {PLATFORMS.map(({ key, name, Icon, autoPost, capability, note }) => {
                  const conn = connFor(key);
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-border bg-background/50 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{name}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${autoPost ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {capability}
                          </Badge>
                        </div>
                        {conn ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {conn.account_name || "Connected"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => handleDisconnect(conn.id, name)}
                            >
                              Disconnect
                            </Button>
                          </div>
                        ) : autoPost ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={connectingPlatform === key}
                            onClick={() => handleConnect(key)}
                          >
                            {connectingPlatform === key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>Connect <ExternalLink className="h-3 w-3 ml-1" /></>
                            )}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Manual only</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{note}</p>
                    </div>
                  );
                })}
              </div>

              <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard?section=marketing-hub&tab=social-calendar")}>
                Open Social Calendar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
