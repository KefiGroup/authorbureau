import { supabase } from "@/integrations/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Verify a 6-digit email code. A code sent to a brand-new user is issued as a
 * "signup" code, while returning users get a "magiclink"/"email" code. Trying
 * only one type rejects valid codes as "invalid or expired", so try each.
 */
export async function verifyEmailCode(email: string, code: string) {
  const token = code.replace(/\s/g, "");
  const types: EmailOtpType[] = ["email", "signup", "magiclink"];
  let lastError: Error | null = null;
  for (const type of types) {
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type });
    if (!error && data.session) return { data, error: null };
    if (error) lastError = error;
  }
  return { data: { session: null, user: null }, error: lastError };
}
