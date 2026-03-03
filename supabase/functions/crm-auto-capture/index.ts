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
    const { email, name, source, source_detail, author_id } = await req.json();

    if (!email || !source) {
      return new Response(JSON.stringify({ error: "email and source required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

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
      // Update name if we have a better one
      if (name && name !== email) {
        await sb.from("crm_contacts").update({ full_name: name }).eq("id", contactId);
      }
    } else {
      const { data: newContact, error: insertErr } = await sb
        .from("crm_contacts")
        .insert({
          author_id: targetAuthorId,
          full_name: name || email,
          email: email.toLowerCase().trim(),
          source,
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

    return new Response(JSON.stringify({ ok: true, contact_id: contactId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("crm-auto-capture error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
