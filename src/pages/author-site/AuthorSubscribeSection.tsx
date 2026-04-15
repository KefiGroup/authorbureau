import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AuthorData, ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import type { LiveNode } from "./AuthorLeadMagnetsSection";

interface Props {
  author: AuthorData;
  authorSlug: string;
  displayName: string;
  affiliateNodes?: LiveNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorSubscribeSection({ author, authorSlug, displayName, affiliateNodes = [], theme, v }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    setSubscribing(true);

    await supabase.functions.invoke("crm-auto-capture", {
      body: {
        email: email.trim(), name: name.trim(), source: "subscribe_form",
        source_detail: `author_homepage: ${authorSlug}${subMessage.trim() ? ` | Message: ${subMessage.trim().slice(0, 200)}` : ""}`,
        author_id: author.user_id, message: subMessage.trim() || undefined,
      },
    });

    const { error } = await supabase.from("author_subscribers").upsert({
      author_id: author.user_id, email: email.trim().toLowerCase(), name: name.trim(),
      source: "author_homepage", source_detail: authorSlug, status: "active",
    }, { onConflict: "author_id,email" });
    setSubscribing(false);
    if (error) {
      toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
    } else {
      setSubscribed(true);
      toast({ title: "Subscribed!", description: `You'll hear from ${displayName} soon.` });
      setEmail(""); setName(""); setSubMessage("");
    }
  }

  const inputStyle = { borderRadius: "8px", border: `2px solid ${v.cardBorder}`, padding: "14px 16px", background: v.cardBg, color: v.headingText };

  return (
    <section id="subscribe-section" className="relative py-14 md:py-20" style={{ background: v.secondaryBg }}>
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: v.accent }} />
      <div className="container max-w-xl text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          {subscribed ? (
            <div className="py-6">
              <Mail className="h-12 w-12 mx-auto mb-4" style={{ color: v.accent }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>You're subscribed!</h3>
              <p className="text-sm" style={{ color: v.bodyText }}>You'll hear from {displayName} soon.</p>
            </div>
          ) : (
            <>
              <Mail className="h-12 w-12 mx-auto mb-4" style={{ color: v.accent }} />
              <h2 className="text-[1.75rem] md:text-3xl font-bold mb-3" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                Stay Connected with {displayName}
              </h2>
              <p className="text-base mb-8" style={{ color: v.bodyText }}>
                Get exclusive updates, early access to new products, and insights from {displayName}.
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3 max-w-md mx-auto">
                <input type="text" placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)}
                  required className="h-12 text-base w-full outline-none" style={inputStyle} />
                <input type="email" placeholder="your@email.com *" value={email} onChange={(e) => setEmail(e.target.value)}
                  required className="h-12 text-base w-full outline-none" style={inputStyle} />
                <textarea placeholder="Message (optional)" value={subMessage} onChange={(e) => setSubMessage(e.target.value)}
                  maxLength={2000} rows={3} className="text-base w-full outline-none resize-none" style={inputStyle} />
                <button type="submit" disabled={subscribing}
                  className="w-full h-12 font-bold text-base transition-all hover:brightness-110"
                  style={{ background: v.accent, color: v.accentText, borderRadius: "8px", padding: "14px" }}>
                  {subscribing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Subscribe"}
                </button>
              </form>
              <p className="text-xs mt-4" style={{ color: v.mutedText, fontSize: "0.8rem" }}>
                We respect your privacy. Unsubscribe anytime.
              </p>

              {/* Affiliate links (BA-16) */}
              {affiliateNodes.length > 0 && (
                <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${v.cardBorder}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: v.mutedText }}>
                    Recommended Resources
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {affiliateNodes.map(node => {
                      const title = node.personalised_name || node.node_name;
                      const linkUrl = node.third_party_url || node.payment_link || "#";
                      return (
                        <a key={node.node_id} href={linkUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all hover:brightness-110"
                          style={{ background: `${v.accent}15`, color: v.accent, border: `1px solid ${v.accent}30` }}>
                          {title} <ExternalLink className="h-3 w-3" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
