import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SCORE_MAP: Record<string, number> = {
  opt_in: 2, email_open: 1, link_click: 2, quiz_completed: 2,
  page_visit: 1, purchase: 3, note: 0, stage_change: 0,
};

const STAGES = ["new_lead", "engaged", "warm", "hot", "customer", "vip", "cold"];

async function getUserIdAndEmail(authHeader: string): Promise<{ userId: string | null; email: string | null }> {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { userId: null, email: null };

  const cloudAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Try Cloud auth first (current browser session token)
  try {
    const { data: { user: cloudUser } } = await cloudAdmin.auth.getUser(token);
    if (cloudUser) {
      console.log("[author-crm-data] 🔑 token resolved via cloud → user", cloudUser.id, cloudUser.email);
      return { userId: cloudUser.id, email: cloudUser.email ?? null };
    }
  } catch (_) { /* ignore */ }

  // 2) Fallback: try shared backend (SSO sessions), then map to cloud user by email
  try {
    const shared = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
    const { data: { user: sharedUser } } = await shared.auth.getUser(token);
    if (sharedUser) {
      let mappedId = sharedUser.id;
      if (sharedUser.email) {
        try {
          const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
          const match = users?.find(
            (u: any) => u.email?.toLowerCase() === sharedUser.email?.toLowerCase()
          );
          if (match) mappedId = match.id;
        } catch (_) { /* ignore */ }
      }
      console.log("[author-crm-data] 🔑 token resolved via shared → mapped to cloud user", mappedId, sharedUser.email);
      return { userId: mappedId, email: sharedUser.email ?? null };
    }
  } catch (_) { /* ignore */ }

  // 3) Final safety net: decode JWT payload to extract sub + email, then map to cloud user
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(payloadJson);
      const jwtSub: string | null = payload?.sub ?? null;
      const jwtEmail: string | null = payload?.email ?? null;
      if (jwtSub) {
        let mappedId = jwtSub;
        if (jwtEmail) {
          try {
            const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
            const match = users?.find(
              (u: any) => u.email?.toLowerCase() === jwtEmail.toLowerCase()
            );
            if (match) mappedId = match.id;
          } catch (_) { /* ignore */ }
        }
        console.log("[author-crm-data] 🔑 token resolved via JWT decode → user", mappedId, jwtEmail);
        return { userId: mappedId, email: jwtEmail };
      }
    }
  } catch (_) { /* ignore */ }

  console.warn("[author-crm-data] 🔑 token resolution FAILED for cloud, shared, and JWT decode");
  return { userId: null, email: null };
}

/**
 * Resolve the canonical author key used by crm_contacts/_tags/_activity_log.
 * Writes (e.g. submit-funnel) key these tables on author_profiles.user_id (the
 * shared-backend user id). When a user signs in via the cloud auth, the token
 * user id can be a different UUID — so we look up the matching author_profile
 * by user_id first, then fall back to email match.
 */
async function resolveAuthorKey(
  sb: any,
  tokenUserId: string,
  tokenEmail: string | null,
): Promise<{ authorContactKey: string; authorProfileId: string | null }> {
  // 1) Direct match on user_id (shared-token path)
  const { data: byUserId } = await sb
    .from("author_profiles")
    .select("id, user_id")
    .eq("user_id", tokenUserId)
    .maybeSingle();
  if (byUserId?.user_id) {
    return { authorContactKey: byUserId.user_id, authorProfileId: byUserId.id };
  }

  // 2) Email fallback (cloud-token path) — look up auth.users → author_profiles
  if (tokenEmail) {
    const { data: usersByEmail } = await sb
      .schema("auth")
      .from("users")
      .select("id")
      .eq("email", tokenEmail)
      .limit(5);
    const candidateIds = (usersByEmail || []).map((u: any) => u.id).filter(Boolean);
    if (candidateIds.length > 0) {
      const { data: profileByEmail } = await sb
        .from("author_profiles")
        .select("id, user_id")
        .in("user_id", candidateIds)
        .maybeSingle();
      if (profileByEmail?.user_id) {
        return { authorContactKey: profileByEmail.user_id, authorProfileId: profileByEmail.id };
      }
    }
  }

  // 3) Last resort: use token user id as-is (won't match crm_contacts but won't crash)
  return { authorContactKey: tokenUserId, authorProfileId: null };
}

