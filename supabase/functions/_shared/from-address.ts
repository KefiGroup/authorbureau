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
 * Sends one email through Lovable's managed email API (author-broadcast template).
 */
export async function sendViaLovable(args: SendViaLovableArgs): Promise<SendViaLovableResult> {
  try {
    const { sendAppEmail } = await import('./transactional-email-templates/send-app-email.ts');
    const r = await sendAppEmail({
      templateName: 'author-broadcast',
      recipientEmail: args.recipientEmail,
      idempotencyKey: args.idempotencyKey,
      authorId: args.authorId || null,
      replyTo: args.replyTo || null,
      templateData: {
        senderName: args.senderName,
        subject: args.subject,
        bodyMarkdown: args.bodyMarkdown,
        recipientName: args.recipientName || undefined,
        preview: args.preview,
      },
    });
    if (r.reason === 'email_suppressed') {
      return { ok: false, status: 200, suppressed: true, error: 'email_suppressed' };
    }
    if (!r.success) return { ok: false, status: r.status, error: r.error || `HTTP ${r.status}` };
    return { ok: true, status: 200 };
  } catch (e) {
    return { ok: false, status: 500, error: (e as Error).message };
  }
}
