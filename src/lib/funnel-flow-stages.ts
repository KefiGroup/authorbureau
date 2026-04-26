/**
 * Defines the per-archetype stage sequence for the visual funnel flow chart,
 * plus the editable field schema for each stage.
 *
 * Two layers of data feed each stage:
 *   1. Base values from the `funnels` row (ABBY's generated copy).
 *   2. Author overrides from `funnel_stage_overrides`.
 * `getStagesForArchetype` merges them and reports `isEdited` per stage.
 */
import type { ArchetypeKey } from "./funnel-archetype";

export type FieldType = "text" | "textarea" | "url" | "number";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Used as placeholder + reset target; comes from ABBY's base funnel row. */
  baseValue?: string | number | null;
  rows?: number;
  placeholder?: string;
}

export type StageStatus = "ready" | "incomplete" | "missing";

export interface FunnelStage {
  id: string;
  label: string;
  description: string;
  status: StageStatus;
  /** Optional stat shown on the card (e.g. "1,240 views"). */
  stat?: string;
  fields: FieldDef[];
  /** Effective values: override → base → empty. */
  values: Record<string, string>;
  /** True if any field for this stage has an author override. */
  isEdited: boolean;
}

/** Minimal shape we read from the `funnels` row. */
export interface BaseFunnel {
  id: string;
  headline?: string | null;
  subheadline?: string | null;
  body_copy?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  page_views?: number | null;
  conversions?: number | null;
  status?: string | null;
}

export type OverridesMap = Record<string, Record<string, string>>;

interface StageContext {
  publicUrl?: string | null;
  leadsCount?: number;
}

const fmt = (n?: number | null) =>
  typeof n === "number" ? n.toLocaleString() : "0";

/** Build the canonical stage list (with field defs) for an archetype. */
function stageTemplates(
  archetype: ArchetypeKey,
  base: BaseFunnel,
): Omit<FunnelStage, "values" | "isEdited" | "status">[] {
  const heroFields: FieldDef[] = [
    { key: "headline", label: "Headline", type: "text", baseValue: base.headline },
    { key: "subheadline", label: "Subheadline", type: "text", baseValue: base.subheadline },
    { key: "body_copy", label: "Body copy", type: "textarea", baseValue: base.body_copy, rows: 5 },
    { key: "cta_text", label: "CTA button text", type: "text", baseValue: base.cta_text },
  ];

  switch (archetype) {
    case "A":
      return [
        { id: "traffic", label: "Traffic", description: "Where readers discover you", fields: [
          { key: "source_notes", label: "Traffic source notes", type: "textarea", placeholder: "e.g. LinkedIn posts, podcast guesting, email blasts", rows: 3 },
        ] },
        { id: "sales_page", label: "Sales Page", description: "Pitch the product", fields: heroFields },
        { id: "checkout", label: "Checkout", description: "Stripe payment", fields: [
          { key: "redirect_url", label: "Post-purchase redirect URL", type: "url", baseValue: base.cta_url },
        ] },
        { id: "thank_you", label: "Thank You", description: "Confirm + next step", fields: [
          { key: "headline", label: "Thank-you headline", type: "text" },
          { key: "next_step_url", label: "Next-step URL", type: "url" },
        ] },
        { id: "onboarding_email", label: "Onboarding Email", description: "Welcome the buyer", fields: [
          { key: "subject", label: "Subject line", type: "text" },
          { key: "body", label: "Email body", type: "textarea", rows: 6 },
        ] },
      ];
    case "B":
      return [
        { id: "traffic", label: "Traffic", description: "Where readers find this", fields: [
          { key: "source_notes", label: "Traffic source notes", type: "textarea", rows: 3 },
        ] },
        { id: "optin_page", label: "Opt-in Page", description: "Capture the email", fields: heroFields },
        { id: "confirm_email", label: "Confirm Email", description: "Double opt-in", fields: [
          { key: "subject", label: "Subject line", type: "text", placeholder: "Confirm your email to get your gift" },
          { key: "body", label: "Email body", type: "textarea", rows: 6 },
        ] },
        { id: "deliver_magnet", label: "Deliver Magnet", description: "Send the asset", fields: [
          { key: "delivery_url", label: "Delivery URL", type: "url", baseValue: base.cta_url },
          { key: "subject", label: "Delivery email subject", type: "text" },
        ] },
        { id: "nurture_1", label: "Nurture · Day 1", description: "Build the relationship", fields: [
          { key: "delay_days", label: "Send after (days)", type: "number" },
          { key: "subject", label: "Subject line", type: "text" },
          { key: "body", label: "Email body", type: "textarea", rows: 6 },
        ] },
        { id: "upsell", label: "Upsell", description: "Offer the next step", fields: [
          { key: "offer_headline", label: "Offer headline", type: "text" },
          { key: "offer_url", label: "Offer URL", type: "url" },
        ] },
      ];
    case "C":
      return [
        { id: "traffic", label: "Traffic", description: "Qualified inbound", fields: [
          { key: "source_notes", label: "Traffic source notes", type: "textarea", rows: 3 },
        ] },
        { id: "application_page", label: "Application Page", description: "Pitch + apply", fields: heroFields },
        { id: "form_submit", label: "Form Submit", description: "Capture the lead", fields: [
          { key: "form_url", label: "Application form URL", type: "url", baseValue: base.cta_url },
        ] },
        { id: "review", label: "Review (48h)", description: "Manual qualification", fields: [
          { key: "review_notes", label: "Internal review checklist", type: "textarea", rows: 4 },
        ] },
        { id: "discovery_call", label: "Discovery Call", description: "Book + run the call", fields: [
          { key: "calendar_url", label: "Calendar URL", type: "url" },
          { key: "pre_call_questions", label: "Pre-call questions", type: "textarea", rows: 4 },
        ] },
        { id: "close", label: "Close", description: "Send proposal & contract", fields: [
          { key: "proposal_template_url", label: "Proposal template URL", type: "url" },
        ] },
      ];
    case "D":
    default:
      return [
        { id: "traffic", label: "Traffic", description: "Promote the event", fields: [
          { key: "source_notes", label: "Traffic source notes", type: "textarea", rows: 3 },
        ] },
        { id: "event_page", label: "Event Page", description: "Sell the date", fields: heroFields },
        { id: "register", label: "Register", description: "Capture attendee", fields: [
          { key: "registration_url", label: "Registration URL", type: "url", baseValue: base.cta_url },
        ] },
        { id: "confirmation", label: "Confirmation", description: "Email confirmation + ICS", fields: [
          { key: "subject", label: "Subject line", type: "text" },
          { key: "body", label: "Email body", type: "textarea", rows: 6 },
        ] },
        { id: "reminders", label: "Reminder Sequence", description: "Drive show-up rate", fields: [
          { key: "reminder_24h_subject", label: "24h reminder subject", type: "text" },
          { key: "reminder_1h_subject", label: "1h reminder subject", type: "text" },
        ] },
        { id: "event_day", label: "Event Day", description: "Run the event", fields: [
          { key: "event_url", label: "Event URL (Zoom, livestream, venue map)", type: "url" },
        ] },
      ];
  }
}

