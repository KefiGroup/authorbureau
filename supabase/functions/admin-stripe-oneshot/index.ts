import Stripe from "https://esm.sh/stripe@18.5.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const customer = await stripe.customers.update("cus_UJUky0qgRpdVKc", {
      email: "support@paulineteo.com",
    });

    const sub1 = await stripe.subscriptions.update("sub_1TKrlPCk4r0emyO8EEMKpuW3", {
      discounts: [{ coupon: "aSelv0my" }],
    });
    const sub2 = await stripe.subscriptions.update("sub_1TUep4Ck4r0emyO8SbpVsbli", {
      discounts: [{ coupon: "aSelv0my" }],
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: "ok",
        customer_email: customer.email,
        sub1: { id: sub1.id, discounts: sub1.discounts },
        sub2: { id: sub2.id, discounts: sub2.discounts },
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, status: 500, message: String(e?.message ?? e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
