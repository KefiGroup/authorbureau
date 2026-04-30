// process-email-flows: drip scheduler. Runs every 5 min via pg_cron.
// For each active enrollment whose next_send_at is due, send the next step
// via Resend, log it, and schedule the following step.
// Hard rule: NEVER send to suppressed/unsubscribed/bounced addresses.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// IMPORTANT: this should be the public site origin where the unsubscribe page lives.
const PUBLIC_BASE = Deno.env.get('PUBLIC_SITE_URL') || 'https://authorsbureau.com';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function mdToHtml(md: string, vars: Record<string, string>): string {
  let out = md;
  // Substitute {{var}} placeholders FIRST (case-insensitive variants supported)
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
    out = out.replace(re, v);
  }
  // Also rewrite hard-coded placeholder URLs the AI may have hallucinated
  if (vars.lead_magnet_url) {
    out = out.replace(/https?:\/\/example\.com\/lead-magnet\/?/gi, vars.lead_magnet_url);
    out = out.replace(/https?:\/\/example\.com\/?(?=[\s)\]])/gi, vars.lead_magnet_url);
  }
  if (vars.author_url) {
    out = out.replace(/https?:\/\/example\.com\/?(?=[\s)\]])/gi, vars.author_url);
  }
  out = escapeHtml(out);
  out = out.replace(/^### (.*)$/gm, '<h3 style="margin:24px 0 8px;">$1</h3>');
  out = out.replace(/^## (.*)$/gm, '<h2 style="margin:24px 0 8px;">$1</h2>');
  out = out.replace(/^# (.*)$/gm, '<h1 style="margin:24px 0 8px;">$1</h1>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#c68a2e;">$1</a>');
  out = out.replace(/\n\n/g, '</p><p style="margin:0 0 16px;">');
  return `<p style="margin:0 0 16px;">${out}</p>`;
}

function renderEmailHtml(opts: {
  subject: string; bodyMd: string; senderName: string;
  recipientName?: string; unsubscribeUrl: string;
}) {
  const body = mdToHtml(opts.bodyMd, { name: opts.recipientName || 'there' });
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px 32px;color:#0B1220;">
${body}
<hr style="border:0;border-top:1px solid #e5e5e5;margin:32px 0 16px;" />
<p style="font-size:12px;color:#888;margin:0 0 8px;">Sent by ${escapeHtml(opts.senderName)} via Authors Bureau.</p>
<p style="font-size:12px;color:#888;margin:0;">
  Don't want these emails? <a href="${opts.unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe in one click</a>.
</p>
</div></body></html>`;
}

async function getOrCreateUnsubToken(supabase: any, email: string): Promise<string> {
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens').select('token').eq('email', email).maybeSingle();
  if (existing?.token) return existing.token;
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const { data: created, error } = await supabase
    .from('email_unsubscribe_tokens').insert({ email, token }).select('token').single();
  if (error) {
    // Race: another process created it. Re-read.
    const { data: again } = await supabase.from('email_unsubscribe_tokens').select('token').eq('email', email).maybeSingle();
    return again?.token || token;
  }
  return created.token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();
  const stats = { processed: 0, sent: 0, skipped: 0, completed: 0, failed: 0, suppressed_skipped: 0 };

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured', stats }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = new Date();

    // Pull due enrollments (next_send_at <= now OR null with current_step = 0 — newly enrolled)
    const { data: due, error: dueErr } = await supabase
      .from('email_flow_enrollments')
      .select('id, flow_id, subscriber_id, current_step, last_sent_at, next_send_at, status')
      .eq('status', 'active')
      .or(`next_send_at.lte.${now.toISOString()},next_send_at.is.null`)
      .limit(100);

    if (dueErr) throw dueErr;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ ok: true, stats, ms: Date.now() - startedAt }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const enr of due) {
      stats.processed++;
      try {
        // Load flow + subscriber
        const [{ data: flow }, { data: sub }] = await Promise.all([
          supabase.from('email_flows').select('id, author_id, book_id, title, status, flow_type, node_id').eq('id', enr.flow_id).maybeSingle(),
          supabase.from('author_subscribers').select('id, email, name, status, author_id').eq('id', enr.subscriber_id).maybeSingle(),
        ]);

        if (!flow || !sub) {
          await supabase.from('email_flow_enrollments').update({ status: 'failed', next_send_at: null }).eq('id', enr.id);
          stats.failed++; continue;
        }

        // Hard rule: skip if subscriber unsubscribed/bounced/complained
        if (sub.status !== 'active') {
          await supabase.from('email_flow_enrollments').update({ status: 'unsubscribed', next_send_at: null }).eq('id', enr.id);
          stats.suppressed_skipped++; continue;
        }

        // Hard rule: skip if email is in suppression list
        const { data: supp } = await supabase
          .from('suppressed_emails').select('reason').eq('email', sub.email).maybeSingle();
        if (supp) {
          await supabase.from('author_subscribers').update({
            status: supp.reason === 'bounce' ? 'bounced' : (supp.reason === 'complaint' ? 'complained' : 'unsubscribed'),
            unsubscribed_at: new Date().toISOString(),
          }).eq('id', sub.id);
          await supabase.from('email_flow_enrollments').update({ status: 'unsubscribed', next_send_at: null }).eq('id', enr.id);
          stats.suppressed_skipped++; continue;
        }

        // Skip if flow is paused
        if (flow.status === 'paused' || flow.status === 'archived') {
          await supabase.from('email_flow_enrollments').update({ next_send_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString() }).eq('id', enr.id);
          stats.skipped++; continue;
        }

        // Find the next step to send
        const nextStepNumber = (enr.current_step || 0) + 1;
        const { data: step } = await supabase
          .from('email_flow_steps')
          .select('id, step_number, subject, body_markdown, preview_text, trigger_delay_days')
          .eq('flow_id', flow.id)
          .eq('step_number', nextStepNumber)
          .maybeSingle();

        if (!step) {
          // No more steps — mark complete
          await supabase.from('email_flow_enrollments').update({
            status: 'completed', completed_at: new Date().toISOString(), next_send_at: null,
          }).eq('id', enr.id);
          stats.completed++; continue;
        }

        // Author + sender info
        const [{ data: profile }, { data: emailSettings }] = await Promise.all([
          supabase.from('author_profiles').select('pen_name').eq('id', flow.author_id).maybeSingle(),
          supabase.from('author_email_settings').select('sender_name, reply_to_email').eq('author_id', flow.author_id).maybeSingle(),
        ]);

        const senderName = emailSettings?.sender_name || profile?.pen_name || 'Authors Bureau';

        // Send via Lovable Cloud (verified notify.authorsbureau.com pipeline).
        // Replaces direct Resend call (Resend account had no verified domains).
        const { sendViaLovable } = await import('../_shared/from-address.ts');
        const sendResult = await sendViaLovable({
          recipientEmail: sub.email,
          recipientName: sub.name || null,
          senderName,
          subject: step.subject,
          bodyMarkdown: step.body_markdown,
          idempotencyKey: `flow-${enr.id}-step-${step.step_number}`,
        });

        if (!sendResult.ok) {
          await supabase.from('email_send_log').insert({
            template_name: 'sequence_step', recipient_email: sub.email, status: 'failed',
            error_message: sendResult.error || `send failed (${sendResult.status})`,
            author_id: flow.author_id, sequence_step_id: step.id,
            metadata: { flow_id: flow.id, enrollment_id: enr.id, step_number: step.step_number },
          });
          // Backoff 1 hour and retry
          await supabase.from('email_flow_enrollments').update({
            next_send_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }).eq('id', enr.id);
          stats.failed++; continue;
        }

        const result = { id: sendResult.messageId };

        await supabase.from('email_send_log').insert({
          message_id: result.id, template_name: 'sequence_step',
          recipient_email: sub.email, status: 'sent',
          author_id: flow.author_id, sequence_step_id: step.id,
          to_name: sub.name || null,
          metadata: { flow_id: flow.id, enrollment_id: enr.id, step_number: step.step_number, subject: step.subject, via: 'lovable' },
        });

        // Compute next send. If a next step exists, schedule it; else mark completed.
        const { data: nextStep } = await supabase
          .from('email_flow_steps')
          .select('trigger_delay_days')
          .eq('flow_id', flow.id)
          .eq('step_number', step.step_number + 1)
          .maybeSingle();

        if (nextStep) {
          // Compute delay from THIS step's trigger_delay_days vs next's
          const deltaDays = Math.max(1, (nextStep.trigger_delay_days || 0) - (step.trigger_delay_days || 0));
          const nextAt = new Date(Date.now() + deltaDays * 24 * 3600 * 1000);
          await supabase.from('email_flow_enrollments').update({
            current_step: step.step_number,
            last_sent_at: new Date().toISOString(),
            last_message_id: result.id,
            next_send_at: nextAt.toISOString(),
          }).eq('id', enr.id);
        } else {
          // Last step sent — mark completed. Optionally roll into master_nurture.
          await supabase.from('email_flow_enrollments').update({
            current_step: step.step_number,
            last_sent_at: new Date().toISOString(),
            last_message_id: result.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
            next_send_at: null,
          }).eq('id', enr.id);

          // Roll into master_nurture if not already enrolled and one exists
          if (flow.flow_type !== 'master_nurture') {
            const { data: master } = await supabase
              .from('email_flows').select('id').eq('author_id', flow.author_id).eq('flow_type', 'master_nurture').eq('status', 'active').maybeSingle();
            if (master) {
              const { data: alreadyMaster } = await supabase
                .from('email_flow_enrollments').select('id')
                .eq('flow_id', master.id).eq('subscriber_id', sub.id).maybeSingle();
              if (!alreadyMaster) {
                await supabase.from('email_flow_enrollments').insert({
                  flow_id: master.id, subscriber_id: sub.id, current_step: 0,
                  status: 'active', next_send_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        stats.sent++;
      } catch (innerErr) {
        console.error('[process-email-flows] enrollment error', enr.id, innerErr);
        stats.failed++;
        await supabase.from('email_flow_enrollments').update({
          next_send_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        }).eq('id', enr.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, stats, ms: Date.now() - startedAt }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('process-email-flows fatal', e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message, stats }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
