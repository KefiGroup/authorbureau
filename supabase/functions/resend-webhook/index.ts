// resend-webhook: handles bounce + complaint events from Resend.
// Suppresses the address, flags subscribers, and unenrolls from all active flows.
// Configure in Resend dashboard → Webhooks → point to:
//   POST {SUPABASE_URL}/functions/v1/resend-webhook
// Events to subscribe: email.bounced, email.complained, email.delivered (optional).

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') || '';

// Verify Svix signature (Resend uses Svix). If no secret configured, allow (dev mode) but log.
async function verifySvix(req: Request, rawBody: string): Promise<boolean> {
  if (!RESEND_WEBHOOK_SECRET) {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET not configured — accepting all requests');
    return true;
  }
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sig = req.headers.get('svix-signature');
  if (!id || !ts || !sig) return false;

  // Resend secrets are formatted "whsec_<base64>"
  const secretB64 = RESEND_WEBHOOK_SECRET.startsWith('whsec_')
    ? RESEND_WEBHOOK_SECRET.slice(6) : RESEND_WEBHOOK_SECRET;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(secretB64), c => c.charCodeAt(0));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const toSign = new TextEncoder().encode(`${id}.${ts}.${rawBody}`);
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, toSign));
  const expected = btoa(String.fromCharCode(...sigBytes));
  // sig header looks like "v1,<sig> v1,<sig>" — match any
  return sig.split(' ').some(s => s.split(',')[1] === expected);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: corsHeaders });

  const rawBody = await req.text();
  const ok = await verifySvix(req, rawBody);
  if (!ok) {
    console.warn('[resend-webhook] signature verification failed');
    return new Response(JSON.stringify({ error: 'invalid signature' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const type: string = event?.type || '';
  const data = event?.data || {};
  const messageId: string | undefined = data?.email_id || data?.id;
  const recipients: string[] = Array.isArray(data?.to) ? data.to : (data?.to ? [data.to] : []);
  const email = recipients[0]?.toLowerCase();

  console.log(`[resend-webhook] event=${type} message=${messageId} to=${email}`);

  if (!email) return new Response(JSON.stringify({ ok: true, skipped: 'no recipient' }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  // Determine action
  let suppressionReason: 'bounce' | 'complaint' | null = null;
  let logStatus: string | null = null;
  let subscriberStatus: string | null = null;

  if (type === 'email.bounced') {
    const bounceType = (data?.bounce?.type || '').toLowerCase();
    // Only suppress on hard bounces (or if bounce type unknown — be safe)
    if (bounceType === 'soft') {
      logStatus = 'soft_bounce';
    } else {
      suppressionReason = 'bounce';
      logStatus = 'bounced';
      subscriberStatus = 'bounced';
    }
  } else if (type === 'email.complained') {
    suppressionReason = 'complaint';
    logStatus = 'complained';
    subscriberStatus = 'complained';
  } else if (type === 'email.delivered') {
    logStatus = 'delivered';
  } else if (type === 'email.opened') {
    logStatus = 'opened';
  } else if (type === 'email.clicked') {
    logStatus = 'clicked';
  }

  // 1. Suppress + flag subscriber + unenroll
  if (suppressionReason && subscriberStatus) {
    await supabase.from('suppressed_emails').upsert({
      email, reason: suppressionReason,
      metadata: { source: 'resend_webhook', type, message_id: messageId, raw: data },
    }, { onConflict: 'email' });

    // Find subscriber rows across all authors (same email may appear under multiple authors)
    const { data: subs } = await supabase
      .from('author_subscribers').select('id').eq('email', email);

    if (subs && subs.length > 0) {
      const subIds = subs.map(s => s.id);
      await supabase.from('author_subscribers').update({
        status: subscriberStatus, unsubscribed_at: new Date().toISOString(),
      }).in('id', subIds);

      await supabase.from('email_flow_enrollments').update({
        status: 'unsubscribed', next_send_at: null,
      }).in('subscriber_id', subIds).eq('status', 'active');
    }
  }

  // 2. Append to log
  if (logStatus) {
    await supabase.from('email_send_log').insert({
      message_id: messageId || null,
      template_name: data?.tags?.template_name || 'sequence_step',
      recipient_email: email,
      status: logStatus,
      metadata: { event_type: type, resend_data: data },
    });
  }

  // 3. Update opened_at / clicked_at on existing log row if matched
  if ((type === 'email.opened' || type === 'email.clicked') && messageId) {
    const col = type === 'email.opened' ? 'opened_at' : 'clicked_at';
    await supabase.from('email_send_log').update({ [col]: new Date().toISOString() })
      .eq('message_id', messageId).eq('status', 'sent');
  }

  return new Response(JSON.stringify({ ok: true, applied: { suppressionReason, logStatus } }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
