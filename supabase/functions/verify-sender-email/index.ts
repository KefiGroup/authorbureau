import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlPage(title: string, message: string, success: boolean) {
  const accent = success ? "#10b981" : "#ef4444";
  const icon = success ? "&#10003;" : "&#33;";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;color:#0f172a}
  .card{background:#fff;border-radius:14px;padding:36px;max-width:440px;width:100%;box-shadow:0 10px 30px rgba(15,23,42,.08);text-align:center}
  .badge{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:999px;background:${accent}1a;color:${accent};font-size:30px;margin-bottom:16px}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#475569;line-height:1.5;margin:0 0 20px;font-size:14px}
  a{display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:500;font-size:14px}
</style></head><body>
<div class="card">
  <div class="badge">${success ? "✓" : "!"}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="https://authorsbureau.com/dashboard">Go to dashboard</a>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return new Response(htmlPage("Invalid link", "This verification link is missing its token.", false), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: row, error } = await admin
      .from("author_email_settings")
      .select("id, domain_verified, verified_at")
      .eq("verification_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!row) {
      return new Response(htmlPage("Link expired", "This verification link is invalid or has already been used.", false), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (row.domain_verified) {
      return new Response(htmlPage("Already verified", "Your sender email is already confirmed. You're good to go!", true), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const { error: updErr } = await admin
      .from("author_email_settings")
      .update({
        domain_verified: true,
        verified_at: new Date().toISOString(),
        verification_token: null,
      })
      .eq("id", row.id);

    if (updErr) throw updErr;

    return new Response(htmlPage("Email verified", "Thanks! Your sender email is confirmed and your emails are ready to send.", true), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("verify-sender-email error:", err);
    return new Response(htmlPage("Something went wrong", "We couldn't verify your email. Please try again from the dashboard.", false), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
});
