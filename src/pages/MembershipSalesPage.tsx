import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import ComingSoonScreen from "@/components/public/ComingSoonScreen";
import MicrositePoweredByFooter from "@/components/public/MicrositePoweredByFooter";

export default function MembershipSalesPage() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [data, setData] = useState<{
    author_id: string; author_name: string;
    name: string; tagline: string | null; benefits: string[]; sales_copy: Record<string, unknown>;
    monthly_price: number; status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authorMissing, setAuthorMissing] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  useDocumentMeta({ title: data ? `${data.name} | Membership` : "Membership" });

  useEffect(() => {
    (async () => {
      if (!authorSlug) { setAuthorMissing(true); setLoading(false); return; }
      const { data: author } = await supabase
        .from("author_profiles").select("id, pen_name").eq("author_slug", authorSlug).maybeSingle();
      if (!author) { setAuthorMissing(true); setLoading(false); return; }
      setAuthorName(author.pen_name || "");
      const { data: m } = await supabase
        .from("membership_content_public")
        .select("name, tagline, benefits, sales_copy, monthly_price, status")
        .eq("author_id", author.id).maybeSingle();
      if (!m) { setNotFound(true); setLoading(false); return; }
      setData({
        author_id: author.id,
        author_name: author.pen_name ?? "",
        name: m.name,
        tagline: m.tagline,
        benefits: Array.isArray(m.benefits) ? (m.benefits as string[]) : [],
        sales_copy: (m.sales_copy ?? {}) as Record<string, unknown>,
        monthly_price: Number(m.monthly_price ?? 0),
        status: m.status,
      });
      setLoading(false);
    })();
  }, [authorSlug]);

  const handleJoin = async () => {
    if (!data) return;
    setCheckingOut(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { membership_author_id: data.author_id, mode: "subscription" },
      });
      if (error) throw error;
      if (res?.error === "AUTHOR_PAYMENTS_NOT_SET_UP") {
        alert("This author hasn't set up payments yet. Please check back soon.");
        return;
      }
      if (res?.url) window.location.href = res.url;
    } catch (e) {
      console.error(e); alert("Checkout unavailable. Please try again.");
    } finally { setCheckingOut(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (authorMissing) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Author not found.</p></div>;
  if (notFound || !data) return <ComingSoonScreen authorSlug={authorSlug || ""} authorName={authorName} pageLabel="The membership" />;

  // Any post-draft status counts as purchasable.
  const isLive = data.status !== "draft";
  const headline = (data.sales_copy.headline as string) || data.name;
  const subheadline = (data.sales_copy.subheadline as string) || data.tagline;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/${authorSlug}`} className="text-sm font-semibold hover:underline">{data.author_name}</Link>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Membership</span>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">{data.name}</p>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{headline}</h1>
        {subheadline && <p className="text-lg text-muted-foreground">{subheadline}</p>}
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-12">
        <Card><CardContent className="pt-6 space-y-5">
          <div className="text-center">
            <p className="text-4xl font-bold">${data.monthly_price.toFixed(0)}<span className="text-base text-muted-foreground font-normal">/month</span></p>
            <p className="text-xs text-muted-foreground mt-1">Cancel anytime</p>
          </div>
          <ul className="space-y-2">
            {data.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{b}
              </li>
            ))}
          </ul>
          {isLive ? (
            <Button className="w-full" size="lg" onClick={handleJoin} disabled={checkingOut}>
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Now"}
            </Button>
          ) : (
            <Button className="w-full" size="lg" disabled>Coming Soon</Button>
          )}
          <p className="text-[11px] text-center text-muted-foreground">Secure checkout · Stripe</p>
        </CardContent></Card>
      </section>
      <MicrositePoweredByFooter displayName={data?.author_name} />
    </div>
  );
}
