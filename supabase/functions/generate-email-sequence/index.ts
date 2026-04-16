import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Maps node_id -> {flow_type, sequence purpose, default step count}
const SEQUENCE_PRESETS: Record<string, { flow_type: string; purpose: string; steps: number }> = {
  'BP-01': { flow_type: 'email_marketing', purpose: 'Welcome + nurture sequence for new email subscribers', steps: 5 },
  'BP-02': { flow_type: 'lead_magnet', purpose: 'Lead magnet delivery + conversion sequence', steps: 5 },
  'BP-05': { flow_type: 'webinar', purpose: 'Webinar registration confirmation, reminders, and replay', steps: 5 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, node_id, book_id, sequence_type, custom_prompt } = await req.json();

    if (!author_id || !node_id) {
      return new Response(JSON.stringify({ success: false, status: 400, message: 'author_id and node_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const preset = SEQUENCE_PRESETS[node_id] ?? { flow_type: sequence_type || 'custom', purpose: custom_prompt || 'Email nurture sequence', steps: 5 };

    // Pull author + book context for personalisation
    const [{ data: author }, { data: book }] = await Promise.all([
      supabase.from('author_profiles').select('pen_name, methodology_name, sign_off_phrase, tagline').eq('id', author_id).maybeSingle(),
      book_id
        ? supabase.from('books').select('title, subtitle, description, genre').eq('id', book_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const systemPrompt = `You are ABBY, an email copywriter for ${author?.pen_name || 'an author'}.
Write a ${preset.steps}-step email sequence for: ${preset.purpose}.
Author voice: ${author?.tagline || 'expert, warm, direct'}. Methodology: ${author?.methodology_name || 'N/A'}.
${book ? `Book: "${book.title}" — ${book.description?.slice(0, 200) || ''}` : ''}
Rules: No emdashes. Use sign-off "${author?.sign_off_phrase || 'Best,'}". Each email must drive a single action.
Return strict JSON: { "title": string, "description": string, "steps": [{ "step_number": 1, "subject": string, "preview_text": string, "body_markdown": string, "trigger_delay_days": 0 }] }`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Generate the ${preset.steps}-step sequence now. Return only valid JSON.` }],
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

    // Insert into email_flows
    const { data: flow, error: flowErr } = await supabase
      .from('email_flows')
      .insert({
        author_id,
        book_id: book_id || null,
        node_id,
        flow_type: preset.flow_type,
        title: parsed.title || `${node_id} Sequence`,
        description: parsed.description || preset.purpose,
        status: 'draft',
        ai_generated: true,
      })
      .select()
      .single();

    if (flowErr) throw flowErr;

    // Insert steps
    const stepsToInsert = (parsed.steps || []).map((s: any, idx: number) => ({
      flow_id: flow.id,
      step_number: s.step_number ?? idx + 1,
      subject: s.subject || `Email ${idx + 1}`,
      preview_text: s.preview_text || null,
      body_markdown: s.body_markdown || '',
      trigger_delay_days: s.trigger_delay_days ?? idx,
      status: 'draft',
    }));

    const { error: stepErr } = await supabase.from('email_flow_steps').insert(stepsToInsert);
    if (stepErr) throw stepErr;

    return new Response(JSON.stringify({ success: true, status: 200, message: 'Sequence generated', flow_id: flow.id, step_count: stepsToInsert.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-email-sequence error', e);
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
