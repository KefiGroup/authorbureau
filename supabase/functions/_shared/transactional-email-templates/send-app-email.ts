import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.3.1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from './registry.ts'

// Server-only. Sends a registered template through Lovable's managed email API,
// keeping Authors Bureau's author-branded behaviour:
//  - when authorId is given, From becomes "{senderName} via Authors Bureau",
//    Reply-To comes from author_email_settings, and senderName is passed to the
//    template so it can render the "sent on behalf of" footer;
//  - system emails (no authorId) stay platform-branded.
// Each send appends a sent / suppressed / failed row to email_send_log.

const SITE_NAME = 'Authors Bureau'
const SENDER_DOMAIN = 'notify.authorsbureau.com'
const FROM_DOMAIN = 'notify.authorsbureau.com'

export interface SendAppEmailArgs {
  templateName: string
  recipientEmail?: string | null
  templateData?: Record<string, any>
  idempotencyKey?: string
  authorId?: string | null
  replyTo?: string | null
}

export interface SendAppEmailResult {
  success: boolean
  reason?: 'email_suppressed'
  error?: string
  status: number
}

const sanitizeDisplay = (s: string) =>
  s.replace(/[\r\n"<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)

export async function sendAppEmail(args: SendAppEmailArgs): Promise<SendAppEmailResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return { success: false, status: 500, error: 'Server configuration error' }
  }

  const template = TEMPLATES[args.templateName]
  if (!template) {
    return {
      success: false,
      status: 404,
      error: `Template '${args.templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
    }
  }

  const recipient = template.to || args.recipientEmail
  if (!recipient) {
    return { success: false, status: 400, error: 'recipientEmail is required (unless the template defines a fixed recipient)' }
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const log = async (status: 'sent' | 'suppressed' | 'failed', error_message?: string) => {
    const { error } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: args.templateName,
      recipient_email: recipient,
      status,
      ...(error_message ? { error_message: error_message.slice(0, 1000) } : {}),
    })
    if (error) console.error('email_send_log insert failed', { code: error.code, message: error.message })
  }

  let senderName: string | null = null
  let replyTo: string | null = args.replyTo?.trim() || null
  if (args.authorId) {
    const { data: settings } = await supabase
      .from('author_email_settings')
      .select('sender_name, reply_to_email')
      .eq('author_id', args.authorId)
      .maybeSingle()
    if (settings) {
      if (typeof settings.sender_name === 'string') senderName = settings.sender_name.trim() || null
      if (!replyTo && typeof settings.reply_to_email === 'string') replyTo = settings.reply_to_email.trim() || null
    }
    if (!senderName) {
      const { data: profile } = await supabase
        .from('author_profiles')
        .select('pen_name')
        .eq('id', args.authorId)
        .maybeSingle()
      if (typeof profile?.pen_name === 'string') senderName = profile.pen_name.trim() || null
    }
  }

  const baseData = args.templateData ?? {}
  const data = senderName ? { senderName, ...baseData } : baseData
  const fromDisplay = senderName ? `${sanitizeDisplay(senderName)} via ${SITE_NAME}` : SITE_NAME

  try {
    const element = React.createElement(template.component, data)
    const html = await renderAsync(element)
    const text = await renderAsync(element, { plainText: true })
    const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject

    await sendLovableEmail(
      {
        to: recipient,
        from: `"${fromDisplay}" <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: args.templateName,
        idempotency_key: args.idempotencyKey || crypto.randomUUID(),
        ...(replyTo ? { reply_to: replyTo } : {}),
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') }
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await log('suppressed')
      return { success: false, status: 200, reason: 'email_suppressed' }
    }
    const message = error instanceof Error ? error.message : String(error)
    await log('failed', message)
    const status = error instanceof EmailAPIError ? error.status : 500
    return { success: false, status, error: message }
  }

  await log('sent')
  return { success: true, status: 200 }
}

function normalizeBody(body: Record<string, any>): SendAppEmailArgs {
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  return {
    templateName: body.templateName || body.template_name,
    recipientEmail: body.recipientEmail || body.recipient_email,
    templateData: body.templateData && typeof body.templateData === 'object' ? body.templateData : {},
    idempotencyKey: body.idempotencyKey || body.idempotency_key,
    authorId: s(body.authorId) || s(body.author_id),
    replyTo: s(body.replyTo) || s(body.reply_to),
  }
}

function toPayload(r: SendAppEmailResult): Record<string, unknown> {
  if (r.success) return { success: true }
  if (r.reason) return { success: false, reason: r.reason }
  return { error: r.error }
}

/** Drop-in for `client.functions.invoke('send-transactional-email', { body })`. */
export async function invokeAppEmail(opts: { body: Record<string, any> }) {
  if (!opts?.body?.templateName && !opts?.body?.template_name) {
    return { data: null, error: new Error('templateName is required') }
  }
  const r = await sendAppEmail(normalizeBody(opts.body))
  return r.status >= 400
    ? { data: null, error: new Error(r.error || `HTTP ${r.status}`) }
    : { data: toPayload(r), error: null }
}

/** Drop-in for `fetch(<send-transactional-email URL>, { method, headers, body })`. */
export async function fetchAppEmail(init: { body?: string } & Record<string, any>): Promise<Response> {
  let body: Record<string, any> = {}
  try { body = JSON.parse(init?.body || '{}') } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400 })
  }
  if (!body.templateName && !body.template_name) {
    return new Response(JSON.stringify({ error: 'templateName is required' }), { status: 400 })
  }
  const r = await sendAppEmail(normalizeBody(body))
  return new Response(JSON.stringify(toPayload(r)), {
    status: r.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
