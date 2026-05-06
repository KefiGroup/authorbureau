/**
 * Convert any technical/edge-function/network error into a friendly,
 * ABBY-voiced message safe to render to authors.
 *
 * Always returns a non-empty string. Never throws.
 */

const FRIENDLY_DEFAULT =
  "ABBY couldn't finish that step. Please click Try Again — your work is saved. If it keeps happening, email support@authorsbureau.com.";

const FRIENDLY_RATE_LIMIT =
  "ABBY is a bit overwhelmed right now. Please wait a few seconds and click 'Try Again'.";

const FRIENDLY_PAYMENT =
  "ABBY's AI credits need topping up. Please contact support@authorsbureau.com so we can recharge.";

const FRIENDLY_TIMEOUT =
  "ABBY took a bit too long to think this through. Please click 'Try Again' — she'll usually nail it on the second pass.";

const FRIENDLY_AI_TRANSIENT =
  "ABBY's brain is briefly offline. Please click Try Again in a few seconds.";

const FRIENDLY_AI_MALFORMED =
  "ABBY's reply got mangled. Please click Try Again — she usually nails it on the second pass.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMessage(err: any): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err.message === "string") return err.message;
  if (typeof err.error === "string") return err.error;
  if (err.error && typeof err.error.message === "string") return err.error.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FRIENDLY_AUTH =
  "Your session is still restoring. Please wait a couple of seconds and click 'Try Again'. If it persists, refresh the page.";

const FRIENDLY_FORBIDDEN =
  "ABBY couldn't save this securely under your account. Please refresh the page and try again. If it persists, contact support.";

const FRIENDLY_NETWORK =
  "ABBY couldn't reach the server. Please check your connection and click 'Try Again'.";

const FRIENDLY_SAVE =
  "ABBY couldn't save your changes just now. Please click 'Try Again' — your work is preserved locally.";

const FRIENDLY_PUBLISH =
  "ABBY couldn't publish this just now. Please click 'Try Again'. If it keeps happening, save as draft and reach out to support.";

export function toAbbyError(err: any): string {
  const rawOriginal = extractMessage(err);
  const raw = rawOriginal.toLowerCase();

  if (!raw) return FRIENDLY_DEFAULT;

  // Pass-through: backend marked this as a user-actionable, specific message.
  // Convention: prefix the error string with an UPPER_SNAKE code followed by
  // ": " and the human message. Example: "MANUSCRIPT_MISSING: ..."
  if (/^[A-Z][A-Z0-9_]+:\s/.test(rawOriginal)) {
    return rawOriginal.replace(/^[A-Z][A-Z0-9_]+:\s*/, "");
  }

  if (raw.includes("429") || raw.includes("rate limit") || raw.includes("too many requests")) {
    return FRIENDLY_RATE_LIMIT;
  }
  if (raw.includes("402") || raw.includes("payment required") || raw.includes("insufficient credit")) {
    return FRIENDLY_PAYMENT;
  }
  if (raw.includes("timeout") || raw.includes("timed out") || raw.includes("aborted")) {
    return FRIENDLY_TIMEOUT;
  }
  if (
    raw.includes("not authenticated") ||
    raw.includes("not signed in") ||
    raw.includes("no active session") ||
    raw.includes("no token") ||
    raw.includes("missing authorization") ||
    raw.includes("401") ||
    raw.includes("invalid jwt") ||
    raw.includes("session not recognised") ||
    raw.includes("session not recognized")
  ) {
    return FRIENDLY_AUTH;
  }
  if (raw.includes("403") || raw.includes("not authorized") || raw.includes("forbidden") || raw.includes("rls")) {
    return FRIENDLY_FORBIDDEN;
  }
  if (raw.includes("failed to fetch") || raw.includes("network") || raw.includes("networkerror")) {
    return FRIENDLY_NETWORK;
  }
  if (
    raw.includes("ai gateway") ||
    raw.includes("502") ||
    raw.includes("503") ||
    raw.includes("504") ||
    (raw.includes("500") && raw.includes("ai"))
  ) {
    return FRIENDLY_AI_TRANSIENT;
  }
  if (raw.includes("did not contain valid json") || raw.includes("malformed") || raw.includes("unexpected token")) {
    return FRIENDLY_AI_MALFORMED;
  }
  if (raw.includes("publish failed") || raw.includes("activate") && raw.includes("fail")) {
    return FRIENDLY_PUBLISH;
  }
  if (
    raw.includes("save failed") ||
    raw.includes("upsert") ||
    raw.includes("insert failed") ||
    raw.includes("update failed") ||
    raw.includes("save-author-node") ||
    raw.includes("autosave")
  ) {
    return FRIENDLY_SAVE;
  }

  return FRIENDLY_DEFAULT;
}
