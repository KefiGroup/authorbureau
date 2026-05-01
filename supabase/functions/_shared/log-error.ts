// Shared helper to log errors into public.system_error_log so admins can see
// failures across edge functions, webhooks, crons, etc.
//
// Usage:
//   import { logError } from "../_shared/log-error.ts";
//   try { ... } catch (e) {
//     await logError({ source: "edge_function", function_name: "create-checkout-session",
//                      severity: "error", error: e, context: { userId } });
//     throw e;
//   }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ErrorSource =
  | "edge_function"
  | "webhook"
  | "cron"
  | "email_queue"
  | "stripe"
  | "client"
  | "other";

export type ErrorSeverity = "critical" | "error" | "warning";

export interface LogErrorInput {
  source: ErrorSource;
  function_name?: string;
  severity?: ErrorSeverity; // default 'error'
  message?: string; // optional override; otherwise derived from `error`
  error?: unknown; // Error object or any thrown value
  context?: Record<string, unknown>;
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Best-effort logger. Never throws — failures go to console only. */
export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const client = getServiceClient();
    if (!client) {
      console.error("[log-error] missing SUPABASE_URL/SERVICE_ROLE_KEY", input);
      return;
    }

    const err = input.error;
    let message = input.message ?? "";
    let stack: string | null = null;

    if (err instanceof Error) {
      message = message || err.message;
      stack = err.stack ?? null;
    } else if (err !== undefined && err !== null) {
      try {
        message = message || JSON.stringify(err);
      } catch {
        message = message || String(err);
      }
    }
    if (!message) message = "Unknown error";

    const severity: ErrorSeverity = input.severity ?? "error";
    const row = {
      source: input.source,
      function_name: input.function_name ?? null,
      severity,
      message: message.slice(0, 2000),
      stack: stack ? stack.slice(0, 8000) : null,
      context: input.context ?? null,
    };

    const { error: insertErr } = await client.from("system_error_log").insert(row);
    if (insertErr) {
      console.error("[log-error] insert failed:", insertErr.message);
      return;
    }

    // Critical → fan out an in-app notification to all admins
    if (severity === "critical") {
      try {
        await client.rpc("notify_all_admins", {
          p_title: `Critical: ${input.function_name ?? input.source}`,
          p_message: row.message.slice(0, 280),
          p_link: "/admin?tab=errors",
          p_event_key: "system.error.critical",
          p_target_type: "system_error_log",
          p_payload: { source: row.source, function_name: row.function_name },
        });
      } catch (notifyErr) {
        console.error("[log-error] notify_all_admins failed:", (notifyErr as Error).message);
      }
    }
  } catch (e) {
    console.error("[log-error] unexpected:", (e as Error).message);
  }
}
