import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

function mdToHtml(md: string): string {
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#D4AF37;">$1</a>');
  html = html.replace(/\n\n/g, '</p><p style="margin:0 0 16px;">');
  return `<p style="margin:0 0 16px;">${html}</p>`;
}

function renderEmailHtml(opts: { subject: string; bodyMd: string; senderName: string; recipientName?: string }) {
  const body = mdToHtml(opts.bodyMd.replace(/\{\{name\}\}/g, opts.recipientName || 'there'));
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${opts.subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px 32px;color:#0B1220;">
${body}
<hr style="border:0;border-top:1px solid #e5e5e5;margin:32px 0 16px;" />
<p style="font-size:12px;color:#888;margin:0;">Sent by ${opts.senderName}.</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { flow_id, subscriber_id, lead_id, email, name } = await req.json();
    if (!flow_id) {
      return new Response(JSON.stringify({ success: false, status: 400, message: 'flow_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: flow } = await supabase.from('email_flows').select('author_id, book_id, title').eq('id', flow_id).single();
    if (!flow) throw new Error('Flow not found');

    let subId = subscriber_id;
    if (!subId && email) {
      const { data: existing } = await supabase
        .from('author_subscribers').select('id')
        .eq('author_id', flow.author_id).eq('email', email).maybeSingle();
      if (existing) subId = existing.id;
      else {
        const { data: created, error: subErr } = await supabase
          .from('author_subscribers')
          .insert({ author_id: flow.author_id, email, name: name || null, source: 'sequence_trigger', status: 'active' })
          .select('id').single();
        if (subErr) throw subErr;
        subId = created.id;
      }
    }
    if (!subId) throw new Error('subscriber_id or email required');

    // Idempotent enrollment
    const { data: existingEnrollment } = await supabase
      .from('email_flow_enrollments')
      .select('id, status')
      .eq('flow_id', flow_id).eq('subscriber_id', subId)
      .maybeSingle();

    let enrollmentId = existingEnrollment?.id;
    const alreadyEnrolled = !!existingEnrollment;

    if (!enrollmentId) {
      const { data: enrollment, error: enrErr } = await supabase
        .from('email_flow_enrollments')
        .insert({ flow_id, subscriber_id: subId, current_step: 0, status: 'active' })
        .select().single();
      if (enrErr) throw enrErr;
      enrollmentId = enrollment.id;

      const { data: f } = await supabase.from('email_flows').select('total_subscribers').eq('id', flow_id).single();
      await supabase.from('email_flows').update({ total_subscribers: (f?.total_subscribers || 0) + 1 }).eq('id', flow_id);
    }

    if (lead_id) {
      await supabase.from('lead_activities').insert({
        lead_id, author_id: flow.author_id, activity_type: 'sequence_enrolled',
        metadata: { flow_id, flow_title: flow.title },
      });
    }

    // ===== Fix 2: actually SEND step 1 via Resend =====
    let sendStatus: any = { sent: false };

    if (alreadyEnrolled) {
      sendStatus = { sent: false, reason: 'already_enrolled' };
    } else {
      const { data: step } = await supabase
        .from('email_flow_steps')
        .select('id, subject, body_markdown, preview_text')
        .eq('flow_id', flow_id)
        .order('step_number', { ascending: true })
        .limit(1).maybeSingle();

      if (!step) {
        sendStatus = { sent: false, reason: 'no_steps' };
      } else if (!email) {
        sendStatus = { sent: false, reason: 'no_recipient_email' };
      } else {
        const { data: profile } = await supabase
          .from('author_profiles').select('pen_name').eq('id', flow.author_id).maybeSingle();
        const { data: emailSettings } = await supabase
          .from('author_email_settings').select('sender_name')
          .eq('author_id', flow.author_id).maybeSingle();

        const senderName = emailSettings?.sender_name || profile?.pen_name || 'Authors Bureau';

        try {
          const { sendViaLovable } = await import('../_shared/from-address.ts');
          const sendResult = await sendViaLovable({
            recipientEmail: email,
            recipientName: name,
            senderName,
            subject: step.subject,
            bodyMarkdown: step.body_markdown,
            idempotencyKey: `seq-${enrollmentId}-step-${step.step_number || 1}`,
          });

          if (!sendResult.ok) throw new Error(sendResult.error || `send failed (${sendResult.status})`);

          await supabase.from('email_send_log').insert({
            message_id: sendResult.messageId, template_name: 'sequence_step', recipient_email: email,
            status: 'sent', author_id: flow.author_id, lead_id: lead_id || null,
            sequence_step_id: step.id, to_name: name || null,
            metadata: { flow_id, subject: step.subject, via: 'lovable' },
          });

          await supabase.from('email_flow_enrollments').update({ current_step: 1 }).eq('id', enrollmentId);
          sendStatus = { sent: true, message_id: sendResult.messageId };
        } catch (sendErr) {
          console.error('Send error', sendErr);
          await supabase.from('email_send_log').insert({
            template_name: 'sequence_step', recipient_email: email, status: 'failed',
            error_message: (sendErr as Error).message, author_id: flow.author_id,
            lead_id: lead_id || null, sequence_step_id: step.id, metadata: { flow_id },
          });
          sendStatus = { sent: false, reason: 'send_failed', message: (sendErr as Error).message };
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, status: 200,
      message: alreadyEnrolled ? 'Already enrolled' : 'Enrolled',
      enrollment_id: enrollmentId, send: sendStatus,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trigger-sequence error', e);
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