function ok(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function recalcScore(sb: any, contactId: string) {
  const { data: logs } = await sb
    .from("crm_activity_log")
    .select("type, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(100);

  let score = 0;
  let emailOpens = 0;
  (logs || []).forEach((l: any) => {
    if (l.type === "email_open" && emailOpens >= 3) return;
    if (l.type === "email_open") emailOpens++;
    score += SCORE_MAP[l.type] || 0;
  });

  if (logs && logs.length > 0) {
    const lastDate = new Date(logs[0].created_at);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    score -= Math.floor(daysSince / 7);
  }
  score = Math.max(0, Math.min(10, score));

  await sb.from("crm_contacts").update({ abby_score: score, last_activity_at: new Date().toISOString() }).eq("id", contactId);
  return score;
}

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, "").trim().slice(0, 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return err("Unauthorized", 401);

    const { userId, email: tokenEmail } = await getUserIdAndEmail(authHeader);
    if (!userId) return err("Invalid token", 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve canonical author key (matches what submit-funnel writes to crm_contacts)
    const { authorContactKey, authorProfileId: resolvedProfileId } = await resolveAuthorKey(sb, userId, tokenEmail);
    console.log("[author-crm-data] 🧭 author key resolved:", JSON.stringify({
      token_user_id: userId,
      token_email: tokenEmail,
      author_contact_key: authorContactKey,
      author_profile_id: resolvedProfileId,
    }));

    const body = await req.json();
    const { action } = body;

    // ── LIST (with server-side pagination, search, filters) ──
    if (action === "list") {
      const page = Math.max(1, parseInt(body.page) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(body.pageSize) || 25));
      const search = body.search ? sanitizeSearch(body.search) : "";
      const stageFilter = body.stage && STAGES.includes(body.stage) ? body.stage : null;
      const sourceFilter = body.source || null;

      let query = sb
        .from("crm_contacts")
        .select("*", { count: "exact" })
        .eq("author_id", authorContactKey)
        .order("created_at", { ascending: false });

      if (stageFilter) query = query.eq("stage", stageFilter);
      if (sourceFilter) query = query.eq("source", sourceFilter);
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: contacts, error, count } = await query;
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

      // Server-side fallback: also fetch recent `leads` rows keyed off author_profiles.id
      // so fresh quiz captures show up immediately even if crm_contacts mirror lags.
      let recentLeads: any[] = [];
      const authorProfileId: string | null = resolvedProfileId;
      try {
        if (authorProfileId) {
          const { data: leads } = await sb
            .from("leads")
            .select("id, email, name, created_at, abby_score, quiz_stage, source, stage")
            .eq("author_id", authorProfileId)
            .order("created_at", { ascending: false })
            .limit(10);
          recentLeads = leads || [];
        }
      } catch (e) {
        console.warn("[author-crm-data] recentLeads fetch failed:", e);
      }

      const totalCount = count || 0;
      const effectiveTotal = Math.max(totalCount, recentLeads.length);

      console.log("[author-crm-data] 🔑 list audit:", JSON.stringify({
        token_user_id: userId,
        author_contact_key: authorContactKey,
        author_profile_id: authorProfileId,
        crm_contacts_count: totalCount,
        leads_count: recentLeads.length,
        effective_total: effectiveTotal,
      }));

      return ok({
        contacts: result,
        totalCount,
        effectiveTotal,
        recentLeads,
        authorProfileId,
        page,
        pageSize,
      });
    }

    // ── PIPELINE SUMMARY (archetype-aware) ──
    if (action === "pipeline-summary") {
      const archetype = body.archetype as string | undefined; // 'A' | 'B' | 'C' | 'D' | undefined (= all)
      const summaries = await Promise.all(
        STAGES.map(async (stage) => {
          let countQ = sb.from("crm_contacts").select("id", { count: "exact", head: true }).eq("author_id", authorContactKey).eq("stage", stage);
          let top3Q = sb.from("crm_contacts").select("id, full_name, abby_score, archetype, last_node_id").eq("author_id", authorContactKey).eq("stage", stage).order("abby_score", { ascending: false }).limit(3);
          if (archetype && ['A','B','C','D'].includes(archetype)) {
            countQ = countQ.eq("archetype", archetype);
            top3Q = top3Q.eq("archetype", archetype);
          }
          const [countRes, top3Res] = await Promise.all([countQ, top3Q]);
          return {
            stage,
            count: countRes.count || 0,
            top3: top3Res.data || [],
          };
        })
      );
      return ok({ summary: summaries, archetype: archetype || null });
    }

    // ── ADD ──
    if (action === "add") {
      const { full_name, email, phone, company, notes, tags } = body;
      if (!full_name) return err("full_name required");

      const { data: newContact, error } = await sb
        .from("crm_contacts")
        .insert({
          author_id: authorContactKey, full_name,
          email: email || null, phone: phone || null,
          company: company || null, notes: notes || null, source: "manual",
        })
        .select("id")
        .single();
      if (error) throw error;

      const tagList = tags?.split(",").map((t: string) => t.trim()).filter(Boolean);
      if (tagList?.length && newContact) {
        await sb.from("crm_contact_tags").insert(
          tagList.map((tag: string) => ({ author_id: authorContactKey, contact_id: newContact.id, tag }))
        );
      }

      return ok({ ok: true, id: newContact.id });
    }

    // ── DELETE ──
    if (action === "delete") {
      const { contact_id } = body;
      if (!contact_id) return err("contact_id required");
      const { data: owned } = await sb.from("crm_contacts").select("id").eq("id", contact_id).eq("author_id", authorContactKey).maybeSingle();
      if (!owned) return err("Not found", 404);
      await sb.from("crm_contact_tags").delete().eq("contact_id", contact_id);
      await sb.from("crm_activity_log").delete().eq("contact_id", contact_id);
      await sb.from("crm_contacts").delete().eq("id", contact_id);
      return ok({ ok: true });
    }

    // ── BULK DELETE (batched) ──
    if (action === "bulk-delete") {
      const { contact_ids } = body;
      if (!contact_ids?.length) return err("contact_ids required");
      const { data: owned } = await sb.from("crm_contacts").select("id").eq("author_id", authorContactKey).in("id", contact_ids);
      const ownedIds = (owned || []).map((c: any) => c.id);
      if (ownedIds.length > 0) {
        await sb.from("crm_contact_tags").delete().in("contact_id", ownedIds);
        await sb.from("crm_activity_log").delete().in("contact_id", ownedIds);
        await sb.from("crm_contacts").delete().in("id", ownedIds);
      }
      return ok({ ok: true, deleted: ownedIds.length });
    }

    // ── ADD TAG ──
    if (action === "add-tag") {
      const { contact_id, tag } = body;
      if (!contact_id || !tag) return err("contact_id and tag required");
      await sb.from("crm_contact_tags").insert({ author_id: authorContactKey, contact_id, tag: tag.trim() });
      return ok({ ok: true });
    }

    // ── LIST ACTIVITIES ──
    if (action === "list-activities") {
      const { contact_id } = body;
      const { data, error } = await sb
        .from("crm_activity_log").select("*")
        .eq("contact_id", contact_id).eq("author_id", authorContactKey)
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return ok({ activities: data || [] });
    }

    // ── ADD NOTE ──
    if (action === "add-note") {
      const { contact_id, content } = body;
      if (!contact_id || !content) return err("contact_id and content required");
      await sb.from("crm_activity_log").insert({
        author_id: authorContactKey, contact_id, type: "note", content: content.trim(),
      });
      await recalcScore(sb, contact_id);
      return ok({ ok: true });
    }

    // ── UPDATE STAGE ──
    if (action === "update-stage") {
      const { contact_id, stage } = body;
      if (!contact_id || !stage) return err("contact_id and stage required");
      if (!STAGES.includes(stage)) return err("Invalid stage");

      const { data: owned } = await sb.from("crm_contacts").select("id, stage").eq("id", contact_id).eq("author_id", authorContactKey).maybeSingle();
      if (!owned) return err("Not found", 404);

      const oldStage = owned.stage || "new_lead";
      await sb.from("crm_contacts").update({ stage, last_activity_at: new Date().toISOString() }).eq("id", contact_id);
      await sb.from("crm_activity_log").insert({
        author_id: authorContactKey, contact_id, type: "stage_change",
        content: `Moved from ${oldStage} to ${stage}`,
      });
      await recalcScore(sb, contact_id);
      return ok({ ok: true });
    }

    // ── BULK MOVE STAGE (batched) ──
    if (action === "bulk-move-stage") {
      const { contact_ids, stage } = body;
      if (!contact_ids?.length || !stage) return err("contact_ids and stage required");
      if (!STAGES.includes(stage)) return err("Invalid stage");

      await sb.from("crm_contacts")
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq("author_id", authorContactKey)
        .in("id", contact_ids);

      const activityRows = contact_ids.map((cid: string) => ({
        author_id: authorContactKey, contact_id: cid, type: "stage_change",
        content: `Bulk moved to ${stage}`,
      }));
      await sb.from("crm_activity_log").insert(activityRows);

      return ok({ ok: true });
    }

    // ── IMPORT CSV ──
    if (action === "import-csv") {
      const { rows } = body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) return err("rows required");
      let imported = 0;
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50).map((r: any) => ({
          author_id: authorContactKey, full_name: r.full_name || "Unknown",
          email: r.email || null, phone: r.phone || null,
          company: r.company || null, source: "csv_import",
        }));
        const { error } = await sb.from("crm_contacts").insert(batch);
        if (!error) imported += batch.length;
      }
      return ok({ ok: true, imported });
    }

    // ── ABBY INTELLIGENCE ──
    if (action === "abby-intelligence") {
      const { data: contacts } = await sb
        .from("crm_contacts").select("id, full_name, email, stage, abby_score, last_activity_at, source, quiz_stage, quiz_score")
        .eq("author_id", authorContactKey).order("abby_score", { ascending: false }).limit(100);

      const summary = (contacts || []).map((c: any) => ({
        name: c.full_name, email: c.email, stage: c.stage,
        score: c.abby_score, lastActivity: c.last_activity_at, source: c.source,
        quizStage: c.quiz_stage || null,
      }));

      const stageCounts: Record<string, number> = {};
      (contacts || []).forEach((c: any) => {
        stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
      });

      // Compute reader segments by quiz stage
      const readerSegmentCounts: Record<string, number> = { "suck": 0, "seek": 0, "succeed": 0, "sustain": 0 };
      (contacts || []).forEach((c: any) => {
        if (!c.quiz_stage) return;
        const qs = c.quiz_stage.toLowerCase();
        if (qs.includes("1") || qs.includes("2") || qs.includes("suck")) readerSegmentCounts["suck"]++;
        else if (qs.includes("3") || qs.includes("4") || qs.includes("seek")) readerSegmentCounts["seek"]++;
        else if (qs.includes("5") || qs.includes("6") || qs.includes("succeed")) readerSegmentCounts["succeed"]++;
        else if (qs.includes("7") || qs.includes("8") || qs.includes("sustain")) readerSegmentCounts["sustain"]++;
      });
      const totalQuizContacts = Object.values(readerSegmentCounts).reduce((a, b) => a + b, 0);

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return err("AI not configured", 500);

      const quizContext = totalQuizContacts > 0
        ? `\n\nSUCKCESS Quiz Reader Segments (${totalQuizContacts} quiz completions):\n- Stage 1-2 (Suck): ${readerSegmentCounts.suck} readers\n- Stage 3-4 (Seek): ${readerSegmentCounts.seek} readers\n- Stage 5-6 (Succeed): ${readerSegmentCounts.succeed} readers\n- Stage 7-8 (Sustain): ${readerSegmentCounts.sustain} readers\n\nInclude quiz stage-based segment insights in your analysis. Reference which stages have the most readers and what actions to take for each segment.`
        : "";

      const aiRes = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: `You are ABBY, an AI business advisor for authors. Analyse CRM contacts and provide actionable insights. Return valid JSON with this exact structure: {"actionList":[{"name":"string","reason":"string"}],"funnelHealth":{"summary":"string","stages":{"new_lead":0,"engaged":0,"warm":0,"hot":0,"customer":0,"vip":0,"cold":0}},"segmentInsights":[{"segment":"string","count":0,"nextAction":"string"}],"predictedConversions":[{"name":"string","likelihood":"string","reason":"string"}],"readerSegments":[{"group":"string","count":0,"recommendedAction":"string"}]}` },
            { role: "user", content: `Here are ${summary.length} contacts:\n${JSON.stringify(summary)}\n\nStage distribution: ${JSON.stringify(stageCounts)}${quizContext}\n\nProvide: 1) Top 5 action items 2) Funnel health analysis 3) Segment insights 4) Predicted conversions for next 7 days 5) Reader segments by SUCKCESS quiz stage (if quiz data exists)` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "crm_intelligence",
              description: "Return CRM intelligence analysis",
              parameters: {
                type: "object",
                properties: {
                  actionList: { type: "array", items: { type: "object", properties: { name: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] } },
                  funnelHealth: { type: "object", properties: { summary: { type: "string" }, stages: { type: "object" } }, required: ["summary", "stages"] },
                  segmentInsights: { type: "array", items: { type: "object", properties: { segment: { type: "string" }, count: { type: "number" }, nextAction: { type: "string" } }, required: ["segment", "count", "nextAction"] } },
                  predictedConversions: { type: "array", items: { type: "object", properties: { name: { type: "string" }, likelihood: { type: "string" }, reason: { type: "string" } }, required: ["name", "likelihood", "reason"] } },
                  readerSegments: { type: "array", items: { type: "object", properties: { group: { type: "string" }, count: { type: "number" }, recommendedAction: { type: "string" } }, required: ["group", "count", "recommendedAction"] } },
                },
                required: ["actionList", "funnelHealth", "segmentInsights", "predictedConversions", "readerSegments"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "crm_intelligence" } },
        }),
      });

      if (!aiRes.ok) {
        console.error("AI error:", aiRes.status, await aiRes.text());
        return err("AI analysis failed", 500);
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let intelligence;
      try {
        intelligence = JSON.parse(toolCall?.function?.arguments || "{}");
      } catch {
        intelligence = { actionList: [], funnelHealth: { summary: "Unable to analyse", stages: {} }, segmentInsights: [], predictedConversions: [], readerSegments: [] };
      }

      // Ensure readerSegments exists
      if (!intelligence.readerSegments) intelligence.readerSegments = [];

      return ok({ intelligence });
    }

    // ── ABBY CONTACT RECOMMENDATION ──
    if (action === "abby-contact-recommendation") {
      const { contact_id } = body;
      if (!contact_id) return err("contact_id required");

      const { data: contact } = await sb.from("crm_contacts").select("*").eq("id", contact_id).eq("author_id", authorContactKey).maybeSingle();
      if (!contact) return err("Not found", 404);

      const { data: activities } = await sb.from("crm_activity_log").select("type, content, created_at")
        .eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(20);

      const quizInfo = contact.quiz_stage ? `, Quiz Stage: ${contact.quiz_stage}, Quiz Score: ${contact.quiz_score}%` : "";

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return err("AI not configured", 500);

      const aiRes = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are ABBY, an AI business advisor. Give a short (2-3 sentence) personalised recommendation for how the author should engage this contact next. Be specific and actionable. If the contact has quiz stage data, reference it in your recommendation." },
            { role: "user", content: `Contact: ${contact.full_name}, Email: ${contact.email}, Stage: ${contact.stage}, Score: ${contact.abby_score}, Source: ${contact.source}${quizInfo}\nRecent activity: ${JSON.stringify(activities || [])}` },
          ],
          max_completion_tokens: 200,
        }),
      });

      if (!aiRes.ok) return err("AI recommendation failed", 500);
      const aiData = await aiRes.json();
      const recommendation = aiData.choices?.[0]?.message?.content || "No recommendation available.";
      return ok({ recommendation });
    }

    // ── CROSS-SELL SUGGEST ──
    // Reads each contact's last_node_id + archetype and recommends the next-best
    // live product from author_nodes using the archetype ladder: B → A → C → D.
    // No AI call — deterministic, fast, runs on every CRM open.
    if (action === "cross-sell-suggest") {
      const ARCHETYPE_LADDER: Record<string, string[]> = {
        B: ["A", "C", "D"], // opt-in subscriber → push to a sale, then high-ticket, then event
        A: ["C", "D", "B"], // buyer → upsell to high-ticket, then event
        C: ["D", "A", "B"], // client → event, then more sales
        D: ["A", "C", "B"], // event attendee → sales, then high-ticket
      };
      const ARCHETYPE_LABEL: Record<string, string> = {
        A: "Sales", B: "Opt-in", C: "Application", D: "Event",
      };

      // Pull contacts that have any node engagement
      const { data: contacts } = await sb
        .from("crm_contacts")
        .select("id, full_name, email, stage, abby_score, archetype, last_node_id")
        .eq("author_id", authorContactKey)
        .not("last_node_id", "is", null)
        .order("abby_score", { ascending: false })
        .limit(50);

      // Pull all live products for this author (the catalogue we can suggest from)
      const { data: liveNodes } = await sb
        .from("author_nodes")
        .select("node_id, archetype, delivery_url, payment_link, third_party_url, content_json")
        .eq("author_id", authorContactKey)
        .eq("status", "live");

      const catalogueByArchetype: Record<string, any[]> = { A: [], B: [], C: [], D: [] };
      for (const n of liveNodes || []) {
        if (n.archetype && catalogueByArchetype[n.archetype]) {
          catalogueByArchetype[n.archetype].push(n);
        }
      }

      const suggestions = (contacts || [])
        .map((c: any) => {
          const currentArchetype = c.archetype as string | null;
          if (!currentArchetype || !ARCHETYPE_LADDER[currentArchetype]) return null;
          const ladder = ARCHETYPE_LADDER[currentArchetype];

          // Walk the ladder to the first archetype with a live product the contact hasn't already engaged with
          for (const targetArchetype of ladder) {
            const candidates = (catalogueByArchetype[targetArchetype] || [])
              .filter((n: any) => n.node_id !== c.last_node_id);
            if (candidates.length === 0) continue;

            const nextProduct = candidates[0];
            const title =
              nextProduct.content_json?.title ||
              nextProduct.content_json?.headline ||
              nextProduct.node_id;

            return {
              contact_id: c.id,
              contact_name: c.full_name,
              contact_email: c.email,
              contact_stage: c.stage,
              contact_score: c.abby_score,
              from_archetype: currentArchetype,
              from_archetype_label: ARCHETYPE_LABEL[currentArchetype],
              from_node_id: c.last_node_id,
              to_archetype: targetArchetype,
              to_archetype_label: ARCHETYPE_LABEL[targetArchetype],
              to_node_id: nextProduct.node_id,
              to_product_title: title,
              to_product_url: nextProduct.delivery_url || nextProduct.payment_link || nextProduct.third_party_url || null,
            };
          }
          return null;
        })
        .filter(Boolean);

      return ok({
        suggestions,
        catalogueCounts: {
          A: catalogueByArchetype.A.length,
          B: catalogueByArchetype.B.length,
          C: catalogueByArchetype.C.length,
          D: catalogueByArchetype.D.length,
        },
      });
    }

    return err("Unknown action");
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("author-crm-data error:", errMessage);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
