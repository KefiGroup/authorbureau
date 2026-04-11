import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const PLATFORM_FEE_PERCENT = 0.08; // 8% platform fee

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ verified: false, error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const metadata = session.metadata || {};
    const amount = (session.amount_total || 0) / 100;
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT * 100) / 100;
    const authorEarnings = Math.round((amount - platformFee) * 100) / 100;

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if purchase already recorded (idempotency)
    const { data: existing } = await cloudAdmin
      .from("purchases")
      .select("id")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (!existing) {
      // Record the purchase
      const { error: insertError } = await cloudAdmin.from("purchases").insert({
        author_id: metadata.author_id,
        product_id: metadata.product_id,
        product_type: metadata.product_type,
        product_title: metadata.product_title || "Product",
        customer_email: session.customer_details?.email || session.customer_email || "",
        customer_name: session.customer_details?.name || null,
        amount,
        currency: (session.currency || "usd").toUpperCase(),
        platform_fee: platformFee,
        author_earnings: authorEarnings,
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        payout_status: "pending",
        refund_status: "none",
      });

      if (insertError) {
        console.error("[verify-purchase] Insert error:", insertError);
      }

      // Send confirmation email via Resend
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || "there";

      if (resendKey && customerEmail) {
        // Look up author name
        let authorName = "the author";
        if (metadata.author_id) {
          const { data: profile } = await cloudAdmin
            .from("author_profiles")
            .select("pen_name")
            .eq("user_id", metadata.author_id)
            .maybeSingle();
          if (profile?.pen_name) authorName = profile.pen_name;
        }

        const portalUrl = `https://authorsbureau.com/reader-portal`;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Authors Bureau <notify@notify.authorsbureau.com>",
              to: [customerEmail],
              subject: `Your purchase: ${metadata.product_title || "Product"}`,
              html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <h1 style="font-size: 24px; color: #1a1a1a;">Thank you for your purchase, ${customerName}!</h1>
                  <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
                    You've successfully purchased <strong>${metadata.product_title}</strong> by ${authorName}.
                  </p>
                  <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
                    To access your content, visit your <strong>Reader Portal</strong>:
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${portalUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Go to Reader Portal
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #888;">
                    If you don't have an account yet, sign up with this email address (${customerEmail}) to see your purchased content.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="font-size: 12px; color: #aaa;">
                    Authors Bureau · Empowering Authors, Enriching Readers
                  </p>
                </div>
              `,
            }),
          });
          console.log("[verify-purchase] Confirmation email sent to", customerEmail);
        } catch (emailErr) {
          console.error("[verify-purchase] Email send error:", emailErr);
        }
      }
    }

    return new Response(JSON.stringify({
      verified: true,
      productTitle: metadata.product_title,
      productType: metadata.product_type,
      authorSlug: metadata.author_slug,
      bookSlug: metadata.book_slug,
      customerEmail: session.customer_details?.email || session.customer_email,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[verify-purchase] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
