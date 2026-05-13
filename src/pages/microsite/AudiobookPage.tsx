/**
 * AudiobookPage (BA-11) — dedicated public microsite for an author's audiobook.
 *
 * Replaces the GenericPage fallback for BA-11 with an editorial, audio-first layout:
 *   1. Hero (cover + title + meta strip + channel chips + Play / Buy)
 *   2. Listen-now band (AudiobookPreviewPlayer at full width)
 *   3. Editorial body (intro pull-quote + parsed bullet highlights)
 *   4. SUCKCESS-style framework chips (auto-detected from description)
 *   5. "Who this audiobook is for" checklist
 *   6. Narrator card
 *   7. Final buy panel
 *
 * Reads from existing content_json — no new DB fields. Empty sections hide cleanly.
 */
import { Headphones, Play, BookOpen, Clock, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BuyNowButton from "@/components/commerce/BuyNowButton";
import AudiobookPreviewPlayer from "@/components/microsite/AudiobookPreviewPlayer";
import { stripHtml } from "@/lib/stripHtml";

interface Props {
  data: any;
  content: any;
  v: any;
  hFont: string;
  bgColor: string;
}

interface Highlight { title: string; body: string }
interface FrameworkChip { letter: string; label: string }
interface Parsed {
  intro: string;
  highlights: Highlight[];
  framework: FrameworkChip[];
  audience: string[];
  closing: string;
}

/* ─────────────────────── description parser ─────────────────────── */
function parseAudiobookDescription(raw: string): Parsed {
  const text = stripHtml(raw || "").replace(/\r/g, "").trim();
  if (!text) return { intro: "", highlights: [], framework: [], audience: [], closing: "" };

  // Split on bullet (•) and check (✔) markers but keep them.
  const bulletIdx = text.indexOf("•");
  const checkIdx = text.indexOf("✔");

  const introEnd = [bulletIdx, checkIdx].filter(i => i >= 0).sort((a, b) => a - b)[0];
  const introRaw = (introEnd != null && introEnd > 0 ? text.slice(0, introEnd) : text).trim();
  const intro = introRaw
    .replace(/Inside this (?:book|audiobook),?\s*you\s*will\s*discover:?$/i, "")
    .replace(/[⭐★]\s*$/g, "")
    .trim();

  // Highlights — every "• heading\nbody" block.
  const highlights: Highlight[] = [];
  const bulletRegex = /•\s*([^\n•✔]+)(?:\n([^•✔]+))?/g;
  let m: RegExpExecArray | null;
  while ((m = bulletRegex.exec(text)) !== null) {
    const title = m[1].trim().replace(/[⭐★]/g, "").trim();
    const body = (m[2] || "").trim();
    if (title) highlights.push({ title, body });
  }

  // Framework — look for runs of "X, Label" lines (≥ 4 in a row).
  const framework: FrameworkChip[] = [];
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  let run: FrameworkChip[] = [];
  for (const line of lines) {
    const fm = /^([A-Z])\s*[,:\-]\s*(.+)$/.exec(line);
    if (fm && fm[2].length < 60) {
      run.push({ letter: fm[1], label: fm[2].trim() });
    } else {
      if (run.length >= 4 && framework.length === 0) framework.push(...run);
      run = [];
    }
  }
  if (run.length >= 4 && framework.length === 0) framework.push(...run);

  // Audience — every line starting with ✔
  const audience: string[] = [];
  const audRegex = /✔\s*([^\n✔]+)/g;
  while ((m = audRegex.exec(text)) !== null) {
    const a = m[1].trim();
    if (a) audience.push(a);
  }

  // Closing — last paragraph after the final ✔ line, if any.
  let closing = "";
  const lastCheck = text.lastIndexOf("✔");
  if (lastCheck >= 0) {
    const tail = text.slice(lastCheck);
    const afterNewline = tail.split(/\n/).slice(1).join("\n").trim();
    closing = afterNewline.replace(/^[⭐★\s]+/, "").replace(/[⭐★]$/g, "").trim();
  }

  // Strip framework rows from highlights (the SUCKCESS bullet usually contains them inline).
  if (framework.length > 0) {
    for (const h of highlights) {
      h.body = h.body
        .split(/\n+/)
        .filter(l => !/^[A-Z]\s*[,:\-]\s*/.test(l.trim()))
        .join(" ")
        .trim();
    }
  }

  return { intro, highlights, framework, audience, closing };
}

/* ─────────────────────── channel chip glyphs ─────────────────────── */
const CHANNEL_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple: "Apple Books",
  audible: "Audible",
  acx: "Audible",
  google: "Google Play",
  platform: "Web Player",
};

