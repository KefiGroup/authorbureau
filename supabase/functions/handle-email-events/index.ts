import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.3.1'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Notification-only mirror of delivery outcomes into the app's tables.
// Lovable enforces suppression at send time; nothing here gates sends.

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}
const MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

function db() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function recordSuppression(
  eventId: string,
  reason: Reason,
  recipient: string,
  messageId: string | null | undefined,
) {
  const supabase = db()
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('suppressed_emails upsert failed', { event_id: eventId, code: suppressError.code, message: suppressError.message })
    throw new Error('Failed to write suppression')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: messageId ?? null,
    template_name: 'system',
    recipient_email: email,
    status: STATUS[reason],
    error_message: MESSAGE[reason],
    metadata: null,
  })
  if (logError) {
    console.error('email_send_log insert failed', { event_id: eventId, code: logError.code, message: logError.message })
    throw new Error('Failed to write send log')
  }

  return { supabase, email }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordSuppression(event.event_id, 'bounce', event.data.recipient, event.data.message_id)
    },
    'email.complaint': async (event) => {
      await recordSuppression(event.event_id, 'complaint', event.data.recipient, event.data.message_id)
    },
    'email.unsubscribed': async (event) => {
      const { supabase, email } = await recordSuppression(
        event.event_id,
        'unsubscribe',
        event.data.recipient,
        event.data.message_id,
      )

      // Flag subscriber row(s) and unenroll from active nurture flows.
      const { data: subs, error: subsError } = await supabase
        .from('author_subscribers')
        .select('id')
        .eq('email', email)
      if (subsError) {
        console.error('author_subscribers lookup failed', { event_id: event.event_id, code: subsError.code, message: subsError.message })
        throw new Error('Failed to read subscribers')
      }
      if (subs && subs.length > 0) {
        const subIds = subs.map((s: { id: string }) => s.id)
        const { error: updError } = await supabase
          .from('author_subscribers')
          .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
          .in('id', subIds)
        if (updError) {
          console.error('author_subscribers update failed', { event_id: event.event_id, code: updError.code, message: updError.message })
          throw new Error('Failed to update subscribers')
        }
        const { error: enrError } = await supabase
          .from('email_flow_enrollments')
          .update({ status: 'unsubscribed', next_send_at: null })
          .in('subscriber_id', subIds)
          .eq('status', 'active')
        if (enrError) {
          console.error('email_flow_enrollments update failed', { event_id: event.event_id, code: enrError.code, message: enrError.message })
          throw new Error('Failed to update enrollments')
        }
      }
    },
  },
})

Deno.serve((req) => handler(req))
