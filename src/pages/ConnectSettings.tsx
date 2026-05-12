import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, CreditCard, Sparkles, CheckCircle2, AlertCircle, Loader2,
  Share2, Linkedin, Instagram, Facebook, Twitter, ExternalLink, Calendar as CalendarIcon, ArrowRight,
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
  const [justConnected, setJustConnected] = useState<{ platform: string; account: string } | null>(null);
  const [pagePicker, setPagePicker] = useState<{
    platform: string;
    tempToken: string;
    pages: { id: string; name: string; picture: string | null }[];
    selectedId: string | null;
    submitting: boolean;
  } | null>(null);

  const refresh = async () => {
    if (!user?.id) return;
    const [{ data: profile }, { data: conns }] = await Promise.all([
      supabase.from("author_profiles").select("id, stripe_onboarding_complete").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("social_connections")
        .select("id, platform, account_name, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["connected", "active"])
        .order("created_at", { ascending: false }),
    ]);
    setStripeConnected(!!profile?.stripe_onboarding_complete);
    // De-dupe by platform — keep only the newest active row per platform so a
    // historic duplicate row (with a different status) can never make a real
    // connection look "not connected".
    const seen = new Set<string>();
    const deduped: ConnRow[] = [];
    for (const row of (conns as ConnRow[]) || []) {
      if (!row.platform || seen.has(row.platform)) continue;
      seen.add(row.platform);
      deduped.push(row);
    }
    setConnections(deduped);

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

  // Listen for OAuth-callback broadcasts so newly-connected accounts appear
  // immediately in this tab without requiring a manual refresh.
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("social-connect");
      bc.onmessage = (ev) => {
        if (ev?.data?.type === "connected" || ev?.data?.type === "disconnected") {
          refresh();
        }
      };
    } catch (_) {}
    return () => { try { bc?.close(); } catch (_) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-refresh the connection badges when the tab regains focus.
  // Stripe Connect happens in another tab/window; without this the badge
  // would stay "Not Connected" until the user manually reloads.
  useEffect(() => {
    if (!user?.id) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // If we just returned from Stripe onboarding, force a refresh and clean URL.
  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "connected" || params.get("stripe") === "success") {
      refresh().then(() => {
        toast({ title: "Stripe connected", description: "Your payments account is now active." });
      });
      params.delete("stripe");
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // If we just returned from a social OAuth connect, show a confirmation
  // banner and force-refresh the connection list immediately.
  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("social") === "connected") {
      const platform = params.get("platform") || "";
      const account = params.get("account") || "";
      const platformLabel = PLATFORMS.find(p => p.key === platform)?.name || platform;
      setJustConnected({ platform: platformLabel, account });
      refresh().then(() => {
        toast({
          title: `${platformLabel} connected`,
          description: account ? `Connected as ${account}.` : "Your account is now connected.",
        });
      });
      params.delete("social");
      params.delete("platform");
      params.delete("account");
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // If we just returned from OAuth and the backend asked us to pick a Page,
  // open the picker modal with the cached page list.
  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("social") === "pick-page") {
      const platform = params.get("platform") || "";
      const tempToken = params.get("token") || "";
      if (tempToken) {
        try {
          const cached = sessionStorage.getItem(`social_pick_pages_${tempToken}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setPagePicker({
              platform: parsed.platform || platform,
              tempToken,
              pages: parsed.pages || [],
              selectedId: parsed.pages?.[0]?.id || null,
              submitting: false,
            });
          } else {
            toast({
              title: "Page list expired",
              description: "Please click Connect again to choose your Facebook Page.",
              variant: "destructive",
            });
          }
        } catch (_) { /* noop */ }
      }
      params.delete("social");
      params.delete("platform");
      params.delete("token");
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const connFor = (p: string) => connections.find(c => c.platform === p && (c.status === "connected" || c.status === "active"));

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const token = await getActiveToken({ forceRefresh: true });
      if (!token) { toast({ title: "Please sign in again", variant: "destructive" }); return; }
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-connect-start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const submitPagePick = async () => {
    if (!pagePicker?.selectedId) return;
    setPagePicker(p => p ? { ...p, submitting: true } : p);
    try {
      const token = await getActiveToken({ forceRefresh: true });
      if (!token) {
        toast({ title: "Please sign in again", variant: "destructive" });
        return;
      }
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-connect-callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            temp_token: pagePicker.tempToken,
            page_id: pagePicker.selectedId,
            platform: pagePicker.platform,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast({
          title: "Couldn't connect that Page",
          description: data?.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      try { sessionStorage.removeItem(`social_pick_pages_${pagePicker.tempToken}`); } catch (_) {}
      const platformLabel = PLATFORMS.find(p => p.key === pagePicker.platform)?.name || pagePicker.platform;
      setJustConnected({ platform: platformLabel, account: data.account_name || "" });
      setPagePicker(null);
      // Bug 5: notify all open tabs (and this one) that a new social account is live
      try {
        const bc = new BroadcastChannel("social-connect");
        bc.postMessage({ type: "connected", platform: pagePicker.platform, account: data.account_name });
        bc.close();
      } catch (_) {}
      await refresh();
      toast({
        title: `${platformLabel} connected`,
        description: data.account_name ? `Connected as ${data.account_name}.` : "Your account is now connected.",
      });
    } finally {
      setPagePicker(p => p ? { ...p, submitting: false } : p);
    }
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
        {justConnected && (
          <Card className="p-5 border-green-500/40 bg-green-500/5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 min-w-0">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {justConnected.platform} connected{justConnected.account ? ` as ${justConnected.account}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto-posting is enabled. Here's what to do next:
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setJustConnected(null)}>
                Dismiss
              </Button>
            </div>

            {/* Two-step "what's next" */}
            <ol className="space-y-2 ml-8">
              <li className="flex items-start gap-2 text-xs">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-[10px] font-semibold">✓</span>
                <span className="text-muted-foreground line-through">Connect your account</span>
              </li>
              <li className="flex items-start gap-2 text-xs">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary text-[10px] font-semibold">2</span>
                <span>Open your Social Calendar to review, schedule, and publish your posts.</span>
              </li>
            </ol>

            <div className="ml-8 mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => navigate("/dashboard?section=marketing-hub&tab=social-calendar")}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                Open Social Calendar
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}
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

        {/* Sprint 62: Social Media direct-connections removed.
            BP-03 is a copy-paste library now — authors copy captions and download
            graphics from Marketing Hub → Social Calendar and post manually. */}
      </div>

      {/* Facebook Page picker — shown only when the author admins multiple Pages */}
      <Dialog
        open={!!pagePicker}
        onOpenChange={(open) => { if (!open && !pagePicker?.submitting) setPagePicker(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose your Facebook Page</DialogTitle>
            <DialogDescription>
              You admin more than one Page. Pick the one you want Authors Bureau to post to.
            </DialogDescription>
          </DialogHeader>

          {pagePicker && (
            <RadioGroup
              value={pagePicker.selectedId || ""}
              onValueChange={(v) => setPagePicker(p => p ? { ...p, selectedId: v } : p)}
              className="space-y-2 max-h-72 overflow-y-auto"
            >
              {pagePicker.pages.map((pg) => (
                <Label
                  key={pg.id}
                  htmlFor={`pg-${pg.id}`}
                  className="flex items-center gap-3 rounded-md border border-border p-2.5 cursor-pointer hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem id={`pg-${pg.id}`} value={pg.id} />
                  {pg.picture ? (
                    <img src={pg.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Facebook className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{pg.name}</span>
                </Label>
              ))}
            </RadioGroup>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPagePicker(null)}
              disabled={pagePicker?.submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitPagePick}
              disabled={!pagePicker?.selectedId || pagePicker?.submitting}
            >
              {pagePicker?.submitting ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Connecting…</>
              ) : (
                <>Connect this Page</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
