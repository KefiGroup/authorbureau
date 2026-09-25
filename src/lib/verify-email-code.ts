import { supabase } from "@/integrations/supabase/client";

/**
 * Verify the six-digit code issued by signInWithOtp. Supabase documents these
 * codes as the "email" OTP type. A failed verification consumes or invalidates
 * the attempt, so retrying the same code under signup/magiclink makes valid
 * codes appear expired.
 */
export async function verifyEmailCode(email: string, code: string) {
  const token = code.replace(/\s/g, "");
  return supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
}
