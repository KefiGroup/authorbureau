// Shared helper: route author nurture / campaign / sequence emails through
// Lovable Cloud's verified transactional email pipeline (notify.authorsbureau.com)
// instead of the project's own Resend account (which has no verified domains).
//
// Why: every author on the platform sends through ONE verified pipeline.
// No per-author Resend account, no per-author DNS — it just works.
//
// Each call enqueues a single email via the `author-broadcast` template.
// The recipient receives a per-recipient send (not a bulk blast), so this
// remains within the transactional email policy (one user action = one email).

export interface SendViaLovableArgs {
  recipientEmail: string;
  recipientName?: string | null;
  senderName: string;          // Author's pen name / sender label
  subject: string;
  bodyMarkdown: string;        // Author-authored markdown body
  idempotencyKey: string;      // Unique per logical send (e.g. enrollment-id + step-number)
  preview?: string;
  authorId?: string | null;    // Optional — enables "{senderName} via Authors Bureau" From + Reply-To lookup
  replyTo?: string | null;     // Optional — explicit override (highest priority)
}

export interface SendViaLovableResult {
  ok: boolean;
  messageId?: string;
  status: number;
  error?: string;
  suppressed?: boolean;
}

/**
 * Sends one email through Lovable's send-transactional-email function.
 * Uses the SUPABASE_SERVICE_ROLE_KEY env var for service-role auth.
 */
export async function sendViaLovable(args: SendViaLovableArgs): Promise<SendViaLovableResult> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        templateName: 'author-broadcast',
        recipientEmail: args.recipientEmail,
        idempotencyKey: args.idempotencyKey,
        authorId: args.authorId || undefined,
        replyTo: args.replyTo || undefined,
        templateData: {
          senderName: args.senderName,
          subject: args.subject,
          bodyMarkdown: args.bodyMarkdown,
          recipientName: args.recipientName || undefined,
          preview: args.preview,
        },
      }),
    });

    const data = await resp.json().catch(() => ({} as any));

    if (!resp.ok) {
      return { ok: false, status: resp.status, error: data?.error || `HTTP ${resp.status}` };
    }
    if (data?.success === false && data?.reason === 'email_suppressed') {
      return { ok: false, status: 200, suppressed: true, error: 'email_suppressed' };
    }

    return { ok: true, status: 200, messageId: data?.messageId || data?.message_id };
  } catch (e) {
    return { ok: false, status: 500, error: (e as Error).message };
  }
}
