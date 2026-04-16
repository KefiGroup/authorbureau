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
    const body = await req.json();
    const { funnel_id, email, name, phone, custom_fields, utm } = body;
    if (!funnel_id || !email) {
      return new Response(JSON.stringify({ error: 'funnel_id and email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: funnel, error: fErr } = await supabase
      .from('funnels')
      .select('id, author_id, node_id, conversions, cta_url')
      .eq('id', funnel_id)
      .eq('status', 'live')
      .maybeSingle();
    if (fErr || !funnel) {
      return new Response(JSON.stringify({ error: 'Funnel not live' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    // Insert submission
    await supabase.from('funnel_submissions').insert({
      funnel_id: funnel.id,
      author_id: funnel.author_id,
      email,
      name: name || null,
      phone: phone || null,
      custom_fields: custom_fields || {},
      ip_address: ip,
      utm_source: utm?.source || null,
      utm_medium: utm?.medium || null,
      utm_campaign: utm?.campaign || null,
      utm_term: utm?.term || null,
      utm_content: utm?.content || null,
    });

    // Increment conversions
    await supabase.from('funnels').update({ conversions: (funnel.conversions || 0) + 1 }).eq('id', funnel.id);

    // Upsert subscriber
    const { data: existingSub } = await supabase
      .from('author_subscribers')
      .select('id')
      .eq('author_id', funnel.author_id)
      .eq('email', email)
      .maybeSingle();

    let subscriberId = existingSub?.id;
    if (!subscriberId) {
      const { data: newSub } = await supabase
        .from('author_subscribers')
        .insert({ author_id: funnel.author_id, email, name: name || null, source: 'funnel', source_detail: funnel.id, status: 'active' })
        .select('id')
        .single();
      subscriberId = newSub?.id;
    }

    // Trigger matching email sequence if one exists for this node
    if (funnel.node_id && subscriberId) {
      const { data: flow } = await supabase
        .from('email_flows')
        .select('id')
        .eq('author_id', funnel.author_id)
        .eq('node_id', funnel.node_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (flow) {
        await fetch(`${SUPABASE_URL}/functions/v1/trigger-sequence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ flow_id: flow.id, subscriber_id: subscriberId, email, name }),
        }).catch((e) => console.warn('trigger-sequence failed', e));
      }
    }

    return new Response(JSON.stringify({ success: true, redirect_url: funnel.cta_url || null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('submit-funnel error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
