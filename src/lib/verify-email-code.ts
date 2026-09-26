import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for the emailed sign-in code length.
 * The backend auth mailer issues codes of this exact length, so every code
 * input (author sign-in, reader sign-in, password reset) renders this many
 * slots and submits only when the full code is entered.
 */
export const OTP_CODE_LENGTH = 8;

export const OTP_SLOTS = Array.from({ length: OTP_CODE_LENGTH }, (_, i) => i);

/**
 * Verify the emailed code issued by signInWithOtp. Supabase documents these
 * codes as the "email" OTP type. A failed verification consumes or invalidates
 * the attempt, so retrying the same code under signup/magiclink makes valid
 * codes appear expired.
 */
export async function verifyEmailCode(email: string, code: string) {
  const token = code.replace(/\s/g, "");
  return supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
}
