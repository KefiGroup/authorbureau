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
    const { webinar_id, email, name } = await req.json();
    if (!webinar_id || !email) {
      return new Response(JSON.stringify({ error: 'webinar_id and email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cleanEmail = email.toLowerCase().trim();

    // Load webinar
    const { data: webinar, error: wErr } = await supabase
      .from('webinars')
      .select('id, author_id, title, description, scheduled_at, room_url, status, slug')
      .eq('id', webinar_id)
      .maybeSingle();
    if (wErr || !webinar) {
      return new Response(JSON.stringify({ error: 'Webinar not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (webinar.status !== 'published' && webinar.status !== 'live') {
      return new Response(JSON.stringify({ error: 'Webinar not open for registration' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotent registration (one row per email per webinar)
    const { data: existing } = await supabase
      .from('webinar_registrations')
      .select('id, confirmation_sent_at')
      .eq('webinar_id', webinar.id)
      .eq('email', cleanEmail)
      .maybeSingle();

    let registrationId = existing?.id as string | undefined;
    if (!existing) {
      const { data: ins, error: insErr } = await supabase
        .from('webinar_registrations')
        .insert({
          webinar_id: webinar.id,
          author_id: webinar.author_id,
          email: cleanEmail,
          name: name || null,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      registrationId = ins.id;
    }

    // Resolve author profile for context
    const { data: author } = await supabase
      .from('author_profiles')
      .select('user_id, pen_name, sign_off_phrase, author_slug')
      .eq('id', webinar.author_id)
      .maybeSingle();

    // Lead scoring (+15 for registration) — keyed by author user_id + email in crm_contacts
    if (author?.user_id) {
      try {
        const { data: contact } = await supabase
          .from('crm_contacts')
          .select('id, abby_score')
          .eq('author_id', author.user_id)
          .eq('email', cleanEmail)
          .maybeSingle();
        const newScore = Math.min(100, (contact?.abby_score || 0) + 15);
        if (contact) {
          await supabase.from('crm_contacts').update({
            abby_score: newScore,
            last_activity_at: new Date().toISOString(),
            last_node_id: 'BP-05',
          }).eq('id', contact.id);
        } else {
          await supabase.from('crm_contacts').insert({
            author_id: author.user_id,
            email: cleanEmail,
            full_name: name || cleanEmail,
            abby_score: 15,
            stage: 'new',
            source: 'webinar',
            last_activity_at: new Date().toISOString(),
            last_node_id: 'BP-05',
          });
        }
      } catch (e) {
        console.warn('[webinar-register] crm upsert failed', e);
      }
    }

    // Send confirmation email immediately (only if not already sent)
    if (!existing?.confirmation_sent_at) {
      const scheduledFmt = webinar.scheduled_at
        ? new Date(webinar.scheduled_at).toLocaleString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
          })
        : '';
      const authorPageUrl = author?.author_slug
        ? `https://authorsbureau.com/${author.author_slug}`
        : '';

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'webinar-email',
            recipientEmail: cleanEmail,
            idempotencyKey: `webinar-confirm-${registrationId}`,
            templateData: {
              kind: 'confirmation',
              attendeeName: name || 'there',
              webinarTitle: webinar.title,
              webinarDescription: webinar.description || '',
              scheduledAtFormatted: scheduledFmt,
              roomUrl: webinar.room_url || '',
              authorName: author?.pen_name || 'Your host',
              authorPageUrl,
              signOffPhrase: author?.sign_off_phrase || 'Talk soon',
            },
          },
        });
        await supabase.from('webinar_registrations')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('id', registrationId);
      } catch (e) {
        console.warn('[webinar-register] confirmation email failed', e);
      }
    }

    return new Response(JSON.stringify({ ok: true, registration_id: registrationId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[webinar-register] error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
