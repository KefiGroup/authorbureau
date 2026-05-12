import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, source, source_detail, author_id, message, node_id } = await req.json();

    if (!email || !source) {
      return new Response(JSON.stringify({ error: "email and source required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic email shape validation
    const emailNorm = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm) || emailNorm.length > 254) {
      return new Response(JSON.stringify({ error: "invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap message size to prevent abuse
    if (message && String(message).length > 4000) {
      return new Response(JSON.stringify({ error: "message too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit: max 5 captures per email per 5 minutes
    try {
      const { data: allowed } = await sb.rpc("check_rate_limit", {
        p_key: `crm-auto-capture:${emailNorm}`,
        p_limit: 5,
        p_window_seconds: 300,
      });
      if (allowed === false) {
        return new Response(JSON.stringify({ error: "rate limited, try again shortly" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (_) { /* rate-limit failure is non-fatal */ }


    // Determine which author_id to use — if not provided, use first admin
    let targetAuthorId = author_id;
    if (!targetAuthorId) {
      const { data: adminRole } = await sb
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .single();
      targetAuthorId = adminRole?.user_id;
    }

    if (!targetAuthorId) {
      return new Response(JSON.stringify({ error: "No author_id and no admin found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert contact by email (dedup)
    const { data: existing } = await sb
      .from("crm_contacts")
      .select("id")
      .eq("author_id", targetAuthorId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    let contactId: string;

    if (existing) {
      contactId = existing.id;
      const updateFields: Record<string, any> = {};
      if (name && name !== email) updateFields.full_name = name;
      if (node_id) updateFields.last_node_id = node_id;
      if (Object.keys(updateFields).length) {
        await sb.from("crm_contacts").update(updateFields).eq("id", contactId);
      }
    } else {
      const { data: newContact, error: insertErr } = await sb
        .from("crm_contacts")
        .insert({
          author_id: targetAuthorId,
          full_name: name || email,
          email: email.toLowerCase().trim(),
          source,
          last_node_id: node_id || null,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      contactId = newContact.id;
    }

    // Add source tag (idempotent)
    const tag = source.replace(/_/g, "-");
    const { error: tagErr } = await sb.from("crm_contact_tags").insert({
      author_id: targetAuthorId,
      contact_id: contactId,
      tag,
    });
    // Ignore unique violation
    if (tagErr && !tagErr.message.includes("duplicate")) {
      console.error("Tag error:", tagErr);
    }

    // Log activity
    await sb.from("crm_activity_log").insert({
      author_id: targetAuthorId,
      contact_id: contactId,
      type: "note",
      content: `Auto-captured from ${source}${source_detail ? `: ${source_detail}` : ""}`,
    });

    // Save contact message if message provided
    if (message && message.trim()) {
      await sb.from("contact_messages").insert({
        author_id: targetAuthorId,
        sender_name: name || email,
        sender_email: email.toLowerCase().trim(),
        message: message.trim(),
        source,
        source_detail: source_detail || null,
        status: "open",
      });

      // In-app notification for the author
      await sb.from("notifications").insert({
        user_id: targetAuthorId,
        title: "New message received",
        message: `${name || email} sent you a message via ${source.replace(/_/g, " ")}`,
        link: "/dashboard?section=messages",
      });

      // Send email notification to the author
      try {
        const { data: profile } = await sb
          .from("author_profiles")
          .select("pen_name")
          .eq("user_id", targetAuthorId)
          .maybeSingle();

        // Get author email from auth.users
        const { data: { user: authorUser } } = await sb.auth.admin.getUserById(targetAuthorId);
        
        if (authorUser?.email) {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "Authors Bureau <notify@notify.authorsbureau.com>",
                to: [authorUser.email],
                subject: `New message from ${name || email}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a1a1a;">You have a new message</h2>
                    <p style="color: #555;"><strong>${name || email}</strong> (${email}) sent you a message:</p>
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                      <p style="color: #333; white-space: pre-wrap;">${message.trim().slice(0, 500)}</p>
                    </div>
                    <p style="color: #555; font-size: 14px;">Source: ${source.replace(/_/g, " ")}</p>
                    <a href="https://authorbureau.lovable.app/dashboard?section=messages" 
                       style="display: inline-block; background: #c8a45a; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">
                      View in Dashboard
                    </a>
                  </div>
                `,
              }),
            });
          }
        }
      } catch (emailErr) {
        console.error("Email notification error (non-fatal):", emailErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, contact_id: contactId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("crm-auto-capture error:", errMessage);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
