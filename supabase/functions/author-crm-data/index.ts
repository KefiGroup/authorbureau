import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

async function getUserId(authHeader: string): Promise<string | null> {
  const shared = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await shared.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await getUserId(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // ── LIST ──
    if (action === "list") {
      const { data: contacts, error } = await sb
        .from("crm_contacts")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const ids = (contacts || []).map((c: any) => c.id);
      let tagsMap: Record<string, string[]> = {};
      if (ids.length > 0) {
        const { data: tags } = await sb
          .from("crm_contact_tags")
          .select("contact_id, tag")
          .in("contact_id", ids);
        (tags || []).forEach((t: any) => {
          if (!tagsMap[t.contact_id]) tagsMap[t.contact_id] = [];
          tagsMap[t.contact_id].push(t.tag);
        });
      }

      const result = (contacts || []).map((c: any) => ({
        ...c,
        tags: tagsMap[c.id] || [],
      }));

      return new Response(JSON.stringify({ contacts: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ADD ──
    if (action === "add") {
      const { full_name, email, phone, company, notes, tags } = body;
      if (!full_name) {
        return new Response(JSON.stringify({ error: "full_name required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newContact, error } = await sb
        .from("crm_contacts")
        .insert({
          author_id: userId,
          full_name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          notes: notes || null,
          source: "manual",
        })
        .select("id")
        .single();
      if (error) throw error;

      const tagList = tags
        ?.split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      if (tagList?.length && newContact) {
        await sb.from("crm_contact_tags").insert(
          tagList.map((tag: string) => ({
            author_id: userId,
            contact_id: newContact.id,
            tag,
          }))
        );
      }

      return new Response(JSON.stringify({ ok: true, id: newContact.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE ──
    if (action === "delete") {
      const { contact_id } = body;
      if (!contact_id) {
        return new Response(JSON.stringify({ error: "contact_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify ownership
      const { data: owned } = await sb
        .from("crm_contacts")
        .select("id")
        .eq("id", contact_id)
        .eq("author_id", userId)
        .maybeSingle();
      if (!owned) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sb.from("crm_contact_tags").delete().eq("contact_id", contact_id);
      await sb.from("crm_activity_log").delete().eq("contact_id", contact_id);
      await sb.from("crm_contacts").delete().eq("id", contact_id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ADD TAG ──
    if (action === "add-tag") {
      const { contact_id, tag } = body;
      if (!contact_id || !tag) {
        return new Response(JSON.stringify({ error: "contact_id and tag required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sb.from("crm_contact_tags").insert({
        author_id: userId,
        contact_id,
        tag: tag.trim(),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST ACTIVITIES ──
    if (action === "list-activities") {
      const { contact_id } = body;
      const { data, error } = await sb
        .from("crm_activity_log")
        .select("*")
        .eq("contact_id", contact_id)
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ activities: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ADD NOTE ──
    if (action === "add-note") {
      const { contact_id, content } = body;
      if (!contact_id || !content) {
        return new Response(JSON.stringify({ error: "contact_id and content required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sb.from("crm_activity_log").insert({
        author_id: userId,
        contact_id,
        type: "note",
        content: content.trim(),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── IMPORT CSV ──
    if (action === "import-csv") {
      const { rows } = body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return new Response(JSON.stringify({ error: "rows required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let imported = 0;
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50).map((r: any) => ({
          author_id: userId,
          full_name: r.full_name || "Unknown",
          email: r.email || null,
          phone: r.phone || null,
          company: r.company || null,
          source: "csv_import",
        }));
        const { error } = await sb.from("crm_contacts").insert(batch);
        if (!error) imported += batch.length;
      }
      return new Response(JSON.stringify({ ok: true, imported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("author-crm-data error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
