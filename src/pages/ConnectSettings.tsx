import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CreditCard, Sparkles, CheckCircle2, AlertCircle, Loader2,
  Share2, Linkedin, Instagram, Facebook, Twitter,
} from "lucide-react";

const PLATFORMS = [
  { key: "linkedin", name: "LinkedIn", Icon: Linkedin },
  { key: "instagram", name: "Instagram", Icon: Instagram },
  { key: "facebook", name: "Facebook", Icon: Facebook },
  { key: "x", name: "X (Twitter)", Icon: Twitter },
] as const;

export default function ConnectSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, stripe_connected_account_id, stripe_onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      setStripeConnected(!!profile?.stripe_onboarding_complete);
      setLoading(false);
    })();
  }, [user?.id]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

        {/* Social Media — native */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">Social Media</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">Native</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                ABBY generates a 20-post Social Media Kit for you. Posts live in your Social Calendar — copy each one, post it on the platform, and click <strong>Mark as Posted</strong>. No external scheduler required.
              </p>
              <div className="space-y-2 mb-4">
                {PLATFORMS.map(({ key, name, Icon }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Manual posting
                    </Badge>
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={() => navigate("/dashboard?section=marketing-hub&tab=social-calendar")}>
                Open Social Calendar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
