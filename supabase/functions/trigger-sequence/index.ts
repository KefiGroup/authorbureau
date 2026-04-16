import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Resolve subscriber: prefer existing subscriber_id, else find/create from email
    let subId = subscriber_id;
    const { data: flow } = await supabase.from('email_flows').select('author_id, book_id, title').eq('id', flow_id).single();
    if (!flow) throw new Error('Flow not found');

    if (!subId && email) {
      const { data: existing } = await supabase
        .from('author_subscribers')
        .select('id')
        .eq('author_id', flow.author_id)
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        subId = existing.id;
      } else {
        const { data: created, error: subErr } = await supabase
          .from('author_subscribers')
          .insert({ author_id: flow.author_id, email, name: name || null, source: 'sequence_trigger', status: 'active' })
          .select('id')
          .single();
        if (subErr) throw subErr;
        subId = created.id;
      }
    }

    if (!subId) throw new Error('subscriber_id or email required');

    // Idempotent enrollment
    const { data: existingEnrollment } = await supabase
      .from('email_flow_enrollments')
      .select('id, status')
      .eq('flow_id', flow_id)
      .eq('subscriber_id', subId)
      .maybeSingle();

    if (existingEnrollment) {
      return new Response(JSON.stringify({ success: true, status: 200, message: 'Already enrolled', enrollment_id: existingEnrollment.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: enrollment, error: enrErr } = await supabase
      .from('email_flow_enrollments')
      .insert({ flow_id, subscriber_id: subId, current_step: 0, status: 'active' })
      .select()
      .single();
    if (enrErr) throw enrErr;

    // Bump total_subscribers metric
    await supabase.rpc('increment_flow_subscribers', { p_flow_id: flow_id }).then(() => {}, () =>
      // fallback: direct update if rpc not present
      supabase.from('email_flows').select('total_subscribers').eq('id', flow_id).single().then(({ data }) =>
        supabase.from('email_flows').update({ total_subscribers: (data?.total_subscribers || 0) + 1 }).eq('id', flow_id)
      )
    );

    // Log lead activity if lead_id present
    if (lead_id) {
      await supabase.from('lead_activities').insert({
        lead_id,
        author_id: flow.author_id,
        activity_type: 'sequence_enrolled',
        metadata: { flow_id, flow_title: flow.title },
      });
    }

    return new Response(JSON.stringify({ success: true, status: 200, message: 'Enrolled', enrollment_id: enrollment.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trigger-sequence error', e);
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
