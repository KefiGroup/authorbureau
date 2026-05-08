import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { resolveAuthorId } from "../_shared/resolve-author-id.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(md: string): string {
  let html = escapeHtml(md);
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#c68a2e;">$1</a>');
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

async function resolveUser(token: string): Promise<{ id: string; email: string }> {
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await localClient.auth.getUser(token);
  if (localUser?.user?.id && localUser?.user?.email) {
    return { id: localUser.user.id, email: localUser.user.email };
  }

  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.id && sharedUser?.user?.email) {
      return { id: sharedUser.user.id, email: sharedUser.user.email };
    }
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub && payload.email) return { id: payload.sub, email: payload.email };
  } catch { /* ignore */ }

  throw new Error("Not authenticated");
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

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const user = await resolveUser(token);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const authorId = (await resolveAuthorId(supabase, user.id, user.email)) || user.id;

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
      .eq("author_id", authorId)
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

    const { data: settings } = await supabase
      .from("author_email_settings")
      .select("*")
      .eq("author_id", authorId)
      .single();

    const { data: profile } = await supabase
      .from("author_profiles")
      .select("pen_name, bio_short")
      .eq("user_id", user.id)
      .single();

    const senderName = settings?.sender_name || profile?.pen_name || "Author";

    const { data: subscribers, error: subErr } = await supabase
      .from("author_subscribers")
      .select("id, email, name")
      .eq("author_id", authorId)
      .eq("status", "active");

    if (subErr || !subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ error: "No active subscribers" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("email_campaigns")
      .update({ status: "sending", recipient_count: subscribers.length })
      .eq("id", campaignId);

    const bodyMarkdown = campaign.content_json?.body || "";

    let sentCount = 0;
    let failCount = 0;

    const { sendViaLovable } = await import("../_shared/from-address.ts");

    const batchSize = 10;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const sendPromises = batch.map(async (sub: any) => {
        try {
          // Send via Lovable Cloud (verified pipeline). Per-recipient send.
          const sendResult = await sendViaLovable({
            recipientEmail: sub.email,
            recipientName: sub.name,
            senderName,
            subject: campaign.subject,
            bodyMarkdown,
            idempotencyKey: `campaign-${campaignId}-sub-${sub.id}`,
          });

          await supabase.from("email_send_logs").insert({
            campaign_id: campaignId,
            subscriber_id: sub.id,
            email: sub.email,
            status: sendResult.ok ? "sent" : "failed",
            resend_message_id: sendResult.messageId || null,
            sent_at: sendResult.ok ? new Date().toISOString() : null,
          });

          if (sendResult.ok) sentCount++;
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
