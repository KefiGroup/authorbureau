import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Resolve email from token
    let email = "";
    const { data: localUser } = await admin.auth.getUser(token);
    if (localUser?.user?.email) {
      email = localUser.user.email;
    } else {
      const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
      if (sharedKey) {
        const shared = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
        const { data: sharedUser } = await shared.auth.getUser(token);
        if (sharedUser?.user?.email) email = sharedUser.user.email;
      }
    }
    if (!email) {
      try { const p = JSON.parse(atob(token.split(".")[1])); if (p.email) email = p.email; } catch {}
    }
    if (!email) throw new Error("Could not resolve user email");
    email = email.toLowerCase();

    const { action, purchaseId, dayNumber, startDate } = await req.json();

    if (action === "set-start-date") {
      // Verify purchase ownership
      const { data: purchase } = await admin
        .from("purchases")
        .select("id")
        .eq("id", purchaseId)
        .eq("customer_email", email)
        .eq("refund_status", "none")
        .single();
      if (!purchase) throw new Error("Purchase not found");

      // Upsert start date
      const { error } = await admin
        .from("reader_start_dates")
        .upsert(
          { purchase_id: purchaseId, user_email: email, start_date: startDate },
          { onConflict: "purchase_id" }
        );
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-content") {
      // 1. Verify purchase ownership
      const { data: purchase, error: pErr } = await admin
        .from("purchases")
        .select("id, product_id, product_type, product_title, author_id, created_at")
        .eq("id", purchaseId)
        .eq("customer_email", email)
        .eq("refund_status", "none")
        .single();

      if (pErr || !purchase) throw new Error("Purchase not found or access denied");

      // 2. Get the home study content
      let studyData: any = null;
      if (purchase.product_type === "home_study_courses" || purchase.product_type === "homestudy") {
        const { data: hsc } = await admin
          .from("home_study_courses")
          .select("id, title, description, duration_days, study_schedule_json, content_markdown")
          .eq("id", purchase.product_id)
          .single();
        studyData = hsc;
      }

      // 3. Get progress
      const { data: progress } = await admin
        .from("reader_progress")
        .select("day_number, completed_at")
        .eq("purchase_id", purchaseId);

      // 4. Get reader's chosen start date
      const { data: startDateRow } = await admin
        .from("reader_start_dates")
        .select("start_date")
        .eq("purchase_id", purchaseId)
        .maybeSingle();

      // 5. Calculate drip based on start date (or null if not started)
      let unlockedUpToDay = 0;
      let readerStartDate: string | null = null;

      if (startDateRow?.start_date) {
        readerStartDate = startDateRow.start_date;
        const start = new Date(startDateRow.start_date + "T00:00:00Z");
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        unlockedUpToDay = Math.max(0, daysSinceStart);
      }

      return new Response(JSON.stringify({
        purchase,
        studyData,
        progress: progress || [],
        unlockedUpToDay,
        startDate: readerStartDate,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark-complete") {
      // Verify purchase ownership first
      const { data: purchase } = await admin
        .from("purchases")
        .select("id")
        .eq("id", purchaseId)
        .eq("customer_email", email)
        .eq("refund_status", "none")
        .single();
      if (!purchase) throw new Error("Purchase not found");

      // Check drip lock using start date
      const { data: startDateRow } = await admin
        .from("reader_start_dates")
        .select("start_date")
        .eq("purchase_id", purchaseId)
        .maybeSingle();

      if (!startDateRow?.start_date) throw new Error("Start date not set");

      const start = new Date(startDateRow.start_date + "T00:00:00Z");
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (dayNumber > daysSinceStart) throw new Error("Day not yet unlocked");

      const { error } = await admin
        .from("reader_progress")
        .upsert(
          { purchase_id: purchaseId, user_email: email, day_number: dayNumber },
          { onConflict: "purchase_id,day_number" }
        );
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unmark-complete") {
      const { data: purchase } = await admin
        .from("purchases")
        .select("id")
        .eq("id", purchaseId)
        .eq("customer_email", email)
        .eq("refund_status", "none")
        .single();
      if (!purchase) throw new Error("Purchase not found");

      await admin
        .from("reader_progress")
        .delete()
        .eq("purchase_id", purchaseId)
        .eq("day_number", dayNumber);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error) {
    console.error("[reader-content]", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
