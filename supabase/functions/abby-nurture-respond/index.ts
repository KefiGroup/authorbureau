import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const AI_URL = "https://ai.lovable.dev/api/v1/chat/completions";

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI call failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, event_type } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get lead details
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get book + author data
    const [bookRes, profileRes, contextRes] = await Promise.all([
      lead.book_id
        ? supabase.from("books").select("title, subtitle, description, genre, author_name").eq("id", lead.book_id).single()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("author_profiles").select("pen_name, bio_short, tagline").eq("id", lead.author_id).single(),
      supabase.from("author_context").select("core_thesis, key_frameworks").eq("author_id", lead.author_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const book = bookRes.data;
    const profile = profileRes.data;
    const context = contextRes.data;

    // Determine nurture stage and generate appropriate email
    const stage = lead.nurture_stage || "welcome";
    const triggerEvent = event_type || "captured";

    const stagePrompts: Record<string, string> = {
      welcome: `Write a warm, personalised welcome email for a new subscriber who just opted in for content about "${book?.title || 'the author\'s book'}". Reference specific themes from the book. Be conversational and genuine. The author is ${profile?.pen_name || "the author"}.`,
      engaged: `Write a value-driven follow-up email that deepens the relationship. Share a practical insight or framework from "${book?.title || 'the book'}". Make them feel like an insider getting exclusive content.`,
      dormant: `Write a creative re-engagement email with a fresh hook. The subscriber hasn't engaged recently. Use a surprising angle from "${book?.title || 'the book'}" to recapture their attention. Make the subject line irresistible.`,
      customer: `Write a thank-you and upsell email for someone who purchased. Suggest their next step with ${profile?.pen_name || "the author"} — could be a course, coaching, or advanced material.`,
    };

    const emailPrompt = stagePrompts[stage] || stagePrompts.welcome;

    const fullPrompt = `${emailPrompt}

Book: "${book?.title || 'Unknown'}"${book?.subtitle ? ` – ${book.subtitle}` : ""}
Description: ${book?.description || "N/A"}
Author: ${profile?.pen_name || "Unknown"}
Core Thesis: ${context?.core_thesis || "N/A"}
Key Frameworks: ${context?.key_frameworks ? JSON.stringify(context.key_frameworks) : "N/A"}
Lead Name: ${lead.name || "there"}
Lead Email: ${lead.email}

Return JSON: { "subject": "...", "body_markdown": "...", "preview_text": "..." }
The body should be in markdown format, 150-300 words, with a clear call to action.`;

    const systemPrompt = `You are ABBY, the AI nurture engine for Authors Bureau. You write personalised, high-converting emails that feel genuinely human — never generic or salesy. Each email should reference specific content from the author's book. Always respond with valid JSON.`;

    const raw = await callAI(fullPrompt, systemPrompt);
    const parsed = parseJSON(raw);

    if (!parsed?.subject || !parsed?.body_markdown) {
      return new Response(JSON.stringify({ error: "AI failed to generate valid email content" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save generated email
    const { data: emailRecord, error: emailErr } = await supabase
      .from("generated_emails")
      .insert({
        lead_id,
        author_id: lead.author_id,
        book_id: lead.book_id,
        subject: parsed.subject,
        body_markdown: parsed.body_markdown,
        body_html: null, // Will be rendered at send time
        trigger_condition: stage === "welcome" ? "welcome" : stage === "dormant" ? "re_engage" : "follow_up",
        status: "queued",
        scheduled_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (emailErr) {
      console.error("Failed to save generated email:", emailErr);
      return new Response(JSON.stringify({ error: "Failed to save email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via transactional email system
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "nurture-email",
          recipientEmail: lead.email,
          idempotencyKey: `nurture-${lead_id}-${emailRecord.id}`,
          templateData: {
            name: lead.name || "",
            subject: parsed.subject,
            body: parsed.body_markdown,
            authorName: profile?.pen_name || book?.author_name || "",
            bookTitle: book?.title || "",
          },
        },
      });

      // Update email status
      await supabase.from("generated_emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", emailRecord.id);

      // Log nurture event
      await supabase.from("nurture_events").insert({
        lead_id,
        event_type: "email_sent",
        metadata: { email_id: emailRecord.id, trigger: triggerEvent, stage },
      });

      // Update lead activity
      await supabase.from("leads").update({
        last_activity_at: new Date().toISOString(),
        nurture_stage: stage === "welcome" ? "engaged" : stage,
      }).eq("id", lead_id);
    } catch (sendErr) {
      console.error("Email send failed:", sendErr);
      await supabase.from("generated_emails").update({ status: "failed" }).eq("id", emailRecord.id);
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailRecord.id, stage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("abby-nurture-respond error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
