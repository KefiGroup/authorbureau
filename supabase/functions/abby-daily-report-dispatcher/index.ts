// Hourly cron: find authors whose local time is ~8am AND whose chosen
// cadence (daily/weekly/monthly) fires today, then trigger abby-daily-report.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_LOCAL_HOUR = 8; // 8am local
const DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12h

type LocalParts = { hour: number; weekday: number; day: number };

function localPartsFor(tz: string): LocalParts | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
      weekday: "short",
      day: "numeric",
    });
    const parts = fmt.formatToParts(new Date());
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "", 10);
    const day = parseInt(parts.find((p) => p.type === "day")?.value || "", 10);
    const wkStr = parts.find((p) => p.type === "weekday")?.value || "";
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekday = map[wkStr] ?? -1;
    if (Number.isNaN(hour) || Number.isNaN(day) || weekday < 0) return null;
    return { hour, weekday, day };
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

    const { data: authors, error } = await supabase
      .from("author_profiles")
      .select("id, timezone, pen_name, report_frequency, report_weekly_day, report_monthly_day, last_report_sent_at")
      .not("user_id", "is", null);
    if (error) throw error;

    const now = Date.now();
    const targets = (authors || []).filter((a: any) => {
      const freq = a.report_frequency || "weekly";
      if (freq === "off") return false;

      const tz = a.timezone || "UTC";
      const lp = localPartsFor(tz);
      if (!lp || lp.hour !== TARGET_LOCAL_HOUR) return false;

      if (freq === "weekly" && lp.weekday !== (a.report_weekly_day ?? 1)) return false;
      if (freq === "monthly" && lp.day !== (a.report_monthly_day ?? 1)) return false;

      // Dedupe — never re-send within 12h
      if (a.last_report_sent_at) {
        const last = new Date(a.last_report_sent_at).getTime();
        if (now - last < DEDUPE_WINDOW_MS) return false;
      }
      return true;
    });

    console.log(`[dispatcher] ${targets.length} authors due now`);

    const results = await Promise.allSettled(
      targets.map(async (a: any) => {
        const r = await supabase.functions.invoke("abby-daily-report", {
          body: { author_id: a.id, frequency: a.report_frequency || "weekly" },
        });
        if (!r.error) {
          await supabase
            .from("author_profiles")
            .update({ last_report_sent_at: new Date().toISOString() })
            .eq("id", a.id);
        }
        return r;
      }),
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
