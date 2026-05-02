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

/** BP-02 Lead Magnets — quiz/checklist + opt-in + thank-you + nurture. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBp02Txt(content: any, authorName: string, bookTitle: string): Blob {
  const c = content || {};
  const out: string[] = [];
  out.push(`LEAD MAGNET KIT`);
  out.push(`${authorName} · ${bookTitle}`);
  out.push(`Generated ${new Date().toLocaleDateString()}`);

  const lm = c.leadMagnetContent || c;
  const optin = lm.optin_page || c.optin_page || {};
  if (Object.keys(optin).length) {
    out.push(divider("Opt-in Page"));
    if (safe(optin.headline)) out.push(`Headline: ${safe(optin.headline)}`);
    if (safe(optin.subheadline)) out.push(`Subheadline: ${safe(optin.subheadline)}`);
    if (safe(optin.cta_text)) out.push(`CTA: ${safe(optin.cta_text)}`);
    if (Array.isArray(optin.bullets)) {
      out.push("\nBullets:");
      optin.bullets.forEach((b: string, i: number) => out.push(`  ${i + 1}. ${safe(b)}`));
    }
  }

  const quiz = lm.quiz || c.quiz || {};
  if (Object.keys(quiz).length) {
    out.push(divider("Quiz / Assessment"));
    if (safe(quiz.title)) out.push(`Title: ${safe(quiz.title)}`);
    if (Array.isArray(quiz.questions)) {
      quiz.questions.forEach((q: any, i: number) => {
        out.push(`\nQ${i + 1}: ${safe(q?.text || q?.question)}`);
        if (Array.isArray(q?.options)) {
          q.options.forEach((opt: any, j: number) =>
            out.push(`  ${String.fromCharCode(65 + j)}. ${safe(typeof opt === "string" ? opt : opt?.text)}`),
          );
        }
      });
    }
    if (Array.isArray(quiz.results)) {
      out.push("\nResult Tiers:");
      quiz.results.forEach((r: any, i: number) =>
        out.push(`  ${i + 1}. ${safe(r?.title)} — ${safe(r?.description)}`),
      );
    }
  }

  const checklist = lm.checklist || c.checklist || {};
  if (Object.keys(checklist).length) {
    out.push(divider("Checklist"));
    if (safe(checklist.title)) out.push(`Title: ${safe(checklist.title)}`);
    if (Array.isArray(checklist.items)) {
      checklist.items.forEach((it: any, i: number) =>
        out.push(`  ${i + 1}. ${safe(typeof it === "string" ? it : it?.text)}`),
      );
    }
  }

  const ty = lm.thank_you || c.thank_you || {};
  if (Object.keys(ty).length) {
    out.push(divider("Thank-You Page"));
    if (safe(ty.headline)) out.push(`Headline: ${safe(ty.headline)}`);
    if (safe(ty.body)) out.push(`\n${safe(ty.body)}`);
  }

  const nurture = Array.isArray(c.nurture_sequence) ? c.nurture_sequence : [];
  if (nurture.length) {
    out.push(divider("Nurture Sequence Preview"));
    nurture.forEach((email: any, i: number) => {
      out.push(`\n— Email ${i + 1} (Day ${email?.send_delay_days ?? i}) —`);
      out.push(`Subject: ${safe(email?.subject)}`);
      out.push("");
      out.push(safe(email?.body));
    });
  }

  return new Blob([joinNonEmpty(out)], { type: "text/plain" });
}

/** BP-05 Webinars — topics, registration, follow-up, promo plan. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBp05Txt(content: any, authorName: string, bookTitle: string): Blob {
  const c = content || {};
  const out: string[] = [];
  out.push(`WEBINAR KIT`);
  out.push(`${authorName} · ${bookTitle}`);
  out.push(`Generated ${new Date().toLocaleDateString()}`);

  const topics = Array.isArray(c.webinar_topics) ? c.webinar_topics : Array.isArray(c.topics) ? c.topics : [];
  if (topics.length) {
    out.push(divider("Signature Webinar Topics"));
    topics.forEach((t: any, i: number) => {
      out.push(`\n— Topic ${i + 1} —`);
      if (safe(t?.title)) out.push(`Title: ${safe(t.title)}`);
      if (safe(t?.hook)) out.push(`Hook: ${safe(t.hook)}`);
      if (safe(t?.outline)) out.push(`Outline:\n${safe(t.outline)}`);
      if (Array.isArray(t?.key_points)) {
        out.push("Key points:");
        t.key_points.forEach((kp: string, j: number) => out.push(`  ${j + 1}. ${safe(kp)}`));
      }
    });
  }

  const reg = c.registration_page || {};
  if (Object.keys(reg).length) {
    out.push(divider("Registration Page"));
    if (safe(reg.headline)) out.push(`Headline: ${safe(reg.headline)}`);
    if (safe(reg.subheadline)) out.push(`Subheadline: ${safe(reg.subheadline)}`);
    if (Array.isArray(reg.bullets)) {
      out.push("\nBullets:");
      reg.bullets.forEach((b: string, i: number) => out.push(`  ${i + 1}. ${safe(b)}`));
    }
    if (safe(reg.cta_text)) out.push(`\nCTA: ${safe(reg.cta_text)}`);
  }

  const followup = Array.isArray(c.follow_up_emails) ? c.follow_up_emails : [];
  if (followup.length) {
    out.push(divider("Follow-up Email Sequence"));
    followup.forEach((email: any, i: number) => {
      out.push(`\n— Email ${i + 1} (Day ${email?.send_delay_days ?? i}) —`);
      out.push(`Subject: ${safe(email?.subject)}`);
      out.push("");
      out.push(safe(email?.body));
    });
  }

  const promo = c.promotional_strategy || c.promo_plan || {};
  if (Object.keys(promo).length) {
    out.push(divider("Promotional Strategy"));
    Object.entries(promo).forEach(([k, v]) => {
      const label = String(k).replace(/_/g, " ");
      out.push(`\n${label.charAt(0).toUpperCase() + label.slice(1)}:`);
      if (Array.isArray(v)) v.forEach((line: any, i: number) => out.push(`  ${i + 1}. ${safe(typeof line === "string" ? line : JSON.stringify(line))}`));
      else out.push(safe(typeof v === "string" ? v : JSON.stringify(v)));
    });
  }

  return new Blob([joinNonEmpty(out)], { type: "text/plain" });
}

/** BP-07 Home Study Course — 21-day programme + sales page. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBp07Txt(content: any, authorName: string, bookTitle: string): Blob {
  const c = content || {};
  const out: string[] = [];
  out.push(`HOME STUDY COURSE`);
  out.push(`${authorName} · ${bookTitle}`);
  if (safe(c.programme_title)) out.push(safe(c.programme_title));
  if (safe(c.programme_subtitle)) out.push(safe(c.programme_subtitle));
  if (safe(c.tagline)) out.push(`"${safe(c.tagline)}"`);
  out.push(`Generated ${new Date().toLocaleDateString()}`);

  if (safe(c.transformation_promise)) {
    out.push(divider("Transformation Promise"));
    out.push(safe(c.transformation_promise));
  }

  const weeks = Array.isArray(c.study_weeks) ? c.study_weeks : [];
  if (weeks.length) {
    out.push(divider("Study Schedule"));
    weeks.forEach((w: any, i: number) => {
      out.push(`\n— Week ${w?.week ?? i + 1}: ${safe(w?.theme || w?.title)} —`);
      const days = Array.isArray(w?.days) ? w.days : [];
      days.forEach((d: any, j: number) => {
        out.push(`  Day ${d?.day ?? j + 1}: ${safe(d?.title || d?.theme)}`);
        if (safe(d?.reading)) out.push(`    Reading: ${safe(d.reading)}`);
        if (safe(d?.exercise)) out.push(`    Exercise: ${safe(d.exercise)}`);
        if (safe(d?.reflection)) out.push(`    Reflection: ${safe(d.reflection)}`);
        if (safe(d?.action)) out.push(`    Action: ${safe(d.action)}`);
      });
    });
  }

  if (c.pricing) {
    out.push(divider("Pricing"));
    out.push(JSON.stringify(c.pricing, null, 2));
  }

  if (c.sales_page) {
    out.push(divider("Sales Page Copy"));
    Object.entries(c.sales_page).forEach(([k, v]) => {
      out.push(`\n${String(k).replace(/_/g, " ").toUpperCase()}`);
      out.push(safe(typeof v === "string" ? v : JSON.stringify(v, null, 2)));
    });
  }

  return new Blob([joinNonEmpty(out)], { type: "text/plain" });
}

/** BP-08 Special Editions — edition tiers + bundle + sales page. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildBp08Txt(content: any, authorName: string, bookTitle: string): Blob {
  const c = content || {};
  const out: string[] = [];
  out.push(`SPECIAL EDITIONS`);
  out.push(`${authorName} · ${bookTitle}`);
  if (safe(c.edition_title)) out.push(safe(c.edition_title));
  if (safe(c.occasion_label)) out.push(`Occasion: ${safe(c.occasion_label)}`);
  out.push(`Generated ${new Date().toLocaleDateString()}`);

  const editions = Array.isArray(c.editions) ? c.editions : Array.isArray(c.tiers) ? c.tiers : [];
  if (editions.length) {
    out.push(divider("Edition Tiers"));
    editions.forEach((ed: any, i: number) => {
      out.push(`\n— Tier ${i + 1}: ${safe(ed?.name || ed?.title)} —`);
      if (ed?.price !== undefined) out.push(`Price: $${ed.price}`);
      if (safe(ed?.description)) out.push(`Description: ${safe(ed.description)}`);
      if (Array.isArray(ed?.includes)) {
        out.push("Includes:");
        ed.includes.forEach((it: string, j: number) => out.push(`  ${j + 1}. ${safe(it)}`));
      }
      if (safe(ed?.fulfilment_notes || ed?.fulfillment_notes)) {
        out.push(`Fulfilment: ${safe(ed.fulfilment_notes || ed.fulfillment_notes)}`);
      }
    });
  }

  if (c.bundle) {
    out.push(divider("Bundle"));
    out.push(JSON.stringify(c.bundle, null, 2));
  }

  if (c.pricing_strategy) {
    out.push(divider("Pricing Strategy"));
    out.push(safe(typeof c.pricing_strategy === "string" ? c.pricing_strategy : JSON.stringify(c.pricing_strategy, null, 2)));
  }

  if (c.sales_page) {
    out.push(divider("Sales Page Copy"));
    Object.entries(c.sales_page).forEach(([k, v]) => {
      out.push(`\n${String(k).replace(/_/g, " ").toUpperCase()}`);
      out.push(safe(typeof v === "string" ? v : JSON.stringify(v, null, 2)));
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
