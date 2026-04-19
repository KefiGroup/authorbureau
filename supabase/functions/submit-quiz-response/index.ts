// Public quiz submission endpoint for /[slug]/free-gift
// Wraps submit-funnel with quiz_responses payload + redirect URL.
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
    const {
      author_slug,         // public slug
      funnel_slug,         // optional — locate funnel
      funnel_id,           // optional alt locator
      email,
      name,
      phone,
      answers,             // [{ question_number, answer_selected, answer_text }, ...]
      utm,
    } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve funnel
    let resolvedFunnelId = funnel_id;
    if (!resolvedFunnelId) {
      if (!author_slug) {
        return new Response(JSON.stringify({ error: 'funnel_id or author_slug required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: author } = await supabase
        .from('author_profiles').select('id, author_slug').eq('author_slug', author_slug).maybeSingle();
      if (!author) {
        return new Response(JSON.stringify({ error: 'Author not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      let q = supabase.from('funnels').select('id, slug, cta_url').eq('author_id', author.id).eq('status', 'live');
      if (funnel_slug) q = q.eq('slug', funnel_slug);
      else q = q.eq('node_id', 'BP-02').limit(1);
      const { data: funnel } = await q.maybeSingle();
      if (!funnel) {
        return new Response(JSON.stringify({ error: 'No live lead-magnet funnel for this author' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      resolvedFunnelId = funnel.id;
    }

    // Delegate to submit-funnel
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/submit-funnel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        ...(ip ? { 'x-forwarded-for': ip } : {}),
      },
      body: JSON.stringify({
        funnel_id: resolvedFunnelId,
        email, name, phone, utm,
        quiz_responses: Array.isArray(answers) ? answers : [],
      }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify(data), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build redirect to /[author_slug]/thank-you
    let thankYouUrl = data.redirect_url || null;
    if (!thankYouUrl && author_slug) thankYouUrl = `/${author_slug}/thank-you`;

    return new Response(JSON.stringify({
      success: true, lead_id: data.lead_id, redirect_url: thankYouUrl,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('submit-quiz-response error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