function ChannelChips({ channels, accent, cardBg, cardBorder, bodyText }: {
  channels: string[]; accent: string; cardBg: string; cardBorder: string; bodyText: string;
}) {
  const seen = new Set<string>();
  const items = channels
    .map(c => String(c).toLowerCase().trim())
    .filter(c => CHANNEL_LABELS[c] && !seen.has(CHANNEL_LABELS[c]) && (seen.add(CHANNEL_LABELS[c]) || true));
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(c => (
        <span
          key={c}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full"
          style={{ background: cardBg, color: bodyText, border: `1px solid ${cardBorder}` }}
        >
          <Headphones className="h-3 w-3" style={{ color: accent }} /> {CHANNEL_LABELS[c]}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────── component ─────────────────────── */
export default function AudiobookPage({ data, content, v, hFont, bgColor }: Props) {
  const node = data.node || {};
  const book = data.book || {};

  const title = String(content.headline || node.personalised_name || `${book.title || "Audiobook"}, Audiobook Edition`);
  const subhead = String(content.subheadline || "").trim();
  const narrator = String(content.narrator_credit || "").trim();
  const chapterCount = Number(content.chapter_count) || (Array.isArray(content.chapters) ? content.chapters.length : 0);
  const channels: string[] = Array.isArray(content.channels) ? content.channels : [];
  const price = content.price != null ? String(content.price) : null;
  const ctaText = String(content.cta_text || "Buy Audiobook");
  const cover = book.cover_image_url || content.cover_image_url || null;
  const studio = (content.studio && typeof content.studio === "object") ? content.studio : {};
  const mood = String(studio?.setup?.narration || "").replace(/-/g, " ").trim();

  const parsed = parseAudiobookDescription(content.description || "");

  // Estimated runtime ~ 9 min/chapter (roughly 1500 words), shown as a soft hint only.
  const estHours = chapterCount > 0 ? Math.max(1, Math.round((chapterCount * 9) / 60)) : 0;

  const heroBg = `linear-gradient(180deg, ${v.cardBg} 0%, ${bgColor} 100%)`;

  const hasPlayer = Boolean(content.preview_url || node.delivery_url || (Array.isArray(content.chapter_urls) && content.chapter_urls.length));

  return (
    <div className="w-full">
      {/* ═══════ 1 · HERO ═══════ */}
      <section className="relative" style={{ background: heroBg }}>
        <div className="container max-w-6xl px-4 py-12 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] gap-10 items-center">
            <div className="space-y-5 order-2 md:order-1">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full"
                style={{ background: `${v.accent}1a`, color: v.accent, border: `1px solid ${v.accent}40` }}
              >
                <Headphones className="h-3 w-3" /> Audiobook Edition
              </span>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
                style={{ color: v.headingText, fontFamily: hFont }}
              >
                {title}
              </h1>
              {subhead && (
                <p className="text-lg leading-relaxed" style={{ color: v.bodyText }}>{subhead}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: v.mutedText }}>
                {chapterCount > 0 && (
                  <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {chapterCount} chapters</span>
                )}
                {estHours > 0 && (
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> ~{estHours}h listen</span>
                )}
                {narrator && (
                  <span className="inline-flex items-center gap-1.5"><Headphones className="h-4 w-4" /> Narrated by {narrator}</span>
                )}
              </div>

              <ChannelChips channels={channels} accent={v.accent} cardBg={v.cardBg} cardBorder={v.cardBorder} bodyText={v.bodyText} />

              <div className="flex flex-wrap gap-3 pt-2">
                {hasPlayer && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6"
                    style={{ borderColor: v.accent, color: v.accent }}
                    onClick={() => {
                      const el = document.getElementById("audiobook-listen-band");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" /> Play Sample
                  </Button>
                )}
                {node.id && (
                  <BuyNowButton
                    authorNodeId={node.id}
                    authorId={data.author?.id}
                    fallbackUrl={node.payment_link || content.stripe_checkout_url || null}
                    label={price ? `${ctaText} · $${price}` : ctaText}
                    className="rounded-full px-7 py-3 font-semibold"
                    style={{ background: v.accent, color: v.accentText || bgColor }}
                  />
                )}
              </div>
            </div>

            {cover && (
              <div className="order-1 md:order-2 flex justify-center">
                <div className="relative">
                  <div
                    className="absolute inset-0 -z-10 blur-2xl opacity-30 rounded-2xl"
                    style={{ background: v.accent }}
                  />
                  <img
                    src={cover}
                    alt={`${book.title || title} audiobook cover`}
                    className="w-full max-w-[280px] md:max-w-none rounded-2xl shadow-2xl rotate-[-2deg] transition-transform hover:rotate-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ 2 · LISTEN-NOW BAND ═══════ */}
      {hasPlayer && (
        <section id="audiobook-listen-band" className="py-12 sm:py-16" style={{ background: v.cardBg }}>
          <div className="container max-w-3xl px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
                Hear the first chapter, free
              </h2>
              <p className="mt-2 text-sm" style={{ color: v.mutedText }}>
                Press play below. {chapterCount > 1 ? `Unlock all ${chapterCount} chapters when you buy.` : "Unlock the full audiobook when you buy."}
              </p>
            </div>
            <AudiobookPreviewPlayer
              chapters={Array.isArray(content.chapters) ? content.chapters : undefined}
              chapterUrls={Array.isArray(content.chapter_urls) ? content.chapter_urls : undefined}
              previewUrl={content.preview_url || node.delivery_url || null}
              freeChapterCount={1}
              accent={v.accent}
              cardBg={bgColor}
              cardBorder={v.cardBorder}
              headingText={v.headingText}
              bodyText={v.bodyText}
              mutedText={v.mutedText}
            />
          </div>
        </section>
      )}

      {/* ═══════ 3 · EDITORIAL BODY ═══════ */}
      {(parsed.intro || parsed.highlights.length > 0) && (
        <section className="py-14 sm:py-20">
          <div className="container max-w-3xl px-4 space-y-12">
            {parsed.intro && (
              <p
                className="text-xl sm:text-2xl leading-relaxed italic"
                style={{ color: v.headingText, fontFamily: hFont }}
              >
                {parsed.intro}
              </p>
            )}

            {parsed.highlights.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
                  Inside this audiobook, you'll hear
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {parsed.highlights.map((h, i) => (
                    <Card
                      key={i}
                      className="p-5"
                      style={{ background: v.cardBg, borderColor: v.cardBorder }}
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                        <div className="space-y-1.5">
                          <h3 className="font-semibold leading-snug" style={{ color: v.headingText }}>{h.title}</h3>
                          {h.body && <p className="text-sm leading-relaxed" style={{ color: v.bodyText }}>{h.body}</p>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════ 4 · FRAMEWORK CHIPS ═══════ */}
      {parsed.framework.length >= 4 && (
        <section className="py-14 sm:py-20" style={{ background: v.cardBg }}>
          <div className="container max-w-4xl px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>
              The Framework You'll Walk Away With
            </h2>
            <p className="text-sm mb-10" style={{ color: v.mutedText }}>
              A simple, repeatable map across every chapter.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {parsed.framework.map((f, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl"
                  style={{ background: bgColor, border: `1px solid ${v.cardBorder}` }}
                >
                  <div
                    className="w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-2"
                    style={{ background: `${v.accent}1a`, color: v.accent, border: `1px solid ${v.accent}40` }}
                  >
                    {f.letter}
                  </div>
                  <p className="text-xs leading-snug font-medium" style={{ color: v.headingText }}>{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ 5 · WHO THIS IS FOR ═══════ */}
      {parsed.audience.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="container max-w-3xl px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10" style={{ color: v.headingText, fontFamily: hFont }}>
              Who this audiobook is for
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {parsed.audience.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                  <span className="text-base leading-relaxed" style={{ color: v.bodyText }}>{a}</span>
                </li>
              ))}
            </ul>
            {parsed.closing && (
              <p
                className="mt-12 text-center text-xl sm:text-2xl leading-relaxed italic"
                style={{ color: v.headingText, fontFamily: hFont }}
              >
                {parsed.closing}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ═══════ 6 · NARRATOR CARD ═══════ */}
      {narrator && (
        <section className="py-12" style={{ background: v.cardBg }}>
          <div className="container max-w-2xl px-4">
            <Card className="p-6 flex items-start gap-4" style={{ background: bgColor, borderColor: v.cardBorder }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${v.accent}1a`, color: v.accent }}
              >
                <Headphones className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold" style={{ color: v.headingText }}>Narrated by {narrator}</h3>
                {mood && (
                  <p className="text-sm capitalize" style={{ color: v.mutedText }}>Tone: {mood}</p>
                )}
                {/^.*ai.*voice.*$/i.test(narrator) && (
                  <p className="text-xs" style={{ color: v.mutedText }}>
                    Produced with a studio-grade AI voice for consistent, distraction-free listening.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* ═══════ 7 · FINAL BUY PANEL ═══════ */}
      {node.id && (
        <section className="py-16 sm:py-20">
          <div className="container max-w-xl px-4 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
              Start listening today
            </h2>
            {price && (
              <p className="text-5xl font-bold" style={{ color: v.accent, fontFamily: hFont }}>${price}</p>
            )}
            <ul className="text-sm space-y-2 max-w-xs mx-auto text-left" style={{ color: v.bodyText }}>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" style={{ color: v.accent }} /> Lifetime access — yours to keep</li>
              <li className="flex items-center gap-2"><Headphones className="h-4 w-4 shrink-0" style={{ color: v.accent }} /> Listen on any device, anywhere</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: v.accent }} /> Instant delivery after purchase</li>
            </ul>
            <BuyNowButton
              authorNodeId={node.id}
              authorId={data.author?.id}
              fallbackUrl={node.payment_link || content.stripe_checkout_url || null}
              label={ctaText}
              className="rounded-full px-10 py-3.5 text-base font-semibold"
              style={{ background: v.accent, color: v.accentText || bgColor }}
            />
            <p className="text-xs pt-2" style={{ color: v.mutedText }}>
              By buying you agree to our <a href="/reader-terms-of-sale" className="underline">Terms of Sale</a> and <a href="/privacy-policy" className="underline">Privacy Policy</a>.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
