// enroll-subscriber: Single entry point for ALL conversion events.
//   Given an email + author identifier (either author_profile_id OR user_id) + node_id (optional),
//   1. Upserts author_subscribers (author_id = user_id, per platform convention).
//   2. Enrolls in the node-specific email_flow if one exists.
//   3. Always enrolls in the author's master_nurture flow if one exists.
// Idempotent: safe to call multiple times for the same email+flow.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EnrollPayload {
  email: string;
  name?: string | null;
  // Either of these resolves the author. user_id wins if both provided.
  user_id?: string | null;          // auth.users.id
  author_profile_id?: string | null; // author_profiles.id
  node_id?: string | null;           // e.g. 'BP-01' — enroll in the matching flow if exists
  source?: string;
  source_detail?: string | null;
  book_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST required' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let body: EnrollPayload;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ ok: false, error: 'valid email required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!body.user_id && !body.author_profile_id) {
    return new Response(JSON.stringify({ ok: false, error: 'user_id or author_profile_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Resolve both IDs.
    let userId = body.user_id || null;
    let authorProfileId = body.author_profile_id || null;

    if (authorProfileId && !userId) {
      const { data } = await supabase.from('author_profiles')
        .select('user_id').eq('id', authorProfileId).maybeSingle();
      userId = data?.user_id || null;
    }
    if (userId && !authorProfileId) {
      const { data } = await supabase.from('author_profiles')
        .select('id').eq('user_id', userId).maybeSingle();
      authorProfileId = data?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: 'Could not resolve author user_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Suppression check
    const { data: supp } = await supabase.from('suppressed_emails')
      .select('reason').eq('email', email).maybeSingle();
    if (supp) {
      return new Response(JSON.stringify({
        ok: true, suppressed: true, reason: supp.reason, enrollments: [],
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Upsert subscriber (author_id = user_id, per RLS convention)
    const { data: sub, error: subErr } = await supabase
      .from('author_subscribers')
      .upsert({
        author_id: userId,
        email,
        name: body.name || null,
        source: body.source || 'enrollment',
        source_detail: body.source_detail || null,
        status: 'active',
      }, { onConflict: 'author_id,email' })
      .select('id, status')
      .single();
    if (subErr) throw subErr;

    // If they had previously unsubscribed and we're not re-opting them in, respect that.
    if (sub.status !== 'active') {
      return new Response(JSON.stringify({
        ok: true, subscriber_id: sub.id, suppressed: true, reason: sub.status, enrollments: [],
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const enrollments: Array<{ flow_id: string; flow_type: string; status: string; created: boolean }> = [];

    if (!authorProfileId) {
      // No author_profile means no flows can be queried — return early
      return new Response(JSON.stringify({
        ok: true, subscriber_id: sub.id, enrollments, note: 'no author_profile found; flows skipped',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Collect target flows:
    //   - master_nurture (always — global welcome)
    //   - BP-01 (always — the always-on welcome/nurture engine; Sprint 57)
    //   - node-specific match when body.node_id provided (e.g. BP-02, BP-05)
    // De-duped by flow.id so a BP-01 master flow isn't enrolled twice.
    const { data: flows } = await supabase
      .from('email_flows')
      .select('id, flow_type, node_id, status')
      .eq('author_id', authorProfileId)
      .in('status', ['active', 'draft']);

    const seen = new Set<string>();
    const targets = (flows || []).filter(f => {
      const match =
        f.flow_type === 'master_nurture' ||
        f.flow_type === 'BP-01' ||
        f.node_id === 'BP-01' ||
        (body.node_id && f.node_id === body.node_id);
      if (!match) return false;
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    for (const flow of targets) {
      // Idempotent: skip if already enrolled
      const { data: existing } = await supabase.from('email_flow_enrollments')
        .select('id, status').eq('flow_id', flow.id).eq('subscriber_id', sub.id).maybeSingle();

      if (existing) {
        enrollments.push({ flow_id: flow.id, flow_type: flow.flow_type, status: existing.status, created: false });
        continue;
      }

      // Only enroll in active flows; skip drafts (but report them)
      if (flow.status !== 'active') {
        enrollments.push({ flow_id: flow.id, flow_type: flow.flow_type, status: 'flow_not_active', created: false });
        continue;
      }

      const { error: enrErr } = await supabase.from('email_flow_enrollments').insert({
        flow_id: flow.id,
        subscriber_id: sub.id,
        current_step: 0,
        status: 'active',
        next_send_at: new Date().toISOString(), // send first step on next scheduler tick
      });
      if (enrErr) {
        enrollments.push({ flow_id: flow.id, flow_type: flow.flow_type, status: 'error:' + enrErr.message, created: false });
        continue;
      }
      enrollments.push({ flow_id: flow.id, flow_type: flow.flow_type, status: 'active', created: true });

      // Bump subscriber count (best-effort)
      const { data: f } = await supabase.from('email_flows').select('total_subscribers').eq('id', flow.id).single();
      await supabase.from('email_flows').update({
        total_subscribers: (f?.total_subscribers || 0) + 1,
      }).eq('id', flow.id);
    }

    // Instant welcome: kick the drip processor right now (don't wait for the 5-min cron).
    // Fire-and-forget — failures will be retried on the next cron tick.
    const createdAny = enrollments.some((e) => e.created);
    if (createdAny) {
      try {
        // Don't await beyond a short timeout — we just want to nudge the queue.
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 1500);
        await fetch(`${SUPABASE_URL}/functions/v1/process-email-flows`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trigger: 'enroll-subscriber-instant' }),
          signal: controller.signal,
        }).catch(() => {/* ignore — cron will pick it up */});
      } catch { /* ignore */ }
    }

    return new Response(JSON.stringify({
      ok: true, subscriber_id: sub.id, enrollments,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[enroll-subscriber] error', e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
