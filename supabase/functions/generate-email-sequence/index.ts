import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Preset = {
  flow_type: string;
  purpose: string;
  steps: number;
  cadence?: number[]; // optional explicit trigger_delay_days per step
};

// All 28 nodes + master_nurture. flow_type uses node_id for node-bound flows.
const SEQUENCE_PRESETS: Record<string, Preset> = {
  // BRAND PRODUCTS (BP-01 .. BP-09)
  'BP-01': { flow_type: 'BP-01', purpose: 'Welcome + nurture sequence for new email subscribers', steps: 5, cadence: [0, 2, 4, 7, 10] },
  'BP-02': { flow_type: 'BP-02', purpose: 'Lead magnet delivery + conversion sequence', steps: 5, cadence: [0, 1, 3, 6, 10] },
  'BP-03': { flow_type: 'BP-03', purpose: 'Social media follower nurture — convert followers to subscribers', steps: 5, cadence: [0, 3, 7, 12, 18] },
  'BP-04': { flow_type: 'BP-04', purpose: 'Author website visitor nurture — turn browsers into buyers', steps: 5, cadence: [0, 2, 5, 9, 14] },
  'BP-05': { flow_type: 'BP-05', purpose: 'Webinar registration confirmation, reminders, and replay', steps: 5, cadence: [0, 1, 2, 3, 4] },
  'BP-06': { flow_type: 'BP-06', purpose: 'Workbook delivery + companion learning nurture', steps: 5, cadence: [0, 2, 5, 10, 15] },
  'BP-07': { flow_type: 'BP-07', purpose: 'Home Study Course onboarding + completion nurture', steps: 5, cadence: [0, 3, 7, 14, 21] },
  'BP-08': { flow_type: 'BP-08', purpose: 'Podcast listener nurture — turn listeners into subscribers and buyers', steps: 5, cadence: [0, 3, 7, 12, 18] },
  'BP-09': { flow_type: 'BP-09', purpose: 'Special edition / collector edition pre-launch + launch sequence', steps: 5, cadence: [0, 2, 5, 7, 10] },
  // BUILD AUTHORITY (BA-10 .. BA-18)
  'BA-10': { flow_type: 'BA-10', purpose: 'Online course enrollment confirmation + lesson nurture', steps: 5, cadence: [0, 3, 7, 14, 21] },
  'BA-11': { flow_type: 'BA-11', purpose: 'Audiobook listener engagement + companion content', steps: 5, cadence: [0, 4, 8, 14, 21] },
  'BA-12': { flow_type: 'BA-12', purpose: 'Membership / community welcome + retention nurture', steps: 5, cadence: [0, 2, 7, 14, 30] },
  'BA-13': { flow_type: 'BA-13', purpose: 'Quiz funnel result delivery + segmented nurture', steps: 5, cadence: [0, 2, 5, 9, 14] },
  'BA-14': { flow_type: 'BA-14', purpose: 'Podcast guest pitch follow-up + relationship nurture', steps: 5, cadence: [0, 3, 7, 14, 21] },
  'BA-15': { flow_type: 'BA-15', purpose: 'Speaking inquiry follow-up + booking nurture', steps: 5, cadence: [0, 2, 5, 10, 16] },
  'BA-16': { flow_type: 'BA-16', purpose: 'Press kit / media inquiry follow-up sequence', steps: 5, cadence: [0, 2, 5, 10, 16] },
  'BA-17': { flow_type: 'BA-17', purpose: 'Affiliate / partnership outreach + activation sequence', steps: 5, cadence: [0, 3, 7, 14, 21] },
  'BA-18': { flow_type: 'BA-18', purpose: 'Reader review + testimonial request sequence', steps: 4, cadence: [0, 5, 14, 30] },
  // YIELD REVENUE (YR-19 .. YR-28)
  'YR-19': { flow_type: 'YR-19', purpose: 'Coaching application follow-up + booking sequence', steps: 5, cadence: [0, 2, 5, 9, 14] },
  'YR-20': { flow_type: 'YR-20', purpose: 'Group coaching cohort onboarding + retention', steps: 5, cadence: [0, 3, 7, 14, 21] },
  'YR-21': { flow_type: 'YR-21', purpose: 'Mastermind application + qualification sequence', steps: 5, cadence: [0, 2, 5, 10, 16] },
  'YR-22': { flow_type: 'YR-22', purpose: 'Corporate training inquiry + proposal nurture', steps: 5, cadence: [0, 2, 5, 10, 18] },
  'YR-23': { flow_type: 'YR-23', purpose: 'Done-for-you service inquiry + onboarding sequence', steps: 5, cadence: [0, 2, 5, 10, 16] },
  'YR-24': { flow_type: 'YR-24', purpose: 'Retreat / live event registration + pre-event nurture', steps: 5, cadence: [0, 7, 14, 21, 28] },
  'YR-25': { flow_type: 'YR-25', purpose: 'Certification program enrollment + onboarding', steps: 5, cadence: [0, 3, 7, 14, 21] },
  'YR-26': { flow_type: 'YR-26', purpose: 'Licensing / IP partnership inquiry sequence', steps: 5, cadence: [0, 3, 7, 14, 21] },
  'YR-27': { flow_type: 'YR-27', purpose: 'Recurring subscription welcome + retention nurture', steps: 5, cadence: [0, 3, 7, 14, 30] },
  'YR-28': { flow_type: 'YR-28', purpose: 'Premium consulting inquiry + qualification sequence', steps: 5, cadence: [0, 2, 5, 10, 16] },
  // MASTER ALWAYS-ON NURTURE — trust-first cadence (Pauline-approved)
  'MASTER': {
    flow_type: 'master_nurture',
    purpose: `The 6-email always-on master nurture sequence. TRUST-FIRST structure — value and story before any product offer. Strict cadence:
- Email 1 (Day 0): Welcome + lead magnet delivery
- Email 2 (Day 3): Methodology insight — explain the author's core methodology framework in plain English with one actionable takeaway
- Email 3 (Day 7): Personal story — the author's "messy middle" moment, vulnerable and real, ending with the lesson learned
- Email 4 (Day 12): SOFT offer — Workbook (BP-06) — frame as "the next small step", not a hard sell
- Email 5 (Day 18): Social proof — 2-3 short reader testimonials + introduce Home Study Course (BP-07)
- Email 6 (Day 25): Re-engagement — "Where do you want to go next?" — list all the author's offerings (workbook, course, coaching, speaking) as a menu and ask the reader to reply with what resonates`,
    steps: 6,
    cadence: [0, 3, 7, 12, 18, 25],
  },
};

