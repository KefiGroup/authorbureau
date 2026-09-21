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
