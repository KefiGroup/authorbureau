// Centralized sender address builder.
// IMPORTANT: notify.authorsbureau.com is the verified Resend domain.
// authorsbureau.com (root) is NOT verified — using it returns 403 "domain not verified".
// All nurture/campaign/sequence sends MUST go through notify.authorsbureau.com.

export const SENDER_DOMAIN = 'notify.authorsbureau.com';
export const SENDER_LOCAL_PART = 'newsletter';
export const DEFAULT_REPLY_TO = 'support@authorsbureau.com';

/**
 * Build a Resend-safe From address.
 * @param senderName Display name (e.g. author pen name). Stripped of non [A-Za-z0-9 ] chars.
 * @returns "Sender Name <newsletter@notify.authorsbureau.com>"
 */
export function buildFromAddress(senderName?: string | null): string {
  const cleanName = (senderName || 'Authors Bureau').replace(/[^A-Za-z0-9 ]/g, '').trim() || 'Authors Bureau';
  return `${cleanName} <${SENDER_LOCAL_PART}@${SENDER_DOMAIN}>`;
}

/**
 * Resolve reply-to. Falls back to platform support address.
 */
export function resolveReplyTo(replyToEmail?: string | null): string {
  return (replyToEmail && replyToEmail.includes('@')) ? replyToEmail : DEFAULT_REPLY_TO;
}
