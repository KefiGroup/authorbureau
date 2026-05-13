import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { autoEnrollSubscriber } from "@/lib/email-sequence-hook";
import { toast } from "sonner";

/**
 * Shared lead-capture form used across public author surfaces:
 *  - Author homepage (/:authorSlug)
 *  - Book page (/:authorSlug/:bookSlug)
 *  - Product page (/:authorSlug/:bookSlug/:productType)
 *  - Microsite default Stay-Connected section
 *
 * Captures name + email (+ optional message), writes to:
 *   1. crm-auto-capture edge function (CRM contact + scoring)
 *   2. author_subscribers table (mailing list)
 *
 * Multi-author: requires authorUserId (auth.users.id of the author who owns the page).
 *
 * NOTE: The dedicated funnel page (/funnel/:slug) intentionally still posts to
 * `submit-funnel` because it has a real funnel_id and follow-up redirect logic.
 */
export interface LeadCaptureFormProps {
  /** auth.users.id of the author who owns the page (required for tagging) */
  authorUserId: string;
  /** Pretty name shown in success state, e.g. "Mitch Carson" */
  displayName: string;
  /** "author_homepage" | "author_book" | "author_product" | "microsite" */
  source: string;
  /** Free-text suffix (book title, product slug, etc.) */
  sourceDetail?: string;
  /** Optional override headline */
  headline?: string;
  /** Optional override body copy */
  description?: string;
  /** Show the optional message textarea (default true) */
  showMessage?: boolean;
  /** Visual theme tokens — when omitted uses semantic shadcn tokens */
  accent?: string;
  accentText?: string;
  primaryText?: string;
  bodyText?: string;
  cardBg?: string;
  cardBorder?: string;
  /** Layout: vertical stack vs inline single-row */
  layout?: "stacked" | "inline";
  /** className for outer container */
  className?: string;
  /** Optional path to navigate to after successful submit (replaces inline success state) */
  redirectTo?: string;
  /** Optional pre-filled values (e.g. from logged-in reader profile) */
  initialName?: string;
  initialEmail?: string;
}

export default function LeadCaptureForm({
  authorUserId,
  displayName,
  source,
  sourceDetail,
  headline,
  description,
  showMessage = true,
  accent,
  accentText,
  primaryText,
  bodyText,
  cardBg,
  cardBorder,
  layout = "stacked",
  className = "",
  redirectTo,
  initialName,
  initialEmail,
}: LeadCaptureFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const useTokens = !accent;
  const inputStyle: CSSProperties = useTokens
    ? {}
    : {
        borderRadius: "8px",
        border: `1px solid ${cardBorder ?? `${accent}4D`}`,
        padding: "12px 14px",
        background: cardBg ?? "rgba(255,255,255,0.08)",
        color: primaryText ?? "#fff",
        outline: "none",
      };
  const inputClass = useTokens
    ? "h-11 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : "h-11 text-sm w-full";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      const utm: Record<string, string | null> = {};
      try {
        const params = new URLSearchParams(window.location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
          (k) => (utm[k] = params.get(k))
        );
      } catch {
        /* ignore */
      }

      // 1. CRM capture (lead scoring, author tagging)
      await supabase.functions.invoke("crm-auto-capture", {
        body: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          source,
          source_detail: sourceDetail
            ? `${sourceDetail}${message.trim() ? ` | Message: ${message.trim().slice(0, 200)}` : ""}`
            : message.trim().slice(0, 200) || undefined,
          author_id: authorUserId,
          message: message.trim() || undefined,
          utm,
        },
      });

      // 2. Mailing list + auto-enroll into matching sequences (idempotent)
      await autoEnrollSubscriber({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        userId: authorUserId,
        source,
        sourceDetail: sourceDetail ?? null,
      });

      setDone(true);
      toast.success(`Subscribed! You'll hear from ${displayName} soon.`);
      setEmail("");
      setName("");
      setMessage("");
      if (redirectTo) {
        navigate(redirectTo);
      }
    } catch (err) {
      console.error("[LeadCaptureForm] submit failed:", err);
      toast.error("Could not subscribe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <CheckCircle2
          className="h-10 w-10 mx-auto mb-3"
          style={useTokens ? undefined : { color: accent }}
        />
        <h3
          className={useTokens ? "text-lg font-bold mb-1 text-foreground" : "text-lg font-bold mb-1"}
          style={useTokens ? undefined : { color: primaryText }}
        >
          You're subscribed!
        </h3>
        <p
          className={useTokens ? "text-sm text-muted-foreground" : "text-sm"}
          style={useTokens ? undefined : { color: bodyText ?? `${primaryText}BF` }}
        >
          You'll hear from {displayName} soon.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Mail
        className="h-9 w-9 mb-3"
        style={useTokens ? undefined : { color: accent }}
      />
      <h3
        className={useTokens ? "text-lg font-bold mb-2 text-foreground" : "text-lg font-bold mb-2"}
        style={useTokens ? undefined : { color: primaryText }}
      >
        {headline ?? `Stay Connected with ${displayName}`}
      </h3>
      <p
        className={useTokens ? "text-sm mb-5 text-muted-foreground" : "text-sm mb-5"}
        style={useTokens ? undefined : { color: bodyText ?? `${primaryText}BF` }}
      >
        {description ?? "Get exclusive updates, bonus content, and early access."}
      </p>
      <form
        onSubmit={submit}
        className={layout === "inline" ? "flex flex-col sm:flex-row gap-2" : "flex flex-col gap-3"}
      >
        <input
          type="text"
          placeholder="Your name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass + (layout === "inline" ? " flex-1" : " w-full")}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="your@email.com *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass + (layout === "inline" ? " flex-1" : " w-full")}
          style={inputStyle}
        />
        {showMessage && layout === "stacked" && (
          <textarea
            placeholder="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={3}
            className={
              useTokens
                ? "rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none w-full"
                : "text-sm w-full resize-none"
            }
            style={inputStyle}
          />
        )}
        <button
          type="submit"
          disabled={submitting}
          className={
            useTokens
              ? "w-full h-11 rounded-md bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
              : "w-full h-11 font-bold text-sm transition-all hover:brightness-110 disabled:opacity-60"
          }
          style={
            useTokens
              ? undefined
              : { background: accent, color: accentText, borderRadius: "8px" }
          }
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Subscribe"}
        </button>
      </form>
    </div>
  );
}