function getNodeContext(nodeId: string): string {
  const map: Record<string, string> = {
    'BP-06': 'workbook companion to the book',
    'BP-07': 'home study course version of the book',
    'BA-10': 'full online course taught by the author',
    'BA-11': 'audiobook edition',
    'YR-19': '1:1 coaching with the author',
    'YR-22': 'corporate training engagement',
  };
  return map[nodeId] || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, node_id, book_id, sequence_type, custom_prompt } = await req.json();
    const isMaster = sequence_type === 'master_nurture' || node_id === 'MASTER';

    if (!author_id || (!isMaster && !node_id)) {
      return new Response(JSON.stringify({ success: false, status: 400, message: 'author_id required (and node_id unless sequence_type=master_nurture)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const lookupKey = isMaster ? 'MASTER' : (node_id as string);
    const preset = SEQUENCE_PRESETS[lookupKey] ?? {
      flow_type: sequence_type || 'custom',
      purpose: custom_prompt || 'Email nurture sequence',
      steps: 5,
    };

    // Idempotent: if a flow already exists, return it
    const existingQuery = isMaster
      ? supabase.from('email_flows').select('id, status').eq('author_id', author_id).eq('flow_type', 'master_nurture').maybeSingle()
      : supabase.from('email_flows').select('id, status').eq('author_id', author_id).eq('node_id', node_id).maybeSingle();

    const { data: existingFlow } = await existingQuery;
    if (existingFlow) {
      return new Response(JSON.stringify({ success: true, status: 200, message: 'Flow already exists', flow_id: existingFlow.id, skipped: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull author + book context for personalisation
    const [{ data: author }, { data: book }] = await Promise.all([
      supabase.from('author_profiles').select('pen_name, methodology_name, sign_off_phrase, tagline').eq('id', author_id).maybeSingle(),
      book_id
        ? supabase.from('books').select('title, subtitle, description, genre').eq('id', book_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const nodeCtx = getNodeContext(node_id);

    const cadenceLine = preset.cadence
      ? `Use this exact cadence (trigger_delay_days for each step in order): ${JSON.stringify(preset.cadence)}.`
      : '';

    const systemPrompt = `You are ABBY, an email copywriter for ${author?.pen_name || 'an author'}.
Write a ${preset.steps}-step email sequence for: ${preset.purpose}
${nodeCtx ? `Context: this sequence supports ${nodeCtx}.` : ''}
Author voice: ${author?.tagline || 'expert, warm, direct'}.
Methodology: ${author?.methodology_name || 'the author\u2019s framework'}.
${book ? `Book: "${book.title}" — ${book.description?.slice(0, 200) || ''}` : ''}
${cadenceLine}
Rules:
- No emdashes anywhere.
- Use sign-off "${author?.sign_off_phrase || 'Best,'}".
- Each email drives ONE single action.
- Write like a human, not a marketer. Short paragraphs.
- DO NOT add unsubscribe text or footer disclaimers (the system appends those automatically).
- For body_markdown, use plain markdown (## headings, **bold**, [link text](url)) — no HTML.
Return strict JSON: { "title": string, "description": string, "steps": [{ "step_number": 1, "subject": string, "preview_text": string, "body_markdown": string, "trigger_delay_days": 0 }] }`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate the ${preset.steps}-step sequence now. Return only valid JSON.` },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error', aiRes.status, errText);
      return new Response(JSON.stringify({ success: false, status: aiRes.status, message: `AI generation failed: ${errText.slice(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);

    // Insert email_flows
    const { data: flow, error: flowErr } = await supabase
      .from('email_flows')
      .insert({
        author_id,
        book_id: book_id || null,
        node_id: isMaster ? null : node_id,
        flow_type: preset.flow_type,
        title: parsed.title || (isMaster ? 'Master Always-On Nurture' : `${node_id} Sequence`),
        description: parsed.description || preset.purpose,
        status: 'draft',
        ai_generated: true,
      })
      .select()
      .single();

    if (flowErr) throw flowErr;

    // Steps with enforced cadence (override AI if needed)
    const stepsToInsert = (parsed.steps || []).slice(0, preset.steps).map((s: any, idx: number) => ({
      flow_id: flow.id,
      step_number: idx + 1,
      subject: s.subject || `Email ${idx + 1}`,
      preview_text: s.preview_text || null,
      body_markdown: s.body_markdown || '',
      trigger_delay_days: preset.cadence ? preset.cadence[idx] : (s.trigger_delay_days ?? idx),
      status: 'active',
    }));

    const { error: stepErr } = await supabase.from('email_flow_steps').insert(stepsToInsert);
    if (stepErr) throw stepErr;

    return new Response(JSON.stringify({
      success: true, status: 200, message: 'Sequence generated',
      flow_id: flow.id, flow_type: preset.flow_type, step_count: stepsToInsert.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('generate-email-sequence error', e);
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
