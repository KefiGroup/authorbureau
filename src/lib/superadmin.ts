/**
 * Superadmin access — developer-level override.
 * Superadmins can access ALL nodes regardless of Coming Soon gating.
 */

const SUPERADMIN_EMAILS = ["paulinet77@gmail.com"];

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email.toLowerCase());
}
