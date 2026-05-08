/**
 * Node Asset Registry
 * ─────────────────────────────────────────────────────────────
 * Declarative map of every downloadable / shareable asset
 * sitting inside `author_nodes.content_json` for each of the
 * 28 framework nodes.
 *
 * The Author Library uses this to render rows without having
 * to know the internal shape of every node's content_json.
 *
 * Each asset declares:
 *  - key:          dot-path inside content_json (or "*" = whole blob)
 *  - label:        human-readable name
 *  - type:         primary export type (pptx | pdf | docx | csv | text | image | audio)
 *  - formats:      allowed download formats for this asset
 *  - probe?:       optional fn that returns true if the asset really exists in this content
 *  - sizeHint?:    optional fn that returns a small label like "14 slides"
 */
export type AssetType = "pptx" | "pdf" | "docx" | "csv" | "text" | "image" | "audio" | "script";
export type ExportFormat = "copy" | "txt" | "docx" | "pdf" | "pptx" | "csv" | "script_docx";

export interface NodeAsset {
  key: string;
  label: string;
  type: AssetType;
  formats: ExportFormat[];
  probe?: (content: any) => boolean;
  sizeHint?: (content: any) => string | undefined;
}

const has = (c: any, path: string): boolean => {
  if (!c || typeof c !== "object") return false;
  const parts = path.split(".");
  let cur: any = c;
  for (const p of parts) {
    if (cur == null) return false;
    cur = cur[p];
  }
  return cur != null && (Array.isArray(cur) ? cur.length > 0 : true);
};

const arrLen = (c: any, path: string): number | undefined => {
  const parts = path.split(".");
  let cur: any = c;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return Array.isArray(cur) ? cur.length : undefined;
};

const TEXT_FORMATS: ExportFormat[] = ["copy", "txt", "docx", "pdf"];
const SLIDE_FORMATS: ExportFormat[] = ["pptx", "pdf"];
const PDF_FORMATS: ExportFormat[] = ["pdf", "docx"];
const SCRIPT_FORMATS: ExportFormat[] = ["script_docx"];

/** Speaker-script asset row helper — used on every slide-bearing node.
 * Always shown when slides exist; AssetRow will generate-on-demand if speaker_script is missing.
 */
const speakerScriptAsset = (slidesProbe: (c: any) => boolean): NodeAsset => ({
  key: "speaker_script",
  label: "Speaker script",
  type: "script",
  formats: SCRIPT_FORMATS,
  probe: c => slidesProbe(c),
  sizeHint: c => {
    const n = arrLen(c, "speaker_script.slides");
    if (n) return `${n} slides scripted`;
    return "Generate on demand";
  },
});

