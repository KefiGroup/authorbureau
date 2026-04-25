import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Mic } from "lucide-react";
import type { AuthorData, ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import { stripHtml } from "@/lib/stripHtml";
import type { LiveNode } from "./AuthorLeadMagnetsSection";

interface Props {
  author: AuthorData;
  displayName: string;
  podcastNodes?: LiveNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorAboutSection({ author, displayName, podcastNodes = [], theme, v }: Props) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioText = stripHtml(author.bio_long || author.bio_short || "");
  const hasPodcastStreams = !!(author.podcast_spotify_url || author.podcast_apple_url || author.podcast_rss_url);
  if (!bioText && podcastNodes.length === 0 && !hasPodcastStreams) return null;

  const bioParagraphs = bioText.split(/\n\n+/).filter(Boolean);
  const displayBioParagraphs = bioParagraphs.length > 2 && !bioExpanded ? bioParagraphs.slice(0, 2) : bioParagraphs;
  const genres = author.genres || [];

  return (
    <section id="about" className="py-14 md:py-20" style={{ background: v.cardBg }}>
      <div className="container max-w-4xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl md:text-[2rem] font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
            About {displayName}
          </h2>
          <div className="text-base space-y-4" style={{ color: v.bodyText, lineHeight: 1.7 }}>
            {!bioExpanded && author.bio_short ? (
              <p>{stripHtml(author.bio_short)}</p>
            ) : (
              displayBioParagraphs.map((p, i) => <p key={i}>{p}</p>)
            )}
          </div>
          {author.bio_long && author.bio_short && (
            <button onClick={() => setBioExpanded(!bioExpanded)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold transition-colors" style={{ color: v.accent }}>
              {bioExpanded ? "Show Less" : "Read More"}
              <ChevronDown className={`h-4 w-4 transition-transform ${bioExpanded ? "rotate-180" : ""}`} />
            </button>
          )}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {genres.map((g, i) => (
                <span key={i} className="px-3 py-1.5 text-xs font-medium rounded-full"
                  style={{ background: v.secondaryBg, color: v.bodyText, border: `1px solid ${v.accent}` }}>{g}</span>
              ))}
            </div>
          )}

          {/* Podcast section — shows when author has podcast nodes OR has linked external streaming */}
          {(podcastNodes.length > 0 || hasPodcastStreams) && (
            <div className="mt-10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                <Mic className="h-5 w-5" style={{ color: v.accent }} /> Podcast
              </h3>

              {/* Streaming service buttons (author-level) */}
              {(author.podcast_spotify_url || author.podcast_apple_url || author.podcast_rss_url) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {author.podcast_spotify_url && (
                    <a href={author.podcast_spotify_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: v.accent, color: v.accentText }}>
                      Listen on Spotify
                    </a>
                  )}
                  {author.podcast_apple_url && (
                    <a href={author.podcast_apple_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: v.accent, color: v.accentText }}>
                      Apple Podcasts
                    </a>
                  )}
                  {author.podcast_rss_url && (
                    <a href={author.podcast_rss_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:scale-105"
                      style={{ borderColor: v.accent, color: v.accent, background: "transparent" }}>
                      RSS Feed
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {podcastNodes.map(node => {
                  const title = node.personalised_name || node.node_name;
                  const embedUrl = node.content_json?.embed_url as string | undefined;
                  const linkUrl = node.third_party_url || node.content_json?.link as string | undefined;
                  const desc = node.content_json?.description as string | undefined;

                  return (
                    <div key={node.node_id} className="rounded-xl p-5" style={{ background: v.secondaryBg, border: `1px solid ${v.cardBorder}` }}>
                      <h4 className="font-bold text-base mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{title}</h4>
                      {desc && <p className="text-sm mb-3 line-clamp-2" style={{ color: v.bodyText }}>{desc}</p>}
                      {embedUrl && (
                        <iframe
                          src={embedUrl}
                          className="w-full rounded-lg"
                          height="152"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          style={{ border: "none" }}
                        />
                      )}
                      {!embedUrl && linkUrl && (
                        <a href={linkUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: v.accent }}>
                          Listen Now →
                        </a>
                      )}
                    </div>
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
