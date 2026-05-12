// Admin-initiated Stripe refund + audit + author notification.
// Called by admin-data proxy. Verifies admin via SUPABASE_SERVICE_ROLE_KEY + user_roles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { logError } from "../_shared/log-error.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Admin authorization is driven exclusively by user_roles.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return json({ success: false, status: 401, message: "Missing authorization" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ success: false, status: 401, message: "Invalid token" }, 401);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    const isAdmin = !!role;
    if (!isAdmin) return json({ success: false, status: 403, message: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { purchase_id, reason } = body as { purchase_id?: string; reason?: string };
    if (!purchase_id) return json({ success: false, status: 400, message: "purchase_id required" }, 400);
    if (!reason || reason.trim().length < 3) return json({ success: false, status: 400, message: "Refund reason required (min 3 chars)" }, 400);

    // Load purchase
    const { data: purchase, error: pErr } = await admin
      .from("purchases").select("*").eq("id", purchase_id).maybeSingle();
    if (pErr || !purchase) return json({ success: false, status: 404, message: "Purchase not found" }, 404);
    if (purchase.refund_status === "refunded") {
      return json({ success: false, status: 409, message: "Purchase already refunded" }, 409);
    }
    if (!purchase.stripe_payment_intent_id) {
      return json({ success: false, status: 400, message: "No Stripe payment intent on this purchase" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ success: false, status: 500, message: "STRIPE_SECRET_KEY not configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Issue refund
    let refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: purchase.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: {
          purchase_id,
          admin_user_id: user.id,
          admin_email: user.email || "",
          reason,
        },
      });
    } catch (e) {
      const msg = (e as Error).message;
      return json({ success: false, status: 502, message: `Stripe refund failed: ${msg}` }, 502);
    }

    // Update purchase
    const newPayoutStatus = purchase.payout_status === "paid" ? purchase.payout_status : "blocked";
    await admin.from("purchases").update({
      refund_status: "refunded",
      refunded_at: new Date().toISOString(),
      payout_status: newPayoutStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", purchase_id);

    // Resolve author auth uid for notification
    let authorUserId: string | null = null;
    if (purchase.author_id) {
      const { data: ap } = await admin.from("author_profiles").select("user_id").eq("id", purchase.author_id).maybeSingle();
      authorUserId = ap?.user_id ?? null;
    }

    // Notify + audit
    if (authorUserId) {
      await admin.rpc("notify_users", {
        p_user_ids: [authorUserId],
        p_title: "A purchase was refunded",
        p_message: `${purchase.customer_email || "A customer"} was refunded $${Number(purchase.amount).toFixed(2)} for "${purchase.product_title || "your product"}". Reason: ${reason}`,
        p_link: "/dashboard?section=earnings",
        p_event_key: "purchase.refunded",
        p_target_type: "purchase",
        p_target_id: purchase_id,
        p_payload: { reason, refund_id: refund.id, amount: purchase.amount },
      });
    } else {
      // Still write a standalone audit row
      await admin.from("admin_audit_log").insert({
        actor_id: user.id,
        event_key: "purchase.refunded",
        target_type: "purchase",
        target_id: purchase_id,
        payload: { reason, refund_id: refund.id, amount: purchase.amount, no_author_notified: true },
      });
    }

    return json({ success: true, status: 200, message: "Refund issued", refund_id: refund.id });
  } catch (err) {
    await logError({
      source: "edge_function",
      function_name: "refund-purchase",
      severity: "error",
      error: err,
    });
    return json({ success: false, status: 500, message: (err as Error).message }, 500);
  }
});