export const NODE_ASSETS: Record<string, NodeAsset[]> = {
  // ═══════════════ Brand Products ═══════════════
  "BP-01": [
    { key: "nurture_emails", label: "Nurture email sequence", type: "text", formats: TEXT_FORMATS,
      probe: c => has(c, "nurture_emails"), sizeHint: c => { const n = arrLen(c, "nurture_emails"); return n ? `${n} emails` : undefined; } },
    { key: "broadcast_templates", label: "Broadcast templates", type: "text", formats: TEXT_FORMATS,
      probe: c => has(c, "broadcast_templates") },
  ],
  "BP-02": [
    { key: "quiz", label: "Quiz + result archetypes", type: "text", formats: TEXT_FORMATS,
      probe: c => has(c, "quiz") },
    { key: "landing_page", label: "Landing page copy", type: "text", formats: TEXT_FORMATS,
      probe: c => has(c, "landing_page") },
    { key: "social_pack", label: "Social distribution pack", type: "text", formats: TEXT_FORMATS,
      probe: c => has(c, "social_pack") },
  ],
  "BP-03": [
    { key: "posts", label: "Branded posts", type: "text", formats: [...TEXT_FORMATS, "csv"],
      probe: c => has(c, "posts"), sizeHint: c => { const n = arrLen(c, "posts"); return n ? `${n} posts` : undefined; } },
    { key: "calendar", label: "4-week content calendar", type: "csv", formats: ["csv", "pdf"],
      probe: c => has(c, "calendar") },
    { key: "outreach", label: "Outreach DM kit", type: "text", formats: TEXT_FORMATS,
      probe: c => has(c, "outreach") },
  ],
  "BP-04": [
    { key: "*", label: "Full website copy", type: "text", formats: TEXT_FORMATS },
  ],
  "BP-05": [
    { key: "script", label: "Webinar script", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "script") },
    { key: "slides", label: "Webinar slide deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "slides"), sizeHint: c => { const n = arrLen(c, "slides"); return n ? `${n} slides` : undefined; } },
    { key: "promo_emails", label: "Promo emails", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "promo_emails") },
    { key: "follow_up", label: "Follow-up sequence", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "follow_up") },
  ],
  "BP-06": [
    { key: "exercises", label: "Workbook exercises", type: "pdf", formats: PDF_FORMATS,
      probe: c => has(c, "exercises") },
  ],
  "BP-07": [
    { key: "curriculum", label: "21-day curriculum", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "curriculum") },
    { key: "lessons", label: "Lesson outlines", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "lessons") },
  ],
  "BP-08": [
    { key: "tiers", label: "Edition tier specs", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "tiers") },
    { key: "*", label: "Full special-editions package", type: "text", formats: TEXT_FORMATS },
  ],
  "BP-09": [
    { key: "workshop.slides", label: "Workshop deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "workshop.slides"),
      sizeHint: c => { const n = arrLen(c, "workshop.slides"); return n ? `${n} slides` : undefined; } },
    { key: "corporate_lunch.slides", label: "Corporate lunch deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "corporate_lunch.slides"),
      sizeHint: c => { const n = arrLen(c, "corporate_lunch.slides"); return n ? `${n} slides` : undefined; } },
    { key: "workshop.handout_outline", label: "Workshop handout", type: "pdf", formats: PDF_FORMATS,
      probe: c => has(c, "workshop.handout_outline") },
    { key: "corporate_proposal", label: "Corporate proposal", type: "pdf", formats: PDF_FORMATS,
      probe: c => has(c, "corporate_proposal") },
    { key: "scripts", label: "Sales pitch scripts", type: "text", formats: TEXT_FORMATS,
      probe: c => has(c, "scripts") },
  ],
  // ═══════════════ Build Authority ═══════════════
  "BA-10": [
    { key: "*", label: "Online course package", type: "pdf", formats: [...PDF_FORMATS, "csv"] },
    { key: "slides", label: "Course overview deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "slides"), sizeHint: c => { const n = arrLen(c, "slides"); return n ? `${n} slides` : undefined; } },
  ],
  "BA-11": [
    { key: "zip_url", label: "Audiobook export pack (ZIP)", type: "audio", formats: [],
      probe: c => has(c, "zip_url") },
    { key: "chapter_urls", label: "Chapter MP3s", type: "audio", formats: [],
      probe: c => has(c, "chapter_urls"),
      sizeHint: c => { const n = arrLen(c, "chapter_urls"); return n ? `${n} chapters` : undefined; } },
    { key: "preview_url", label: "Audio preview", type: "audio", formats: [],
      probe: c => has(c, "preview_url") },
    { key: "cover_image_url", label: "Audiobook cover", type: "image", formats: [],
      probe: c => has(c, "cover_image_url") },
  ],
  "BA-12": [{ key: "*", label: "Membership package", type: "text", formats: TEXT_FORMATS }],
  "BA-13": [
    { key: "*", label: "Group coaching package", type: "pdf", formats: PDF_FORMATS },
    { key: "slides", label: "Group coaching pitch deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "slides"), sizeHint: c => { const n = arrLen(c, "slides"); return n ? `${n} slides` : undefined; } },
  ],
  "BA-14": [{ key: "*", label: "Podcast season package", type: "text", formats: TEXT_FORMATS }],
  "BA-15": [
    { key: "press_release", label: "Press release", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "press_release") },
    { key: "media_kit", label: "Media kit", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "media_kit") },
    { key: "pitch_list", label: "Pitch list", type: "csv", formats: ["csv", "pdf"], probe: c => has(c, "pitch_list") },
  ],
  "BA-16": [
    { key: "*", label: "Affiliate programme package", type: "text", formats: TEXT_FORMATS },
    { key: "pitch_deck", label: "Affiliate pitch deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "pitch_deck"), sizeHint: c => { const n = arrLen(c, "pitch_deck"); return n ? `${n} slides` : undefined; } },
  ],
  "BA-17": [{ key: "*", label: "Upsell & bundle package", type: "text", formats: TEXT_FORMATS }],
  "BA-18": [
    { key: "*", label: "JV partnerships package", type: "text", formats: TEXT_FORMATS },
    { key: "pitch_deck", label: "JV pitch deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "pitch_deck"), sizeHint: c => { const n = arrLen(c, "pitch_deck"); return n ? `${n} slides` : undefined; } },
  ],
  // ═══════════════ Yield Revenue ═══════════════
  "YR-19": [{ key: "*", label: "1-on-1 coaching package", type: "pdf", formats: PDF_FORMATS }],
  "YR-20": [{ key: "*", label: "Big-ticket offer package", type: "text", formats: TEXT_FORMATS }],
  "YR-21": [
    { key: "slides", label: "Keynote deck", type: "pptx", formats: SLIDE_FORMATS, probe: c => has(c, "slides") },
    { key: "one_sheet", label: "Speaker one-sheet", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "one_sheet") },
    { key: "topics", label: "Topic list", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "topics") },
  ],
  "YR-22": [
    { key: "curriculum", label: "Training curriculum", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "curriculum") },
    { key: "slides", label: "Training slide deck", type: "pptx", formats: SLIDE_FORMATS, probe: c => has(c, "slides") },
  ],
  "YR-23": [
    { key: "*", label: "Mastermind package", type: "pdf", formats: PDF_FORMATS },
    { key: "slides", label: "Mastermind pitch deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "slides"), sizeHint: c => { const n = arrLen(c, "slides"); return n ? `${n} slides` : undefined; } },
  ],
  "YR-24": [
    { key: "itinerary", label: "Retreat itinerary", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "itinerary") },
    { key: "sales_page", label: "Retreat sales page", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "sales_page") },
  ],
  "YR-25": [
    { key: "*", label: "Certification package", type: "pdf", formats: PDF_FORMATS },
    { key: "slides", label: "Certification pitch deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "slides"), sizeHint: c => { const n = arrLen(c, "slides"); return n ? `${n} slides` : undefined; } },
  ],
  "YR-26": [
    { key: "agenda", label: "Conference agenda", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "agenda") },
    { key: "sponsor_deck", label: "Sponsor deck", type: "pptx", formats: SLIDE_FORMATS, probe: c => has(c, "sponsor_deck") },
  ],
  "YR-27": [
    { key: "campaign_copy", label: "Campaign copy", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "campaign_copy") },
    { key: "pitch_deck", label: "Pitch deck", type: "pptx", formats: SLIDE_FORMATS, probe: c => has(c, "pitch_deck") },
  ],
  "YR-28": [
    { key: "prospectus", label: "Sponsor prospectus", type: "pdf", formats: PDF_FORMATS, probe: c => has(c, "prospectus") },
    { key: "tiers", label: "Sponsorship tiers", type: "text", formats: TEXT_FORMATS, probe: c => has(c, "tiers") },
    { key: "pitch_deck", label: "Sponsor pitch deck", type: "pptx", formats: SLIDE_FORMATS,
      probe: c => has(c, "pitch_deck"), sizeHint: c => { const n = arrLen(c, "pitch_deck"); return n ? `${n} slides` : undefined; } },
  ],
};

/** Returns the assets for a node, filtered by what actually exists in content_json. */
export function getAvailableAssets(nodeId: string, content: any): NodeAsset[] {
  const defs = NODE_ASSETS[nodeId] || [];
  if (!content) return [];
  return defs.filter(a => (a.key === "*" ? true : (a.probe ? a.probe(content) : has(content, a.key))));
}

/** Returns a small descriptor string like "14 slides" / "7 emails" if known. */
export function describeAssetSize(asset: NodeAsset, content: any): string | undefined {
  return asset.sizeHint ? asset.sizeHint(content) : undefined;
}
