import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { author_id, node_id, funnel_type, book_id, force, funnel_id } = await req.json();
    if (!author_id || !funnel_type) {
      return new Response(JSON.stringify({ error: 'author_id and funnel_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Idempotency: skip if a funnel already exists for this author + node (unless force)
    if (node_id && !force) {
      const { data: existing } = await supabase
        .from('funnels')
        .select('id, slug, status')
        .eq('author_id', author_id)
        .eq('node_id', node_id)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ skipped: true, funnel_id: existing.id, slug: existing.slug }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Pull author context
    const [{ data: profile }, { data: ctx }, bookRes] = await Promise.all([
      supabase.from('author_profiles').select('pen_name, tagline, methodology_name, bio_short').eq('id', author_id).maybeSingle(),
      supabase.from('author_context').select('book_title, core_thesis, target_audience_persona, key_frameworks').eq('author_id', author_id).maybeSingle(),
      book_id ? supabase.from('books').select('title, subtitle, description').eq('id', book_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const book = bookRes.data;
    const focusByType: Record<string, string> = {
      opt_in: 'a high-converting newsletter opt-in page that promises a clear, recurring benefit',
      lead_magnet: 'a high-converting lead-magnet opt-in page that promises a quick win in exchange for an email',
      webinar: 'a webinar registration page that builds anticipation and credibility',
      webinar_registration: 'a webinar registration page that builds anticipation and credibility',
      sales: 'a long-form sales page that justifies the price and overcomes objections',
    };

    const systemPrompt = `You are an elite direct-response copywriter. Generate funnel page copy as JSON only.`;
    const userPrompt = `Generate copy for ${focusByType[funnel_type] || focusByType.opt_in}.

AUTHOR: ${profile?.pen_name || 'the author'}
TAGLINE: ${profile?.tagline || ''}
METHODOLOGY: ${profile?.methodology_name || ''}
BIO: ${profile?.bio_short || ''}
BOOK: ${book?.title || ctx?.book_title || ''} — ${book?.subtitle || ''}
THESIS: ${ctx?.core_thesis || book?.description || ''}
AUDIENCE: ${JSON.stringify(ctx?.target_audience_persona || {})}

Return JSON with: title (5-8 words), slug (kebab-case, max 40 chars), headline (10-15 words, benefit-driven), subheadline (15-25 words, who/what/why), body_copy (2-3 short paragraphs in markdown), cta_text (3-5 words, action verb).`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'save_funnel_copy',
            description: 'Save generated funnel copy',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                slug: { type: 'string' },
                headline: { type: 'string' },
                subheadline: { type: 'string' },
                body_copy: { type: 'string' },
                cta_text: { type: 'string' },
              },
              required: ['title', 'slug', 'headline', 'subheadline', 'body_copy', 'cta_text'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'save_funnel_copy' } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error('AI error', aiRes.status, t);
      if (aiRes.status === 429 || aiRes.status === 402) {
        return new Response(JSON.stringify({ error: aiRes.status === 429 ? 'Rate limited' : 'Credits exhausted' }), {
          status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const copy = typeof args === 'string' ? JSON.parse(args) : args;
    if (!copy?.headline) throw new Error('AI returned no copy');

    // Ensure unique slug per author
    let slug = slugify(copy.slug || copy.title);
    let suffix = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const { data: clash } = await supabase
        .from('funnels')
        .select('id')
        .eq('author_id', author_id)
        .eq('slug', candidate)
        .maybeSingle();
      if (!clash) { slug = candidate; break; }
      suffix++;
      if (suffix > 20) { slug = `${slug}-${Date.now().toString(36)}`; break; }
    }

    let inserted: any;
    if (force && funnel_id) {
      // Update existing funnel in place (regenerate)
      const { data: updated, error: updErr } = await supabase
        .from('funnels')
        .update({
          funnel_type,
          title: copy.title,
          headline: copy.headline,
          subheadline: copy.subheadline,
          body_copy: copy.body_copy,
          cta_text: copy.cta_text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', funnel_id)
        .eq('author_id', author_id)
        .select()
        .single();
      if (updErr) throw updErr;
      inserted = updated;
    } else {
      const { data: created, error: insErr } = await supabase
        .from('funnels')
        .insert({
          author_id,
          node_id: node_id || null,
          funnel_type,
          title: copy.title,
          slug,
          headline: copy.headline,
          subheadline: copy.subheadline,
          body_copy: copy.body_copy,
          cta_text: copy.cta_text,
          status: 'draft',
        })
        .select()
        .single();
      if (insErr) throw insErr;
      inserted = created;
    }

    return new Response(JSON.stringify({ success: true, funnel: inserted }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-funnel error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
