import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Reminder windows (minutes before scheduled_at)
const PRE_WINDOWS: { col: string; minBefore: number; kind: string; window: number }[] = [
  { col: 'reminder_24h_sent_at', minBefore: 24 * 60, kind: 'reminder_24h', window: 30 },
  { col: 'reminder_1h_sent_at',  minBefore: 60,      kind: 'reminder_1h',  window: 15 },
  { col: 'reminder_15m_sent_at', minBefore: 15,      kind: 'reminder_15m', window: 5 },
];
// Follow-ups (minutes AFTER scheduled_at)
const POST_WINDOWS: { col: string; minAfter: number; kind: string; window: number }[] = [
  { col: 'followup_sameday_sent_at', minAfter: 4 * 60,         kind: 'followup_sameday', window: 60 },
  { col: 'followup_day3_sent_at',    minAfter: 3 * 24 * 60,    kind: 'followup_day3',    window: 6 * 60 },
  { col: 'followup_day7_sent_at',    minAfter: 7 * 24 * 60,    kind: 'followup_day7',    window: 6 * 60 },
];

function fmt(d: Date) {
  return d.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();

  // Pull all registrations whose webinar is scheduled within the broadest window we care about
  // (-7d ... +24h relative to now)
  const lower = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const upper = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const { data: webinars, error: wErr } = await supabase
    .from('webinars')
    .select('id, author_id, title, description, scheduled_at, room_url, slug, status')
    .gte('scheduled_at', lower)
    .lte('scheduled_at', upper)
    .in('status', ['published', 'live']);

  if (wErr) {
    console.error('[process-webinar-emails] fetch webinars failed', wErr);
    return new Response(JSON.stringify({ error: wErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sent = 0, errors = 0;

  for (const w of webinars || []) {
    if (!w.scheduled_at) continue;
    const sched = new Date(w.scheduled_at);
    const diffMin = (sched.getTime() - now.getTime()) / 60000; // positive = future, negative = past

    // Determine which reminder/follow-up windows currently fire
    const due: { col: string; kind: string }[] = [];
    for (const p of PRE_WINDOWS) {
      // We send when current time is between (sched - minBefore) and (sched - minBefore + window)
      // i.e., diffMin is in [minBefore - window, minBefore]
      if (diffMin <= p.minBefore && diffMin >= p.minBefore - p.window) {
        due.push({ col: p.col, kind: p.kind });
      }
    }
    for (const p of POST_WINDOWS) {
      const elapsed = -diffMin; // minutes since scheduled
      if (elapsed >= p.minAfter && elapsed <= p.minAfter + p.window) {
        due.push({ col: p.col, kind: p.kind });
      }
    }
    if (!due.length) continue;

    // Author context
    const { data: author } = await supabase
      .from('author_profiles')
      .select('pen_name, sign_off_phrase, author_slug')
      .eq('id', w.author_id)
      .maybeSingle();
    const authorPageUrl = author?.author_slug ? `https://authorsbureau.com/${author.author_slug}` : '';

    // For each due window, fetch registrants who haven't been sent that kind yet
    for (const d of due) {
      const { data: regs } = await supabase
        .from('webinar_registrations')
        .select(`id, email, name, ${d.col}`)
        .eq('webinar_id', w.id)
        .is(d.col, null);

      for (const r of regs || []) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'webinar-email',
              recipientEmail: r.email,
              idempotencyKey: `webinar-${d.kind}-${r.id}`,
              templateData: {
                kind: d.kind,
                attendeeName: r.name || 'there',
                webinarTitle: w.title,
                webinarDescription: w.description || '',
                scheduledAtFormatted: fmt(sched),
                roomUrl: w.room_url || '',
                authorName: author?.pen_name || 'Your host',
                authorPageUrl,
                signOffPhrase: author?.sign_off_phrase || 'Talk soon',
              },
            },
          });
          await supabase.from('webinar_registrations')
            .update({ [d.col]: new Date().toISOString() })
            .eq('id', r.id);
          sent++;
        } catch (e) {
          console.warn('[process-webinar-emails] send failed', d.kind, r.email, e);
          errors++;
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
