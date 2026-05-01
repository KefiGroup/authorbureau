/**
 * Sprint 55 — TXT compilation builders for the BP-week nodes that don't
 * (yet) emit a native DOCX/PPTX. These produce a single human-readable
 * `.txt` blob the author can download from their library.
 *
 * Each function is intentionally tolerant: missing keys produce empty
 * sections rather than throwing, so a partially-edited content_json
 * still yields a useful download.
 */

function safe(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}
function joinNonEmpty(lines: string[]): string {
  return lines.filter((l) => l && l.trim().length).join("\n");
}
function divider(label: string): string {
  return `\n\n${"═".repeat(60)}\n${label.toUpperCase()}\n${"═".repeat(60)}\n`;
}

/** BP-01 Email Marketing — welcome sequence + lead-magnet offer + first broadcast. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBp01Txt(content: any, authorName: string, bookTitle: string): Blob {
  const c = content || {};
  const out: string[] = [];
  out.push(`EMAIL MARKETING KIT`);
  out.push(`${authorName} · ${bookTitle}`);
  out.push(`Generated ${new Date().toLocaleDateString()}`);

  if (c.lead_magnet_offer) {
    out.push(divider("Lead Magnet Offer"));
    out.push(`Title: ${safe(c.lead_magnet_offer.title)}`);
    out.push(`Description: ${safe(c.lead_magnet_offer.description)}`);
    out.push(`CTA: ${safe(c.lead_magnet_offer.cta_text)}`);
  }

  const seq = Array.isArray(c.welcome_sequence) ? c.welcome_sequence : [];
  if (seq.length) {
    out.push(divider("Welcome Sequence"));
    seq.forEach((email: any, i: number) => {
      const day = email?.send_delay_days ?? i;
      out.push(`\n— Email ${i + 1} (Day ${day}) —`);
      out.push(`Subject: ${safe(email?.subject)}`);
      if (safe(email?.preview_text)) out.push(`Preview: ${safe(email.preview_text)}`);
      out.push("");
      out.push(safe(email?.body));
      if (safe(email?.cta_text)) out.push(`\n[CTA] ${safe(email.cta_text)}`);
    });
  }

  if (c.first_broadcast) {
    out.push(divider("First Broadcast"));
    out.push(`Subject: ${safe(c.first_broadcast.subject)}`);
    if (safe(c.first_broadcast.preview_text)) out.push(`Preview: ${safe(c.first_broadcast.preview_text)}`);
    out.push("");
    out.push(safe(c.first_broadcast.body));
    if (safe(c.first_broadcast.cta_text)) out.push(`\n[CTA] ${safe(c.first_broadcast.cta_text)}`);
  }

  return new Blob([joinNonEmpty(out)], { type: "text/plain" });
}

/** BP-03 Social Media Kit — flatten posts and outreach. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBp03Txt(content: any, authorName: string, bookTitle: string): Blob {
  const c = content || {};
  const out: string[] = [];
  out.push(`SOCIAL MEDIA KIT`);
  out.push(`${authorName} · ${bookTitle}`);
  out.push(`Generated ${new Date().toLocaleDateString()}`);

  const posts = Array.isArray(c.posts) ? c.posts : [];
  if (posts.length) {
    out.push(divider("Posts"));
    posts.forEach((p: any, i: number) => {
      out.push(`\n— Post ${i + 1} · ${safe(p?.platform) || "platform"} · day ${p?.day ?? "?"} —`);
      if (safe(p?.post_type)) out.push(`Type: ${safe(p.post_type)}`);
      out.push("");
      out.push(safe(p?.caption));
      if (Array.isArray(p?.hashtags) && p.hashtags.length) {
        out.push(`\n${p.hashtags.map((h: string) => `#${h}`).join(" ")}`);
      }
    });
  }

  const outreach = Array.isArray(c.outreach_kit) ? c.outreach_kit : [];
  if (outreach.length) {
    out.push(divider("Outreach Kit"));
    outreach.forEach((o: any, i: number) => {
      out.push(`\n— Template ${i + 1} —`);
      if (safe(o?.title)) out.push(`Title: ${safe(o.title)}`);
      if (safe(o?.subject)) out.push(`Subject: ${safe(o.subject)}`);
      out.push("");
      out.push(safe(o?.body || o?.message || ""));
    });
  }

  return new Blob([joinNonEmpty(out)], { type: "text/plain" });
}

/** BP-09 Live Audience Toolkit — workshop, signing, corporate, shared. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBp09Txt(content: any, authorName: string, bookTitle: string): Blob {
  const c = content || {};
  const out: string[] = [];
  out.push(`LIVE AUDIENCE TOOLKIT`);
  out.push(`${authorName} · ${bookTitle}`);
  if (safe(c.kit_title)) out.push(safe(c.kit_title));
  if (safe(c.tagline)) out.push(`"${safe(c.tagline)}"`);
  out.push(`Generated ${new Date().toLocaleDateString()}`);

  const ws = c.workshop || {};
  if (Object.keys(ws).length) {
    out.push(divider("Workshop"));
    if (safe(ws.title)) out.push(`Title: ${safe(ws.title)}`);
    if (safe(ws.hook)) out.push(`Hook: ${safe(ws.hook)}`);
    if (safe(ws.outline)) out.push(`\nOutline:\n${safe(ws.outline)}`);
    if (Array.isArray(ws.slides)) {
      out.push("\nSlides:");
      ws.slides.forEach((s: any, i: number) =>
        out.push(`  ${i + 1}. ${safe(s?.title)}${safe(s?.body) ? ` — ${safe(s.body)}` : ""}`),
      );
    }
  }

  const sign = c.book_signing || {};
  if (Object.keys(sign).length) {
    out.push(divider("Book Signing"));
    if (Array.isArray(sign.scripts)) {
      sign.scripts.forEach((s: any, i: number) => {
        out.push(`\n— Script ${i + 1} —`);
        if (safe(s?.title)) out.push(`Title: ${safe(s.title)}`);
        out.push(safe(s?.body || s?.text || ""));
      });
    }
    if (Array.isArray(sign.inscriptions)) {
      out.push("\nInscriptions:");
      sign.inscriptions.forEach((s: any, i: number) =>
        out.push(`  ${i + 1}. ${safe(typeof s === "string" ? s : s?.text)}`),
      );
    }
  }

  const corp = c.corporate_lunch || {};
  if (Object.keys(corp).length) {
    out.push(divider("Corporate Lunch"));
    if (safe(corp.pitch)) out.push(`Pitch:\n${safe(corp.pitch)}`);
    if (safe(corp.bulk_proposal)) out.push(`\nBulk Proposal:\n${safe(corp.bulk_proposal)}`);
  }

  const shared = c.shared_assets || {};
  if (Object.keys(shared).length) {
    out.push(divider("Shared Assets"));
    if (safe(shared.bio_short)) out.push(`Bio (short):\n${safe(shared.bio_short)}`);
    if (safe(shared.bio_medium)) out.push(`\nBio (medium):\n${safe(shared.bio_medium)}`);
    if (safe(shared.bio_long)) out.push(`\nBio (long):\n${safe(shared.bio_long)}`);
  }

  return new Blob([joinNonEmpty(out)], { type: "text/plain" });
}
