import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Daily cron job — processes all active leads and determines next nurture action.
 * Called via pg_cron every 24 hours.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const days14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Get all active/nurturing leads
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, email, nurture_stage, last_activity_at, author_id, book_id")
      .in("status", ["active", "nurturing"])
      .limit(500);

    if (leadsErr || !leads) {
      console.error("Failed to fetch leads:", leadsErr);
      return new Response(JSON.stringify({ error: "Failed to fetch leads" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        // Get last nurture event for this lead
        const { data: lastEvent } = await supabase
          .from("nurture_events")
          .select("event_type, created_at")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check last email sent
        const { data: lastEmail } = await supabase
          .from("generated_emails")
          .select("id, status, sent_at, trigger_condition")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Determine if this lead needs action
        let shouldNurture = false;
        let newStage = lead.nurture_stage;

        const lastActivity = lead.last_activity_at || lastEvent?.created_at;

        if (!lastEmail) {
          // Never emailed — send welcome
          shouldNurture = true;
          newStage = "welcome";
        } else if (lastActivity && lastActivity < days14Ago) {
          // Dormant — no activity for 14 days
          shouldNurture = true;
          newStage = "dormant";
        } else if (lastActivity && lastActivity < hours48Ago && lead.nurture_stage === "welcome") {
          // No engagement after 48h — send follow-up
          shouldNurture = true;
          newStage = "engaged";
        } else if (lastEvent?.event_type === "email_clicked" && lead.nurture_stage !== "customer") {
          // Clicked — advance to product interest
          shouldNurture = true;
          newStage = "engaged";
        } else {
          skipped++;
          continue;
        }

        // Update stage if changed
        if (newStage !== lead.nurture_stage) {
          await supabase.from("leads").update({ nurture_stage: newStage }).eq("id", lead.id);
        }

        // Trigger nurture response
        if (shouldNurture) {
          await supabase.functions.invoke("abby-nurture-respond", {
            body: { lead_id: lead.id, event_type: "cron_trigger" },
          });
          processed++;
        }
      } catch (leadErr: any) {
        errors.push(`Lead ${lead.id}: ${leadErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_leads: leads.length,
        processed,
        skipped,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("abby-nurture-cron error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
