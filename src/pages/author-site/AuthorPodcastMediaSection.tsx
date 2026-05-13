import { motion } from "framer-motion";
import { Mic, Headphones, Rss, ExternalLink } from "lucide-react";
import type { AuthorData, ThemeVars, fadeUp as _fadeUp } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

interface Props {
  author: AuthorData;
  displayName: string;
  theme: AuthorTheme;
  v: ThemeVars;
}

/**
 * Sprint 4 — Podcast & Media block.
 * Two-column navy section reusing podcast URLs already on author_profiles
 * (BA-14 surface). Hidden cleanly when the author has no podcast platforms.
 */
export default function AuthorPodcastMediaSection({ author, displayName, theme, v }: Props) {
  const platforms = [
    author.podcast_spotify_url ? { label: "Spotify", url: author.podcast_spotify_url, icon: Headphones } : null,
    author.podcast_apple_url ? { label: "Apple Podcasts", url: author.podcast_apple_url, icon: Mic } : null,
    author.podcast_rss_url ? { label: "RSS", url: author.podcast_rss_url, icon: Rss } : null,
  ].filter(Boolean) as { label: string; url: string; icon: typeof Mic }[];

  if (platforms.length === 0) return null;

  return (
    <section
      id="podcast-media-section"
      className="py-14 md:py-20"
      style={{
        background: v.primary,
        backgroundImage: `radial-gradient(ellipse at 70% 30%, ${v.accent}0D 0%, transparent 70%)`,
      }}
    >
      <div className="container max-w-5xl">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span
              className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-[0.12em]"
              style={{ background: v.accent, color: v.accentText }}
            >
              <Mic className="h-3 w-3" /> Podcast
            </span>
            <h2
              className="text-2xl md:text-[2rem] font-bold mb-3"
              style={{ color: v.primaryText, fontFamily: theme.headingFont }}
            >
              Listen to {displayName} on the go
            </h2>
            <p className="text-base mb-6 leading-relaxed" style={{ color: `${v.primaryText}D9` }}>
              Subscribe wherever you listen. New episodes drop regularly with conversations,
              frameworks, and behind-the-scenes stories from the work.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="flex flex-col gap-3"
          >
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <a
                  key={p.label}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-3 rounded-lg px-5 py-4 transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${v.accent}55`,
                    color: v.primaryText,
                  }}
                >
                  <span className="inline-flex items-center gap-3">
                    <Icon className="h-5 w-5" style={{ color: v.accent }} />
                    <span className="font-semibold">{p.label}</span>
                  </span>
                  <ExternalLink className="h-4 w-4" style={{ color: `${v.primaryText}99` }} />
                </a>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
