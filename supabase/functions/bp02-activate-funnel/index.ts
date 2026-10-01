import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function slugify(s: string): string {
  return (s || 'lead-magnet')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'lead-magnet';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth: validate user JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { node_id = 'BP-02', lead_magnet_title, headline, subheadline, book_id = null } = body;

    // Resolve author_profile for this user
    const { data: author, error: authorErr } = await supabase
      .from('author_profiles')
      .select('id, pen_name, author_slug')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (authorErr || !author) {
      return new Response(JSON.stringify({ error: 'Author profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const title = lead_magnet_title || 'Free Lead Magnet';
    // Idempotent: BP-02 always uses the canonical 'free-gift' slug so MicrositePage routes correctly.
    const slug = 'free-gift';

    // Public links must carry the book segment. Authors have many books and each
    // book has its own lead magnet; a 2-segment link resolves to whichever book
    // matched first, which showed readers the wrong book's page.
    let bookSlug: string | null = null;
    if (book_id) {
      const { data: bookRow } = await supabase
        .from('books')
        .select('slug')
        .eq('id', book_id)
        .maybeSingle();
      bookSlug = (bookRow?.slug as string) || null;
    }
    const authorPrefix = author.author_slug ? `/${author.author_slug}` : '';
    const publicFunnelUrl = bookSlug
      ? `${authorPrefix}/${bookSlug}/${slug}`
      : `${authorPrefix}/${slug}`;
    const thankYouUrl = `${authorPrefix}/thank-you`;

    // Idempotent upsert — if a funnel for (author_id, node_id) exists, update it; else insert.
    const { data: existingFunnel } = await supabase
      .from('funnels')
      .select('id')
      .eq('author_id', author.id)
      .eq('node_id', node_id)
      .maybeSingle();

    const funnelPayload = {
      author_id: author.id,
      node_id,
      ...(book_id ? { book_id } : {}),
      funnel_type: 'opt_in',
      title,
      slug,
      headline: headline || `Get ${title} — Free`,
      subheadline: subheadline || 'Drop your email and get instant access.',
      body_copy: 'No spam. Unsubscribe anytime.',
      cta_text: 'Get Instant Access',
      cta_url: thankYouUrl,
      status: 'live',
      published_at: new Date().toISOString(),
    };

    let funnel: { id: string; slug: string };
    if (existingFunnel) {
      const { data: updated, error: upErr } = await supabase
        .from('funnels')
        .update(funnelPayload)
        .eq('id', existingFunnel.id)
        .select('id, slug')
        .single();
      if (upErr) throw upErr;
      funnel = updated;
    } else {
      const { data: inserted, error: funnelErr } = await supabase
        .from('funnels')
        .insert(funnelPayload)
        .select('id, slug')
        .single();
      if (funnelErr) throw funnelErr;
      funnel = inserted;
    }

    // Seed welcome email_flow if missing
    const { data: existingFlow } = await supabase
      .from('email_flows')
      .select('id')
      .eq('author_id', author.id)
      .eq('node_id', node_id)
      .maybeSingle();

    let flowId = existingFlow?.id;
    if (!flowId) {
      const { data: newFlow, error: flowErr } = await supabase
        .from('email_flows')
        .insert({
          author_id: author.id,
          node_id,
          flow_type: 'lead_magnet_welcome',
          title: `${title} – Welcome Sequence`,
          description: 'Auto-generated on BP-02 activation',
          status: 'active',
          ai_generated: false,
        })
        .select('id')
        .single();
      if (flowErr) throw flowErr;
      flowId = newFlow.id;

      // Step 1: instant delivery
      await supabase.from('email_flow_steps').insert([
        {
          flow_id: flowId,
          step_number: 1,
          trigger_delay_days: 0,
          subject: `Here's your ${title}`,
          preview_text: 'Your free guide is ready inside.',
          body_markdown: `Hi {{name}},\n\nThanks for grabbing **${title}** — here's your instant access.\n\n[Open it now](${publicFunnelUrl})\n\nOver the next few days I'll share a few short notes that go deeper. Reply any time — I read every email.\n\nTalk soon,\n${author.pen_name || 'The Author'}`,
          status: 'active',
        },
        {
          flow_id: flowId,
          step_number: 2,
          trigger_delay_days: 2,
          subject: 'Did this part land for you?',
          preview_text: 'A quick question about the guide.',
          body_markdown: `Hi {{name}},\n\nQuick question — what was the most useful idea from **${title}**?\n\nHit reply and tell me. I'll send something tailored back.\n\n${author.pen_name || 'The Author'}`,
          status: 'active',
        },
        {
          flow_id: flowId,
          step_number: 3,
          trigger_delay_days: 5,
          subject: 'The next step (if you want it)',
          preview_text: 'Where to go from here.',
          body_markdown: `Hi {{name}},\n\nIf the guide helped, you might want the full book it came from. Here's where to grab it:\n\n[Get the book](#)\n\n${author.pen_name || 'The Author'}`,
          status: 'active',
        },
      ]);
    }

    // Update the author_node row to reflect activation. Module rows are unique
    // per (author, node, book), so the update must be scoped to this book —
    // otherwise activating one book's lead magnet rewrote the others.
    const nodeQuery = supabase
      .from('author_nodes')
      .select('id')
      .eq('author_id', author.id)
      .eq('node_id', node_id);
    const { data: existingNode } = book_id
      ? await nodeQuery.eq('book_id', book_id).maybeSingle()
      : await nodeQuery.order('created_at', { ascending: true }).limit(1).maybeSingle();

    const nodePatch = {
      node_name: 'Lead Magnet',
      status: 'live',
      activated_at: new Date().toISOString(),
      microsite_url: publicFunnelUrl,
    };

    if (existingNode) {
      await supabase.from('author_nodes').update(nodePatch).eq('id', existingNode.id);
    } else {
      await supabase.from('author_nodes').insert({
        author_id: author.id,
        node_id,
        book_id,
        ...nodePatch,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      funnel_id: funnel.id,
      funnel_slug: funnel.slug,
      flow_id: flowId,
      public_url: publicFunnelUrl,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('bp02-activate-funnel error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
