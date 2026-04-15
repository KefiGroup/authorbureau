import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Webhook endpoint for email open/click tracking.
 * Body: { lead_id, event_type: "email_opened"|"email_clicked"|"purchase"|"unsubscribe"|"reply", metadata? }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, event_type, metadata } = await req.json();
    if (!lead_id || !event_type) {
      return new Response(JSON.stringify({ error: "lead_id and event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validEvents = ["email_sent", "email_opened", "email_clicked", "purchase", "unsubscribe", "reply", "page_view"];
    if (!validEvents.includes(event_type)) {
      return new Response(JSON.stringify({ error: `Invalid event_type. Must be one of: ${validEvents.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert nurture event
    await supabase.from("nurture_events").insert({
      lead_id,
      event_type,
      metadata: metadata || null,
    });

    // Update lead
    const updates: Record<string, any> = {
      last_activity_at: new Date().toISOString(),
    };

    // Stage transitions based on events
    if (event_type === "email_clicked") {
      updates.nurture_stage = "engaged";
    } else if (event_type === "purchase") {
      updates.nurture_stage = "customer";
      updates.status = "customer";
    } else if (event_type === "unsubscribe") {
      updates.status = "unsubscribed";
    }

    await supabase.from("leads").update(updates).eq("id", lead_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("track-email-event error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
