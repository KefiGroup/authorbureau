// Hourly cron: find authors whose local time is ~8am and trigger abby-daily-report.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_LOCAL_HOUR = 8; // 8am local

function localHourFor(tz: string): number | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value;
    return h !== undefined ? parseInt(h, 10) : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull authors with timezone (default 'UTC' from migration)
    const { data: authors, error } = await supabase
      .from("author_profiles")
      .select("id, timezone, pen_name")
      .not("user_id", "is", null);
    if (error) throw error;

    const targets = (authors || []).filter((a) => {
      const tz = (a as any).timezone || "UTC";
      return localHourFor(tz) === TARGET_LOCAL_HOUR;
    });

    console.log(`[dispatcher] ${targets.length} authors due at local 8am`);

    const results = await Promise.allSettled(
      targets.map((a) =>
        supabase.functions.invoke("abby-daily-report", { body: { author_id: a.id } })
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({
        success: true, status: 200,
        message: `Dispatched ${sent} reports (${failed} failed)`,
        total_due: targets.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("dispatcher error:", msg);
    return new Response(
      JSON.stringify({ success: false, status: 500, message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
