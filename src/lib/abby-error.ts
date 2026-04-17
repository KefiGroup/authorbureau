/**
 * Convert any technical/edge-function/network error into a friendly,
 * ABBY-voiced message safe to render to authors.
 *
 * Always returns a non-empty string. Never throws.
 */

const FRIENDLY_DEFAULT =
  "ABBY hit a snag and needs a moment to recover. Please click 'Try Again' — this usually resolves itself. If it keeps happening, reach out to support.";

const FRIENDLY_RATE_LIMIT =
  "ABBY is a bit overwhelmed right now. Please wait a few seconds and click 'Try Again'.";

const FRIENDLY_PAYMENT =
  "ABBY's AI credits need topping up. Please head to Settings → Workspace → Usage to add credits, then try again.";

const FRIENDLY_TIMEOUT =
  "ABBY took a bit too long to think this through. Please click 'Try Again' — she'll usually nail it on the second pass.";

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
export function toAbbyError(err: any): string {
  const raw = extractMessage(err).toLowerCase();

  if (!raw) return FRIENDLY_DEFAULT;

  if (raw.includes("429") || raw.includes("rate limit") || raw.includes("too many requests")) {
    return FRIENDLY_RATE_LIMIT;
  }
  if (raw.includes("402") || raw.includes("payment required") || raw.includes("insufficient credit")) {
    return FRIENDLY_PAYMENT;
  }
  if (raw.includes("timeout") || raw.includes("timed out") || raw.includes("aborted")) {
    return FRIENDLY_TIMEOUT;
  }

  return FRIENDLY_DEFAULT;
}
