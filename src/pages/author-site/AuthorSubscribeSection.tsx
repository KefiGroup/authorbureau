import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const meta = (user?.user_metadata || {}) as Record<string, unknown>;
  const initialName = (meta.full_name as string) || (meta.name as string) || "";
  const initialEmail = user?.email || "";
  return (
    <section id="subscribe-section" className="relative py-14 md:py-20" style={{ background: v.secondaryBg }}>
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: v.accent }} />
      <div className="container max-w-xl text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <div className="text-left mx-auto max-w-md">
            <LeadCaptureForm
              authorUserId={author.user_id}
              displayName={displayName}
              source="author_homepage"
              sourceDetail={authorSlug}
              headline={`Get the ${displayName} Starter Kit — Free`}
              description={`Join the readers and get ${displayName}'s framework guide, delivered instantly.`}
              showMessage={false}
              redirectTo={`/${authorSlug}/thank-you`}
              initialName={initialName}
              initialEmail={initialEmail}
              accent={v.accent}
              accentText={v.accentText}
              primaryText={v.headingText}
              bodyText={v.bodyText}
              cardBg={v.cardBg}
              cardBorder={v.cardBorder}
            />
          </div>
          <p className="text-xs mt-4" style={{ color: v.mutedText, fontSize: "0.8rem" }}>
            No spam. Unsubscribe anytime. Your kit arrives in 2 minutes.
          </p>

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
        </motion.div>
      </div>
    </section>
  );
}

