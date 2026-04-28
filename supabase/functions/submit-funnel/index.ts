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
    const { funnel_id, email, name, phone, custom_fields, utm, quiz_responses } = body;
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
      .select('id, author_id, node_id, conversions, cta_url, title')
      .eq('id', funnel_id)
      .eq('status', 'live')
      .maybeSingle();
    if (fErr || !funnel) {
      return new Response(JSON.stringify({ error: 'Funnel not live' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build a human-friendly source label so CRM doesn't show "Unknown".
    // Examples: "SUCKCESS Stage Quiz — BP-02", "Free Webinar — BP-05".
    const sourceLabel = funnel.title
      ? `${funnel.title}${funnel.node_id ? ` — ${funnel.node_id}` : ''}`
      : 'funnel';

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const cleanEmail = email.toLowerCase().trim();

    // Resolve canonical author_user_id from author_profiles (crm_contacts is keyed by user_id)
    let authorUserId: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('author_profiles')
        .select('user_id')
        .eq('id', funnel.author_id)
        .maybeSingle();
      authorUserId = profile?.user_id ?? null;
    } catch (e) {
      console.warn('[submit-funnel] author_user_id resolve failed', e);
    }
    console.log('[submit-funnel] 📝 WRITE AUDIT', JSON.stringify({
      funnel_id: funnel.id,
      funnel_author_id_profile: funnel.author_id,
      author_user_id: authorUserId,
      email: cleanEmail,
      node_id: funnel.node_id,
    }));
    console.log(`[submit-funnel] author_user_id=${authorUserId}`);

    // 1) Funnel submission
    await supabase.from('funnel_submissions').insert({
      funnel_id: funnel.id,
      author_id: funnel.author_id,
      email: cleanEmail,
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

    await supabase.from('funnels').update({ conversions: (funnel.conversions || 0) + 1 }).eq('id', funnel.id);

    // 2) Upsert lead with abby_score=10 (Fix 1)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, abby_score')
      .eq('author_id', funnel.author_id)
      .eq('email', cleanEmail)
      .maybeSingle();

    let leadId: string | undefined;
    if (existingLead) {
      leadId = existingLead.id;
      await supabase.from('leads').update({
        name: name || null,
        last_activity_at: new Date().toISOString(),
        abby_score: Math.max(existingLead.abby_score || 0, 10),
        stage: 'new',
      }).eq('id', leadId);
    } else {
      const { data: newLead, error: leadErr } = await supabase.from('leads').insert({
        author_id: funnel.author_id,
        email: cleanEmail,
        name: name || null,
        source: sourceLabel,
        status: 'active',
        nurture_stage: 'welcome',
        stage: 'new',
        abby_score: 10,
        captured_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        metadata: { funnel_id: funnel.id, funnel_title: funnel.title, node_id: funnel.node_id },
      }).select('id').single();
      if (leadErr) console.error('lead insert error', leadErr);
      leadId = newLead?.id;
    }

    // 3) Quiz responses (Fix 1)
    if (Array.isArray(quiz_responses) && quiz_responses.length && leadId) {
      const rows = quiz_responses.map((q: any, idx: number) => ({
        lead_id: leadId,
        question_number: q.question_number ?? idx + 1,
        answer_selected: q.answer_selected ?? null,
        answer_text: q.answer_text ?? null,
      }));
      await supabase.from('quiz_responses').insert(rows);

      await supabase.from('leads').update({
        quiz_completed_at: new Date().toISOString(),
        quiz_score: quiz_responses.length,
      }).eq('id', leadId);
    }

    // 4) Lead activity
    if (leadId) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        author_id: funnel.author_id,
        activity_type: 'funnel_submission',
        metadata: { funnel_id: funnel.id, node_id: funnel.node_id },
      });
    }

    // 4b) Mirror into crm_contacts (keyed by author_user_id) so My CRM list view sees it
    if (authorUserId) {
      try {
        const { data: existingContact } = await supabase
          .from('crm_contacts')
          .select('id, abby_score')
          .eq('author_id', authorUserId)
          .eq('email', cleanEmail)
          .maybeSingle();

        let contactId: string | undefined = existingContact?.id;
        const quizDone = Array.isArray(quiz_responses) && quiz_responses.length > 0;

        if (existingContact) {
          await supabase.from('crm_contacts').update({
            full_name: name || cleanEmail,
            last_activity_at: new Date().toISOString(),
            abby_score: Math.max(existingContact.abby_score || 0, 2),
            ...(funnel.node_id ? { last_node_id: funnel.node_id } : {}),
            ...(quizDone ? { quiz_completed_at: new Date().toISOString(), quiz_score: quiz_responses.length } : {}),
          }).eq('id', existingContact.id);
        } else {
          const { data: newContact } = await supabase.from('crm_contacts').insert({
            author_id: authorUserId,
            full_name: name || cleanEmail,
            email: cleanEmail,
            phone: phone || null,
            source: sourceLabel,
            stage: 'new_lead',
            abby_score: 2,
            last_activity_at: new Date().toISOString(),
            last_node_id: funnel.node_id || null,
            ...(quizDone ? { quiz_completed_at: new Date().toISOString(), quiz_score: quiz_responses.length } : {}),
          }).select('id').single();
          contactId = newContact?.id;
        }

        if (contactId) {
          // Tag (best-effort, ignore unique conflicts)
          await supabase.from('crm_contact_tags').insert({
            author_id: authorUserId, contact_id: contactId, tag: 'funnel-lead',
          }).then(() => null, () => null);

          await supabase.from('crm_activity_log').insert({
            author_id: authorUserId,
            contact_id: contactId,
            type: 'opt_in',
            content: `Captured via funnel ${funnel.node_id || ''}`.trim(),
          });
        }

        console.log('[submit-funnel] ✅ crm_contacts mirrored', JSON.stringify({
          author_user_id: authorUserId, contact_id: contactId, email: cleanEmail,
        }));
      } catch (e) {
        console.warn('[submit-funnel] crm_contacts mirror failed', e);
      }
    } else {
      console.warn('[submit-funnel] ⚠️ no author_user_id — skipping crm_contacts mirror');
    }

    // 5) Subscriber upsert + auto-enroll in node sequence + master_nurture.
    //    enroll-subscriber resolves user_id <-> author_profile_id and writes the
    //    subscriber under the auth.users.id convention (matches RLS).
    let subscriberId: string | null = null;
    try {
      const enrollResp = await fetch(`${SUPABASE_URL}/functions/v1/enroll-subscriber`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          email: cleanEmail,
          name: name || null,
          author_profile_id: funnel.author_id,
          node_id: funnel.node_id || null,
          source: sourceLabel,
          source_detail: funnel.id,
        }),
      });
      const enrollData = await enrollResp.json().catch(() => ({}));
      subscriberId = enrollData?.subscriber_id || null;
    } catch (e) {
      console.warn('[submit-funnel] enroll-subscriber failed', e);
    }

    // Default redirect to thank-you page if no explicit cta_url is set
    let redirectUrl = funnel.cta_url || null;
    if (!redirectUrl) {
      const { data: authorProfile } = await supabase
        .from('author_profiles')
        .select('author_slug')
        .eq('id', funnel.author_id)
        .maybeSingle();
      if (authorProfile?.author_slug) {
        redirectUrl = `/${authorProfile.author_slug}/thank-you`;
      }
    }

    return new Response(JSON.stringify({ success: true, lead_id: leadId, redirect_url: redirectUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('submit-funnel error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
