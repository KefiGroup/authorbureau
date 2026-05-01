import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[customer-portal] ${step}${d}`);
};

function decodeJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let p = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (p.length % 4) p += "=";
    return JSON.parse(atob(p));
  } catch (e) {
    log("JWT decode failed", { error: String(e) });
    return null;
  }
}

async function resolveUserEmail(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header provided");
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("Empty bearer token");

  const decoded = decodeJwt(token);
  log("Token received", {
    prefix: token.slice(0, 12),
    hasDecoded: !!decoded,
    hasEmail: !!decoded?.email,
    sub: decoded?.sub,
    iss: decoded?.iss,
  });

  // 1) JWT claim email (fastest, works for both backends)
  if (decoded?.email && typeof decoded.email === "string") {
    log("Resolved via JWT email claim", { email: decoded.email });
    return decoded.email;
  }

  const localClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // 2) Local Cloud auth.getUser(token)
  try {
    const { data: localUser } = await localClient.auth.getUser(token);
    if (localUser?.user?.email) {
      log("Resolved via local auth.getUser", { email: localUser.user.email });
      return localUser.user.email;
    }
  } catch (e) {
    log("local auth.getUser threw", { error: String(e) });
  }

  // 3) Local admin lookup by sub (handles tokens without email claim)
  if (decoded?.sub) {
    try {
      const { data: byId } = await localClient.auth.admin.getUserById(decoded.sub);
      if (byId?.user?.email) {
        log("Resolved via local admin.getUserById", { email: byId.user.email });
        return byId.user.email;
      }
    } catch (e) {
      log("local admin.getUserById threw", { error: String(e) });
    }
  }

  // 4) Shared backend auth.getUser
  const sharedUrl = "https://wuftdpnekscrsghqtssd.supabase.co";
  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    try {
      const sharedClient = createClient(sharedUrl, sharedKey, { auth: { persistSession: false } });
      const { data: sharedUser } = await sharedClient.auth.getUser(token);
      if (sharedUser?.user?.email) {
        log("Resolved via shared backend auth.getUser", { email: sharedUser.user.email });
        return sharedUser.user.email;
      }

      // 5) Shared admin lookup by sub
      if (decoded?.sub) {
        const { data: byId } = await sharedClient.auth.admin.getUserById(decoded.sub);
        if (byId?.user?.email) {
          log("Resolved via shared admin.getUserById", { email: byId.user.email });
          return byId.user.email;
        }
      }
    } catch (e) {
      log("shared backend lookup threw", { error: String(e) });
    }
  }

  // 6) Last resort: look up books.owner_email by sub
  if (decoded?.sub) {
    try {
      const { data: book } = await localClient
        .from("books")
        .select("owner_email")
        .eq("user_id", decoded.sub)
        .limit(1)
        .maybeSingle();
      if (book?.owner_email) {
        log("Resolved via books.owner_email", { email: book.owner_email });
        return book.owner_email;
      }
    } catch (e) {
      log("books lookup threw", { error: String(e) });
    }
  }

  throw new Error("Could not resolve user email from token. Please sign out and sign back in.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const email = await resolveUserEmail(req);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error(`No Stripe customer found for ${email}`);
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/account-settings?tab=billing`,
    });

    log("Portal session created", { customerId: customers.data[0].id });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
