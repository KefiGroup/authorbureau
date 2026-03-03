import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Simple Markdown-to-HTML for email bodies */
function markdownToHtml(md: string): string {
  let html = escapeHtml(md);
  // headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#c68a2e;">$1</a>');
  // line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br/>");
  return `<p>${html}</p>`;
}

function buildEmailHtml(bodyHtml: string, senderName: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e8e4de;">
      ${bodyHtml}
    </div>
    <div style="text-align:center;padding:24px 0;color:#9ca3af;font-size:12px;">
      <p>Sent by ${escapeHtml(senderName)} via Authors Bureau</p>
      <p style="margin-top:8px;">
        <a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaignId } = await req.json();
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign (verify ownership)
    const { data: campaign, error: campErr } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("author_id", user.id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (campaign.status === "sent" || campaign.status === "sending") {
      return new Response(JSON.stringify({ error: "Campaign already sent or sending" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch author email settings
    const { data: settings } = await supabase
      .from("author_email_settings")
      .select("*")
      .eq("author_id", user.id)
      .single();

    // Fetch author profile for name
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("pen_name, bio_short")
      .eq("user_id", user.id)
      .single();

    const senderName = settings?.sender_name || profile?.pen_name || "Author";
    const fromEmail = `${senderName} <newsletter@authorsbureau.com>`;
    const replyTo = settings?.reply_to_email || undefined;

    // Fetch active subscribers
    const { data: subscribers, error: subErr } = await supabase
      .from("author_subscribers")
      .select("id, email, name")
      .eq("author_id", user.id)
      .eq("status", "active");

    if (subErr || !subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ error: "No active subscribers" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update campaign status to sending
    await supabase
      .from("email_campaigns")
      .update({ status: "sending", recipient_count: subscribers.length })
      .eq("id", campaignId);

    // Build email HTML
    const bodyMarkdown = campaign.content_json?.body || "";
    const bodyHtml = markdownToHtml(bodyMarkdown);
    const fullHtml = buildEmailHtml(bodyHtml, senderName);

    let sentCount = 0;
    let failCount = 0;

    // Send in batches of 10
    const batchSize = 10;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const sendPromises = batch.map(async (sub: any) => {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [sub.email],
              subject: campaign.subject,
              html: fullHtml,
              ...(replyTo ? { reply_to: replyTo } : {}),
            }),
          });

          const result = await res.json();

          // Log the send
          await supabase.from("email_send_logs").insert({
            campaign_id: campaignId,
            subscriber_id: sub.id,
            email: sub.email,
            status: res.ok ? "sent" : "failed",
            resend_message_id: result.id || null,
            sent_at: res.ok ? new Date().toISOString() : null,
          });

          if (res.ok) sentCount++;
          else failCount++;
        } catch (err) {
          console.error(`Failed to send to ${sub.email}:`, err);
          failCount++;
          await supabase.from("email_send_logs").insert({
            campaign_id: campaignId,
            subscriber_id: sub.id,
            email: sub.email,
            status: "failed",
          });
        }
      });

      await Promise.all(sendPromises);
    }

    // Update campaign as sent
    await supabase
      .from("email_campaigns")
      .update({
        status: failCount === subscribers.length ? "failed" : "sent",
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-campaign error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
