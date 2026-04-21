/**
 * Standardised "What Abby will do" intro block for every Brand Product builder.
 *
 * Tells the author, before they hit Generate:
 *   1. What Abby will create
 *   2. Where it will live (the destination/link after activation)
 *   3. How they can edit it later
 *   4. Roughly how long Abby takes
 *   5. Any prerequisites they must complete first
 */

import { Sparkles, MapPin, Pencil, Clock, AlertTriangle } from "lucide-react";

export interface BuilderIntroSpec {
  /** Plain-language list of what Abby will produce. */
  creates: string[];
  /** Where it will live (e.g. "Marketing Hub → Email Sequences"). */
  livesAt: string;
  /** How they can come back and edit it later. */
  editLater: string;
  /** Estimated runtime, e.g. "20–40 seconds". */
  estimate: string;
  /** Optional prerequisites users should know about. */
  prerequisites?: string[];
}

export const BP_INTRO_SPECS: Record<string, BuilderIntroSpec> = {
  "BP-01": {
    creates: [
      "A 5-email welcome sequence",
      "Your lead magnet offer email",
      "Your first broadcast campaign",
    ],
    livesAt: "Marketing Hub → Email Sequences (auto-deployed to your connected marketing account).",
    editLater: "Re-open Email Marketing anytime to review every email, edit copy, or re-generate.",
    estimate: "20–40 seconds",
    prerequisites: ["Connect your Marketing Hub in Account Settings → Connections so emails can deploy."],
  },
  "BP-02": {
    creates: [
      "A complete lead magnet (quiz or checklist)",
      "A public opt-in microsite",
      "A 4-email nurture sequence + social distribution pack",
    ],
    livesAt: "A public microsite at /your-slug/lead-magnet/... — share the link to start collecting subscribers.",
    editLater: "Re-open Lead Magnet to edit headline, design, questions, or push refreshed copy to social/email.",
    estimate: "60–90 seconds",
  },
  "BP-03": {
    creates: [
      "20 social posts (LinkedIn, Instagram, Facebook, X)",
      "A 4-week content calendar with hashtag strategy",
      "3 outreach email templates (podcast, media, review)",
    ],
    livesAt: "Auto-scheduled to your connected social accounts via Marketing Hub. Manage in Marketing Hub → Social Calendar.",
    editLater: "Re-open Social Media anytime to edit posts, download the kit as a ZIP, or re-schedule.",
    estimate: "30–60 seconds",
    prerequisites: ["Connect your Social Accounts in Account Settings → Connections before activating, or your posts will save but not schedule."],
  },
  "BP-04": {
    creates: [
      "Your full author website (hero, about, books, testimonials)",
      "SEO meta tags and OpenGraph images",
      "An integrated lead capture form",
    ],
    livesAt: "Your public author site at /your-slug — visible to readers immediately after activating.",
    editLater: "Re-open Author Website to refresh any section. Profile changes also sync from Account Settings → Profile.",
    estimate: "45–75 seconds",
  },
  "BP-05": {
    creates: [
      "3 signature webinar topics with public registration pages",
      "6-email sequence (3 reminders + 3 follow-ups)",
      "Promotional copy for social media",
      "A registrant dashboard with live counts",
    ],
    livesAt: "Public webinar registration pages at /your-slug/webinar/<topic> — registrants flow into your CRM with +15 ABBY score.",
    editLater: "Re-open Webinar Engine to edit topics, schedule dates, set Daily.co room URLs, or view registrants.",
    estimate: "60–90 seconds",
  },
  "BP-06": {
    creates: [
      "A printable companion workbook to your book",
      "Chapter-by-chapter exercises and reflection prompts",
      "A branded PDF cover",
    ],
    livesAt: "Downloadable PDF saved to your Brand Products library. Sells from your microsite + can be bundled in courses.",
    editLater: "Re-open Workbook to edit prompts, regenerate exercises, or upload your own PDF.",
    estimate: "60–90 seconds",
  },
  "BP-07": {
    creates: [
      "A complete home study course outline",
      "Module-by-module lessons + assessments",
      "A sales page draft",
    ],
    livesAt: "Course detail page at /your-slug/course/... — sells via Stripe, fulfilled through your dashboard.",
    editLater: "Re-open Home Study Course to edit modules, sales copy, or pricing. Workbook recommended first.",
    estimate: "60–120 seconds",
    prerequisites: ["Your Workbook should exist first so course exercises reference your real workbook content."],
  },
  "BP-08": {
    creates: [
      "Special edition framing + bonus chapter ideas",
      "A premium bundle offer + sales copy",
      "Pricing recommendations",
    ],
    livesAt: "Listed on your Brand Products library + sales page at /your-slug/special-edition/...",
    editLater: "Re-open Special Edition to edit framing, bonuses, or pricing.",
    estimate: "45–75 seconds",
  },
  "BP-09": {
    creates: [
      "An event sales strategy with pricing tiers",
      "Back-of-room sales scripts + a QR-code order page",
      "A post-event follow-up email sequence",
    ],
    livesAt: "Sales kit in your Brand Products library + a QR-code order page at /your-slug/buy/...",
    editLater: "Re-open Book Sales to edit pricing, scripts, or your follow-up emails.",
    estimate: "45–75 seconds",
  },
};

interface Props {
  spec: BuilderIntroSpec;
}

export default function BuilderIntroBlock({ spec }: Props) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Here's what's going to happen
      </p>

      {/* What Abby creates */}
      <div className="flex gap-3">
        <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Abby will create</p>
          <ul className="mt-1 space-y-0.5">
            {spec.creates.map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-snug">• {c}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Where it lives */}
      <div className="flex gap-3">
        <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Where it lives after activating</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">{spec.livesAt}</p>
        </div>
      </div>

      {/* Edit later */}
      <div className="flex gap-3">
        <Pencil className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">You can edit it later</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">{spec.editLater}</p>
        </div>
      </div>

      {/* Estimate */}
      <div className="flex gap-3">
        <Clock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">How long Abby takes</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">Usually {spec.estimate}.</p>
        </div>
      </div>

      {/* Prerequisites */}
      {spec.prerequisites && spec.prerequisites.length > 0 && (
        <div className="flex gap-3 pt-2 border-t border-border">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Before you continue</p>
            <ul className="mt-1 space-y-0.5">
              {spec.prerequisites.map((p, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-snug">• {p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tiny "Back to Review" link to render below a success / activated screen,
 * so authors can always return to the Review step to edit content.
 */
export function BackToReviewLink({ onClick }: { onClick: () => void }) {
  return (
    <div className="text-center">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to review &amp; edit content
      </button>
    </div>
  );
}
