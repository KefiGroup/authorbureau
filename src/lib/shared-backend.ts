/**
 * Auth + data client.
 *
 * Historically this module pointed at an external PublishNow Supabase project
 * ("shared backend"). That project is no longer reachable, which broke every
 * sign-in and any data read routed through it.
 *
 * This file is now a thin compatibility layer over the project's own Lovable
 * Cloud client, so the many existing `@/lib/shared-backend` imports keep
 * working without a sweeping rename.
 */
import type { Session } from "@supabase/supabase-js";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";

/**
 * @deprecated The external PublishNow project is offline. These constants only
 * remain so legacy admin/SSO fetches keep compiling; they must not be used for
 * new work.
 */
export const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
/** @deprecated see SHARED_BACKEND_URL */
export const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

export const sharedSupabase = cloudSupabase;
export const supabase = cloudSupabase;

type SharedSessionInput = {
  access_token: string;
  refresh_token: string;
};

export async function establishSharedSession(sessionData: SharedSessionInput) {
  const { data, error } = await cloudSupabase.auth.setSession(sessionData);
  if (error) throw error;
  return data.session;
}

export async function getSharedSession(): Promise<Session | null> {
  try {
    const { data } = await cloudSupabase.auth.getSession();
    return data.session ?? null;
  } catch {
    return null;
  }
}

export function clearSharedSessionCache() {
  // Session storage is managed by the Cloud client itself; nothing to clear.
}
