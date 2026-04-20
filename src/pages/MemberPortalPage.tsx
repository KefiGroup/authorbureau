import { useEffect, useState } from "react";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MemberPortalPage() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "noaccess" }
    | { kind: "active"; sub: { id: string; name: string; price: number; current_period_end: string | null }; welcomeEmails: { subject: string; body: string }[] }
  >({ kind: "loading" });
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !authorSlug) return;
    (async () => {
      const { data: author } = await supabase
        .from("author_profiles").select("id, pen_name").eq("author_slug", authorSlug).maybeSingle();
      if (!author) { setState({ kind: "noaccess" }); return; }
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, status, price_usd, current_period_end")
        .eq("author_id", author.id)
        .or(`subscriber_user_id.eq.${user.id},subscriber_email.eq.${user.email}`)
        .in("status", ["active", "trialing", "cancelling"])
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();
      if (!sub) { setState({ kind: "noaccess" }); return; }
      const { data: m } = await supabase
        .from("membership_content").select("name, welcome_emails").eq("author_id", author.id).maybeSingle();
      setState({
        kind: "active",
        sub: { id: sub.id, name: m?.name ?? "Membership", price: Number(sub.price_usd ?? 0), current_period_end: sub.current_period_end },
        welcomeEmails: Array.isArray(m?.welcome_emails) ? (m!.welcome_emails as { subject: string; body: string }[]) : [],
      });
    })();
  }, [authLoading, user, authorSlug]);

  const handleCancel = async () => {
    if (state.kind !== "active") return;
    if (!confirm("Cancel your membership? You'll keep access until the end of the current period.")) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { subscription_id: state.sub.id },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message);
      toast.success("Membership cancellation scheduled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancellation failed");
    } finally { setCancelling(false); }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname);
    return <Navigate to={`/readers-bureau/auth?redirect=${returnTo}`} replace />;
  }
  if (state.kind === "loading") return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (state.kind === "noaccess") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">You're not a member yet</h1>
          <p className="text-sm text-muted-foreground">Sign up to get inside.</p>
          <a href={`/${authorSlug}/members`} className="text-primary hover:underline text-sm">View membership →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="font-semibold text-sm">{state.sub.name}</p>
          <span className="text-xs text-muted-foreground">Member Portal</span>
        </div>
      </header>
      <section className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <Card><CardContent className="pt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Welcome</p>
          <h1 className="text-2xl font-bold">You're in.</h1>
          <p className="text-sm text-muted-foreground">${state.sub.price.toFixed(2)}/month{state.sub.current_period_end ? ` · Next billing: ${new Date(state.sub.current_period_end).toLocaleDateString()}` : ""}</p>
        </CardContent></Card>

        {state.welcomeEmails.length > 0 && (
          <Card><CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-bold">Your welcome series</h2>
            {state.welcomeEmails.map((e, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3 space-y-1">
                <p className="text-sm font-semibold">{e.subject}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{e.body}</p>
              </div>
            ))}
          </CardContent></Card>
        )}

        <Card><CardContent className="pt-6 space-y-3">
          <h2 className="text-lg font-bold">Community & Q&A</h2>
          <p className="text-sm text-muted-foreground">Live community space coming soon.</p>
        </CardContent></Card>

        <Card><CardContent className="pt-6 space-y-3">
          <h2 className="text-lg font-bold">Manage membership</h2>
          <Button variant="outline" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel membership"}
          </Button>
          <p className="text-[11px] text-muted-foreground">Cancellation takes effect at the end of your current billing period.</p>
        </CardContent></Card>
      </section>
    </div>
  );
}
