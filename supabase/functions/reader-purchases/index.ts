import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

    // Resolve user email from token
    let email = "";
    const localClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { data: localUser } = await localClient.auth.getUser(token);
    if (localUser?.user?.email) {
      email = localUser.user.email;
    } else {
      const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
      if (sharedKey) {
        const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
        const { data: sharedUser } = await sharedClient.auth.getUser(token);
        if (sharedUser?.user?.email) email = sharedUser.user.email;
      }
    }

    if (!email) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.email) email = payload.email;
      } catch { /* ignore */ }
    }

    if (!email) throw new Error("Could not resolve user email");

    // Query purchases by customer email using service role (bypasses RLS)
    const { data: purchases, error } = await localClient
      .from("purchases")
      .select("id, product_id, product_type, product_title, author_id, created_at, amount, currency")
      .eq("customer_email", email.toLowerCase())
      .eq("refund_status", "none")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[reader-purchases] Query error:", error);
      throw new Error("Failed to query purchases");
    }

    return new Response(JSON.stringify({ purchases: purchases || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[reader-purchases] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
