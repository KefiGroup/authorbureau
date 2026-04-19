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
    const { node_id = 'BP-02', lead_magnet_title, headline, subheadline } = body;

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
    const baseSlug = slugify(title);

    // Build a unique slug per author
    let slug = baseSlug;
    let attempt = 1;
    while (true) {
      const { data: clash } = await supabase
        .from('funnels')
        .select('id')
        .eq('author_id', author.id)
        .eq('slug', slug)
        .maybeSingle();
      if (!clash) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
      if (attempt > 20) break;
    }

    const thankYouUrl = author.author_slug ? `/${author.author_slug}/thank-you` : `/thank-you`;

    // Insert opt-in funnel
    const { data: funnel, error: funnelErr } = await supabase
      .from('funnels')
      .insert({
        author_id: author.id,
        node_id,
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
      })
      .select('id, slug')
      .single();
    if (funnelErr) throw funnelErr;

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
          body_markdown: `Hi {{name}},\n\nThanks for grabbing **${title}** — here's your instant access.\n\n[Open it now](${thankYouUrl})\n\nOver the next few days I'll share a few short notes that go deeper. Reply any time — I read every email.\n\nTalk soon,\n${author.pen_name || 'The Author'}`,
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

    // Update author_node row to reflect activation
    await supabase.from('author_nodes').upsert({
      author_id: author.id,
      node_id,
      node_name: 'Lead Magnet',
      status: 'live',
      activated_at: new Date().toISOString(),
      microsite_url: `/${author.author_slug || ''}/${funnel.slug}`,
    }, { onConflict: 'author_id,node_id' });

    return new Response(JSON.stringify({
      success: true,
      funnel_id: funnel.id,
      funnel_slug: funnel.slug,
      flow_id: flowId,
      public_url: `/${author.author_slug || ''}/${funnel.slug}`,
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
