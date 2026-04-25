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

type Archetype = 'A' | 'B' | 'C' | 'D';

// Map legacy/explicit funnel_type strings to one of the 4 archetypes.
function funnelTypeToArchetype(funnelType: string): Archetype {
  switch (funnelType) {
    case 'sales':
    case 'product_sales':
    case 'archetype_a':
      return 'A';
    case 'opt_in':
    case 'lead_magnet':
    case 'webinar':
    case 'webinar_registration':
    case 'archetype_b':
      return 'B';
    case 'application':
    case 'high_touch':
    case 'archetype_c':
      return 'C';
    case 'event':
    case 'ticket':
    case 'external':
    case 'archetype_d':
      return 'D';
    default:
      return 'B'; // safest default — opt-in
  }
}

function archetypeTemplate(
  archetype: Archetype,
  ctx: {
    pen_name: string;
    tagline: string;
    methodology: string;
    bio: string;
    book_title: string;
    book_subtitle: string;
    thesis: string;
    audience: string;
  },
): { system: string; user: string; focus: string } {
  const sharedHeader = `AUTHOR: ${ctx.pen_name}
TAGLINE: ${ctx.tagline}
METHODOLOGY: ${ctx.methodology}
BIO: ${ctx.bio}
BOOK: ${ctx.book_title}${ctx.book_subtitle ? ' — ' + ctx.book_subtitle : ''}
THESIS: ${ctx.thesis}
AUDIENCE: ${ctx.audience}`;

  switch (archetype) {
    case 'A': {
      const focus = 'a long-form sales page that justifies the price and overcomes objections for a digital, instant-delivery product';
      return {
        focus,
        system: `You are an elite direct-response copywriter specialising in digital product sales pages. Write copy that overcomes price objections, builds desire, and earns the click. Output JSON only.`,
        user: `Generate copy for ${focus}.

${sharedHeader}

Write a long-form sales page with this structure inside body_copy (markdown):
1. Open with the reader's pain or unspoken desire (1-2 lines, hook).
2. Promise the transformation in concrete terms.
3. Introduce the product as the bridge — what it is, how it works.
4. Bullet 4-6 outcomes the reader will get (use "You'll…" framing).
5. Address the top 2 objections (price/time/skepticism).
6. Close with urgency and a clear next step.

Return JSON with: title (5-8 words, product-led), slug (kebab-case, max 40 chars), headline (10-15 words, outcome-driven), subheadline (15-25 words, who-it's-for + main benefit), body_copy (the structured markdown above), cta_text (3-5 words, action verb — "Get instant access", "Buy now", "Start today").`,
      };
    }
    case 'B': {
      const focus = 'a high-converting opt-in page that promises a quick, valuable win in exchange for an email';
      return {
        focus,
        system: `You are an elite direct-response copywriter specialising in lead-magnet and opt-in pages. Write copy that promises one specific, immediately-useful win and removes friction. Output JSON only.`,
        user: `Generate copy for ${focus}.

${sharedHeader}

Write opt-in copy with this structure inside body_copy (markdown):
1. One-line promise of the specific result (no fluff).
2. Three bullet points: what they'll discover / get / be able to do.
3. One line of social proof or credibility (refer to author/methodology).
4. A reassurance line ("No spam. Unsubscribe anytime.").

Keep total body under 180 words. Return JSON with: title (5-8 words), slug (kebab-case, max 40 chars), headline (8-12 words, benefit-led), subheadline (15-25 words, the specific quick win), body_copy (the structured markdown above), cta_text (3-5 words — "Send it to me", "Get the guide", "Save my seat").`,
      };
    }
    case 'C': {
      const focus = 'an application page for a high-touch service (coaching, mastermind, certification) that pre-qualifies the right reader';
      return {
        focus,
        system: `You are an elite direct-response copywriter specialising in high-ticket application funnels. Write copy that attracts qualified applicants and self-selects everyone else out. Output JSON only.`,
        user: `Generate copy for ${focus}.

${sharedHeader}

Write application-page copy with this structure inside body_copy (markdown):
1. Headline-restated promise (1 line).
2. "This is for you if…" — 4 bullets describing the qualified applicant.
3. "This is NOT for you if…" — 2 bullets that filter out tyre-kickers.
4. What the experience includes (3-5 bullets — sessions, deliverables, access).
5. The application step explained: "Apply now. We'll review within 48 hours and book a call if it's a fit."

Return JSON with: title (5-8 words, programme-led), slug (kebab-case, max 40 chars), headline (10-15 words, transformation-led), subheadline (15-25 words, who-it's-for), body_copy (the structured markdown above), cta_text (3-5 words — "Apply now", "Request an interview", "Start my application").`,
      };
    }
    case 'D': {
      const focus = 'an event/ticket page that builds anticipation and drives a registration or external booking click';
      return {
        focus,
        system: `You are an elite event copywriter. Write copy that captures the energy, urgency, and exclusivity of an in-person or hybrid event. Output JSON only.`,
        user: `Generate copy for ${focus}.

${sharedHeader}

Write event-page copy with this structure inside body_copy (markdown):
1. One-line opening that sets the date/place/vibe.
2. "What you'll experience" — 3-5 vivid bullets (sessions, speakers, breakthroughs).
3. "Who's in the room" — 1-2 lines describing the audience peer group.
4. Logistics line: dates, location/virtual, what's included.
5. Scarcity line: limited seats / early-bird / closes soon.

Return JSON with: title (5-8 words, event-led), slug (kebab-case, max 40 chars), headline (10-15 words, evocative), subheadline (15-25 words, what-and-when), body_copy (the structured markdown above), cta_text (3-5 words — "Reserve my seat", "Get tickets", "Register now").`,
      };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
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

    // Resolve archetype: prefer the node's tagged archetype when node_id is provided,
    // fall back to mapping from funnel_type. This keeps the API backward-compatible.
    let archetype: Archetype = funnelTypeToArchetype(funnel_type);
    if (node_id) {
      const { data: nodeRow } = await supabase
        .from('author_nodes')
        .select('archetype')
        .eq('author_id', author_id)
        .eq('node_id', node_id)
        .limit(1)
        .maybeSingle();
      if (nodeRow?.archetype && ['A', 'B', 'C', 'D'].includes(nodeRow.archetype)) {
        archetype = nodeRow.archetype as Archetype;
      }
    }

    // Pull author context
    const [{ data: profile }, { data: ctx }, bookRes] = await Promise.all([
      supabase.from('author_profiles').select('pen_name, tagline, methodology_name, bio_short').eq('id', author_id).maybeSingle(),
      supabase.from('author_context').select('book_title, core_thesis, target_audience_persona, key_frameworks').eq('author_id', author_id).maybeSingle(),
      book_id ? supabase.from('books').select('title, subtitle, description').eq('id', book_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const book = bookRes.data;
    const tmpl = archetypeTemplate(archetype, {
      pen_name: profile?.pen_name || 'the author',
      tagline: profile?.tagline || '',
      methodology: profile?.methodology_name || '',
      bio: profile?.bio_short || '',
      book_title: book?.title || ctx?.book_title || '',
      book_subtitle: book?.subtitle || '',
      thesis: ctx?.core_thesis || book?.description || '',
      audience: JSON.stringify(ctx?.target_audience_persona || {}),
    });

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          { role: 'system', content: tmpl.system },
          { role: 'user', content: tmpl.user },
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

    return new Response(JSON.stringify({ success: true, funnel: inserted, archetype }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-funnel error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
