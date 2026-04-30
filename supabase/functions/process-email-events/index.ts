import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Score weights for ABBY lead scoring
const SCORE_WEIGHTS: Record<string, number> = {
  'email.delivered': 1,
  'email.opened': 3,
  'email.clicked': 7,
  'email.bounced': -5,
  'email.complained': -10,
  'email.unsubscribed': -15,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    // Resend webhook shape: { type, created_at, data: { email_id, to, ... } }
    const eventType = payload.type || payload.event;
    const data = payload.data || payload;
    const messageId = data.email_id || data.message_id;
    const recipient = Array.isArray(data.to) ? data.to[0] : data.to;

    if (!eventType || !recipient) {
      return new Response(JSON.stringify({ success: false, status: 400, message: 'Invalid event payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    // Update email_send_log
    const updates: Record<string, unknown> = {};
    if (eventType === 'email.opened') updates.opened_at = now;
    if (eventType === 'email.clicked') updates.clicked_at = now;
    if (eventType === 'email.bounced') updates.status = 'bounced';
    if (eventType === 'email.complained') updates.status = 'complained';

    let logRow: any = null;
    if (Object.keys(updates).length && messageId) {
      const { data: row } = await supabase
        .from('email_send_log')
        .update(updates)
        .eq('message_id', messageId)
        .select('lead_id, author_id, sequence_step_id')
        .maybeSingle();
      logRow = row;
    }

    // Resolve lead by email if no log row
    let leadId = logRow?.lead_id;
    let authorId = logRow?.author_id;
    if (!leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, author_id, abby_score')
        .eq('email', recipient)
        .maybeSingle();
      if (lead) { leadId = lead.id; authorId = lead.author_id; }
    }

    // Append lead activity + bump score
    if (leadId) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        author_id: authorId,
        activity_type: eventType,
        metadata: { message_id: messageId, step_id: logRow?.sequence_step_id || null },
      });

      const delta = SCORE_WEIGHTS[eventType] || 0;
      if (delta !== 0) {
        const { data: cur } = await supabase.from('leads').select('abby_score, stage').eq('id', leadId).single();
        const newScore = Math.max(0, (cur?.abby_score || 0) + delta);
        let stage = cur?.stage || 'new';
        if (newScore >= 50) stage = 'hot';
        else if (newScore >= 20) stage = 'warm';
        else if (newScore >= 5) stage = 'engaged';
        await supabase.from('leads').update({ abby_score: newScore, stage, last_activity_at: now }).eq('id', leadId);

        // Mirror the score + stage bump to crm_contacts (Hot Leads source).
        // Silent no-op if there's no matching contact row.
        if (authorId) {
          try {
            const { data: leadRow } = await supabase
              .from('leads').select('email').eq('id', leadId).maybeSingle();
            const leadEmail = leadRow?.email?.toLowerCase();
            if (leadEmail) {
              const { data: contact } = await supabase
                .from('crm_contacts')
                .select('id, abby_score')
                .eq('author_id', authorId)
                .eq('email', leadEmail)
                .maybeSingle();
              if (contact) {
                const contactNewScore = Math.min(100, Math.max(0, (contact.abby_score || 0) + delta));
                let contactStage = 'new_lead';
                if (contactNewScore >= 50) contactStage = 'hot';
                else if (contactNewScore >= 20) contactStage = 'warm';
                else if (contactNewScore >= 5) contactStage = 'engaged';
                await supabase.from('crm_contacts').update({
                  abby_score: contactNewScore,
                  stage: contactStage,
                  last_activity_at: now,
                }).eq('id', contact.id);
              }
            }
          } catch (mirrorErr) {
            console.warn('[process-email-events] crm_contacts mirror failed (non-fatal)', mirrorErr);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, status: 200, message: 'Event processed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('process-email-events error', e);
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
