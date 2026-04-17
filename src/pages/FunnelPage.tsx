import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Funnel {
  id: string;
  title: string;
  headline: string;
  subheadline: string | null;
  body_copy: string | null;
  cta_text: string;
  cta_url: string | null;
  hero_image_url: string | null;
  background_color: string;
  accent_color: string;
  author_name?: string | null;
}

interface FunnelPageProps {
  funnel: Funnel;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function FunnelPage({ funnel }: FunnelPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track view once
  useEffect(() => {
    fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/track-funnel-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ funnel_id: funnel.id }),
    }).catch(() => {});
  }, [funnel.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const params = new URLSearchParams(window.location.search);
    const utm = {
      source: params.get("utm_source"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      term: params.get("utm_term"),
      content: params.get("utm_content"),
    };

    try {
      const res = await fetch(
        `https://${PROJECT_ID}.supabase.co/functions/v1/submit-funnel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({ funnel_id: funnel.id, email, name, utm }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const bg = funnel.background_color || "#0B1220";
  const accent = funnel.accent_color || "#D4AF37";

  useEffect(() => {
    document.title = funnel.headline.slice(0, 60);
  }, [funnel.headline]);

  return (
    <>
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: bg, color: "#F8FAFC" }}
      >
        <header className="px-6 py-5 border-b border-white/10">
          <div className="max-w-4xl mx-auto text-sm font-medium" style={{ color: accent }}>
            {funnel.author_name || "Authors Bureau"}
          </div>
        </header>

        <main className="flex-1 px-6 py-12 md:py-20">
          <div className="max-w-2xl mx-auto text-center">
            {funnel.hero_image_url && (
              <img
                src={funnel.hero_image_url}
                alt=""
                className="mx-auto mb-8 max-h-64 rounded-lg shadow-2xl"
              />
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
              {funnel.headline}
            </h1>
            {funnel.subheadline && (
              <p className="text-lg md:text-xl mb-6 opacity-85">{funnel.subheadline}</p>
            )}
            {funnel.body_copy && (
              <div className="text-base opacity-80 mb-10 whitespace-pre-line text-left md:text-center">
                {funnel.body_copy}
              </div>
            )}

            {success ? (
              <div
                className="rounded-xl p-8 border"
                style={{ borderColor: accent, backgroundColor: "rgba(255,255,255,0.04)" }}
              >
                <h2 className="text-2xl font-semibold mb-2" style={{ color: accent }}>
                  You're in!
                </h2>
                <p className="opacity-85">Check your inbox in the next few minutes.</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-xl p-6 md:p-8 border text-left max-w-md mx-auto"
                style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white">First name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-white">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  {error && <p className="text-sm text-red-300">{error}</p>}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full font-semibold text-base py-6"
                    style={{ backgroundColor: accent, color: "#0B1220" }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : funnel.cta_text}
                  </Button>
                  <p className="text-xs opacity-60 text-center">
                    We respect your privacy. Unsubscribe anytime.
                  </p>
                </div>
              </form>
            )}
          </div>
        </main>

        <footer className="px-6 py-6 border-t border-white/10 text-center text-xs opacity-60">
          Powered by <span style={{ color: accent }}>Authors Bureau</span>
        </footer>
      </div>
    </>
  );
}
