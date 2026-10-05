import { createClient } from 'npm:@supabase/supabase-js@2'
import { invokeAppEmail, fetchAppEmail } from "../_shared/transactional-email-templates/send-app-email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORT_EMAIL = 'support@authorsbureau.com'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const sender_name = clean(body.name, 100)
    const sender_email = clean(body.email, 255)
    const subject = clean(body.subject, 200)
    const message = clean(body.message, 2000)

    const errors: string[] = []
    if (!sender_name) errors.push('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender_email)) errors.push('Please enter a valid email address.')
    if (!subject) errors.push('Please enter a subject.')
    if (message.length < 5) errors.push('Please enter a message.')
    if (errors.length) {
      return json({ success: false, status: 'invalid', message: errors.join(' ') }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Basic abuse guard: 5 messages per email per hour
    const { count } = await supabase
      .from('platform_contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_email', sender_email)
      .gte('created_at', new Date(Date.now() - 3600_000).toISOString())

    if ((count ?? 0) >= 5) {
      return json(
        { success: false, status: 'rate_limited', message: 'You have sent several messages recently. Please wait a little while before sending another.' },
        429,
      )
    }

    const { data: row, error: insertError } = await supabase
      .from('platform_contact_messages')
      .insert({
        sender_name,
        sender_email,
        subject,
        message,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[submit-contact-form] insert failed', insertError)
      return json({ success: false, status: 'error', message: 'We could not save your message. Please try again.' }, 500)
    }

    const send = (templateName: string, recipientEmail: string, templateData: Record<string, unknown>, replyTo?: string) =>
      fetchAppEmail({
        method: 'POST',
        headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName,
          recipientEmail,
          idempotencyKey: `${templateName}-${row.id}`,
          templateData,
          ...(replyTo ? { replyTo } : {}),
        }),
      })

    let emailSent = false
    try {
      const res = await send(
        'contact-message',
        SUPPORT_EMAIL,
        {
          senderName: sender_name,
          senderEmail: sender_email,
          subject,
          message,
          submittedAt: new Date().toISOString(),
        },
        sender_email,
      )
      emailSent = res.ok
      if (!res.ok) console.error('[submit-contact-form] support email failed', await res.text())
    } catch (e) {
      console.error('[submit-contact-form] support email threw', e)
    }

    // Confirmation to the visitor — best effort, never blocks success
    try {
      await send('contact-confirmation', sender_email, { senderName: sender_name, subject, message })
    } catch (e) {
      console.warn('[submit-contact-form] confirmation email failed', e)
    }

    if (emailSent) {
      await supabase.from('platform_contact_messages').update({ email_sent: true }).eq('id', row.id)
    }

    return json({
      success: true,
      status: 'received',
      message: "Message received. We'll get back to you within 1-2 business days.",
      id: row.id,
    })
  } catch (e) {
    console.error('[submit-contact-form] unexpected', e)
    return json({ success: false, status: 'error', message: 'Something went wrong. Please try again.' }, 500)
  }
})