/**
 * Compute stages for a funnel: merges base fields with overrides, derives status.
 */
export function getStagesForArchetype(
  archetype: ArchetypeKey,
  base: BaseFunnel,
  overrides: OverridesMap,
  ctx: StageContext = {},
): FunnelStage[] {
  const templates = stageTemplates(archetype, base);

  return templates.map((tpl) => {
    const stageOverrides = overrides[tpl.id] || {};
    const values: Record<string, string> = {};
    let hasAnyValue = false;
    let isEdited = false;

    for (const f of tpl.fields) {
      const overrideVal = stageOverrides[f.key];
      const baseVal = f.baseValue == null ? "" : String(f.baseValue);
      const effective = overrideVal !== undefined ? overrideVal : baseVal;
      values[f.key] = effective;
      if (effective && effective.trim().length > 0) hasAnyValue = true;
      if (overrideVal !== undefined) isEdited = true;
    }

    // Status: 'ready' if every required-ish field has a value; 'incomplete' if some;
    // 'missing' if nothing at all.
    const filledCount = tpl.fields.filter((f) => (values[f.key] || "").trim().length > 0).length;
    let status: StageStatus = "missing";
    if (filledCount === tpl.fields.length && tpl.fields.length > 0) status = "ready";
    else if (filledCount > 0) status = "incomplete";

    // Stat surfacing for the page-style stages.
    let stat: string | undefined;
    if (["sales_page", "optin_page", "application_page", "event_page"].includes(tpl.id)) {
      stat = `${fmt(base.page_views)} views · ${fmt(base.conversions)} conv.`;
    } else if (tpl.id === "form_submit" || tpl.id === "register") {
      stat = `${fmt(ctx.leadsCount)} leads`;
    }

    return { ...tpl, values, isEdited, status, stat };
  });
}
