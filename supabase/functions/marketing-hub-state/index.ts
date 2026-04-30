import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

type Action =
  | "snapshot"
  | "social_calendar"
  | "update_social_post"
  | "reschedule_social_post"
  | "post_social_now"
  | "sequences"
  | "toggle_sequence_status"
  | "activate_all_sequences"
  | "update_sequence"
  | "generate_all_sequences"
  | "activate_node"
  | "pause_node"
  | "email_settings"
  | "save_email_settings"
  | "send_verification_email";

function respond(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveIdentity(token: string): Promise<{ userId: string; email: string | null } | null> {
  try {
    const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.id) {
      return { userId: sharedUser.user.id, email: sharedUser.user.email ?? null };
    }
  } catch (_error) {
    // Fall through to Cloud auth below.
  }

  try {
    const localClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: localUser } = await localClient.auth.getUser(token);
    if (localUser?.user?.id) {
      return { userId: localUser.user.id, email: localUser.user.email ?? null };
    }
  } catch (_error) {
    // No-op.
  }

  return null;
}

async function resolveAuthorProfile(
  cloudAdmin: ReturnType<typeof createClient>,
  identity: { userId: string; email: string | null },
) {
  const { data: profile, error } = await cloudAdmin
    .from("author_profiles")
    .select("id, pen_name, author_slug, user_id")
    .eq("user_id", identity.userId)
    .maybeSingle();

  if (error) throw error;
  if (profile) return profile;

  if (identity.email) {
    const { data: usersList } = await cloudAdmin.auth.admin.listUsers();
    const match = usersList?.users?.find(
      (u: { id: string; email?: string | null }) => u.email?.toLowerCase() === identity.email!.toLowerCase(),
    );
    if (match?.id) {
      const { data: emailProfile } = await cloudAdmin
        .from("author_profiles")
        .select("id, pen_name, author_slug, user_id")
        .eq("user_id", match.id)
        .maybeSingle();
      if (emailProfile) return emailProfile;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return respond({ success: false, error: "No auth token provided." });
    }

    const identity = await resolveIdentity(token);
    if (!identity) {
      return respond({ success: false, error: "Invalid session. Please sign in again." });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action | undefined;
    if (!action) {
      return respond({ success: false, error: "Action is required." });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authorProfile = await resolveAuthorProfile(cloudAdmin, identity);
    if (!authorProfile) {
      return respond({ success: false, error: "Unable to locate your author profile." });
    }

    // Optional per-book scope. When present, every per-book table is filtered
    // by `book_id`; author-level tables (e.g. author_email_settings) ignore it.
    const bookId = typeof body?.book_id === "string" && body.book_id.length > 0 ? body.book_id : null;

    if (action === "snapshot") {
      let nodesQuery = cloudAdmin
        .from("author_nodes")
        .select("node_id, status, marketing_activated_at, activated_at, content_json, personalised_name, microsite_url")
        .eq("author_id", authorProfile.id);
      if (bookId) nodesQuery = nodesQuery.eq("book_id", bookId);

      let socialQuery = cloudAdmin
        .from("social_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03");
      if (bookId) socialQuery = socialQuery.eq("book_id", bookId);

      let sequencesQuery = cloudAdmin
        .from("email_flows")
        .select("id", { count: "exact", head: true })
        .eq("author_id", authorProfile.id);
      if (bookId) sequencesQuery = sequencesQuery.eq("book_id", bookId);

      let contactsQuery = cloudAdmin
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        // crm_contacts.author_id is keyed by auth.users.id (matches RLS auth.uid()=author_id),
        // not author_profiles.id. submit-funnel resolves authorUserId before insert.
        .eq("author_id", (authorProfile as any).user_id);
      if (bookId) contactsQuery = contactsQuery.eq("book_id", bookId);

      const [nodesRes, socialRes, sequencesRes, contactsRes, settingsRes] = await Promise.all([
        nodesQuery,
        socialQuery,
        sequencesQuery,
        contactsQuery,
        cloudAdmin
          .from("author_email_settings")
          .select("domain_verified")
          .eq("author_id", authorProfile.id)
          .maybeSingle(),
      ]);

      if (nodesRes.error) throw nodesRes.error;
      if (socialRes.error) throw socialRes.error;
      if (sequencesRes.error) throw sequencesRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      return respond({
        success: true,
        author_profile_id: authorProfile.id,
        node_rows: nodesRes.data ?? [],
        bp03_posts_count: socialRes.count ?? 0,
        lead_count: contactsRes.count ?? 0,
        cross_counts: {
          sequences: sequencesRes.count ?? 0,
          socialQueued: socialRes.count ?? 0,
          contacts: contactsRes.count ?? 0,
          domainPending: !!settingsRes.data && settingsRes.data.domain_verified === false,
        },
      });
    }

    if (action === "social_calendar") {
      let nodeQuery = cloudAdmin
        .from("author_nodes")
        .select("status, marketing_activated_at, activated_at")
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03");
      if (bookId) nodeQuery = nodeQuery.eq("book_id", bookId);

      let postsQuery = cloudAdmin
        .from("social_posts")
        .select("id, platform, content, scheduled_at, status, posted_at, post_type, post_index")
        .eq("author_id", authorProfile.id)
        .eq("node_id", "BP-03")
        .order("scheduled_at", { ascending: true })
        .limit(500);
      if (bookId) postsQuery = postsQuery.eq("book_id", bookId);

      const [nodeRes, postsRes] = await Promise.all([nodeQuery.maybeSingle(), postsQuery]);

      if (nodeRes.error) throw nodeRes.error;
      if (postsRes.error) throw postsRes.error;

      const nodeRow = nodeRes.data;
      return respond({
        success: true,
        author_profile_id: authorProfile.id,
        bp03_activated: !!nodeRow && (
          nodeRow.status === "live" ||
          nodeRow.status === "content_ready" ||
          !!nodeRow.activated_at ||
          !!nodeRow.marketing_activated_at
        ),
        posts: postsRes.data ?? [],
      });
    }

    if (action === "update_social_post") {
      const postId = typeof body?.post_id === "string" ? body.post_id : "";
      const nextStatus = body?.status === "posted" ? "posted" : body?.status === "ready" ? "ready" : null;
      if (!postId || !nextStatus) {
        return respond({ success: false, error: "A valid post id and status are required." });
      }

      const { data: updatedPost, error } = await cloudAdmin
        .from("social_posts")
        .update({
          status: nextStatus,
          posted_at: nextStatus === "posted" ? new Date().toISOString() : null,
        })
        .eq("id", postId)
        .eq("author_id", authorProfile.id)
        .select("id, status, posted_at")
        .maybeSingle();

      if (error) throw error;
      if (!updatedPost) {
        return respond({ success: false, error: "Post not found." });
      }

      return respond({ success: true, post: updatedPost });
    }

    if (action === "reschedule_social_post") {
      const postId = typeof body?.post_id === "string" ? body.post_id : "";
      const scheduledAt = typeof body?.scheduled_at === "string" ? body.scheduled_at : "";
      if (!postId || !scheduledAt) {
        return respond({ success: false, error: "A valid post id and scheduled date are required." });
      }

      // Accept either a date-only string ("YYYY-MM-DD" → default 09:00 local time) or a full ISO/datetime-local
      // string ("YYYY-MM-DDTHH:mm" or full ISO). Author chooses the precise go-live moment.
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(scheduledAt);
      const parsedDate = isDateOnly
        ? new Date(`${scheduledAt}T09:00:00`)
        : new Date(scheduledAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return respond({ success: false, error: "The new scheduled date is invalid." });
      }

      const { data: updatedPost, error } = await cloudAdmin
        .from("social_posts")
        .update({
          scheduled_at: parsedDate.toISOString(),
          status: "ready",
          posted_at: null,
        })
        .eq("id", postId)
        .eq("author_id", authorProfile.id)
        .select("id, status, posted_at, scheduled_at")
        .maybeSingle();

      if (error) throw error;
      if (!updatedPost) {
        return respond({ success: false, error: "Post not found." });
      }

      return respond({ success: true, post: updatedPost });
    }

    if (action === "post_social_now") {
      const postId = typeof body?.post_id === "string" ? body.post_id : "";
      if (!postId) {
        return respond({ success: false, error: "A valid post id is required." });
      }

      const nowIso = new Date().toISOString();
      // Look up the post first so we can preserve any existing scheduled_at; if none, stamp it as now.
      const { data: existing } = await cloudAdmin
        .from("social_posts")
        .select("scheduled_at")
        .eq("id", postId)
        .eq("author_id", authorProfile.id)
        .maybeSingle();

      const { data: updatedPost, error } = await cloudAdmin
        .from("social_posts")
        .update({
          status: "posted",
          posted_at: nowIso,
          scheduled_at: existing?.scheduled_at ?? nowIso,
        })
        .eq("id", postId)
        .eq("author_id", authorProfile.id)
        .select("id, status, posted_at, scheduled_at")
        .maybeSingle();

      if (error) throw error;
      if (!updatedPost) {
        return respond({ success: false, error: "Post not found." });
      }

      return respond({ success: true, post: updatedPost });
    }

    if (action === "sequences") {
      // Include book_id in the projection so the UI can show a per-book badge
      // and so the per-book filter operates on a real column. email_flows.book_id
      // is nullable for legacy rows, which still surface in the "All Books" view.
      let flowsQuery = cloudAdmin
        .from("email_flows")
        .select("id, title, description, flow_type, node_id, book_id, status, total_subscribers, open_rate, click_rate, ai_generated, created_at")
        .eq("author_id", authorProfile.id)
        .order("created_at", { ascending: false });
      if (bookId) flowsQuery = flowsQuery.eq("book_id", bookId);
      const { data: flows, error: flowsErr } = await flowsQuery;

      if (flowsErr) throw flowsErr;

      // Sort in framework order: master_nurture first, then BP-01 → BP-09 → BA-10 → ... → YR-28.
      const NODE_ORDER: Record<string, number> = {};
      ["BP-01","BP-02","BP-03","BP-04","BP-05","BP-06","BP-07","BP-08","BP-09",
       "BA-10","BA-11","BA-12","BA-13","BA-14","BA-15","BA-16","BA-17","BA-18",
       "YR-19","YR-20","YR-21","YR-22","YR-23","YR-24","YR-25","YR-26","YR-27","YR-28"]
        .forEach((id, i) => { NODE_ORDER[id] = i + 1; });
      const orderRank = (f: any) => {
        if (f.flow_type === "master_nurture") return 0;
        if (f.node_id && NODE_ORDER[f.node_id]) return NODE_ORDER[f.node_id];
        return 999;
      };
      const flowList = (flows ?? []).slice().sort((a, b) => orderRank(a) - orderRank(b));
      let stepsByFlow: Record<string, any[]> = {};

      if (flowList.length > 0) {
        const { data: steps, error: stepsErr } = await cloudAdmin
          .from("email_flow_steps")
          .select("id, flow_id, step_number, subject, trigger_delay_days, body_markdown, preview_text")
          .in("flow_id", flowList.map((f) => f.id))
          .order("step_number", { ascending: true });

        if (stepsErr) throw stepsErr;

        (steps ?? []).forEach((row: any) => {
          (stepsByFlow[row.flow_id] = stepsByFlow[row.flow_id] || []).push(row);
        });
      }

      // Active enrollment counts per flow
      const enrollmentCounts: Record<string, number> = {};
      if (flowList.length > 0) {
        const { data: enrRows } = await cloudAdmin
          .from("email_flow_enrollments")
          .select("flow_id")
          .in("flow_id", flowList.map((f) => f.id))
          .eq("status", "active");
        (enrRows ?? []).forEach((r: any) => {
          enrollmentCounts[r.flow_id] = (enrollmentCounts[r.flow_id] || 0) + 1;
        });
      }

      return respond({
        success: true,
        author_profile_id: authorProfile.id,
        flows: flowList,
        steps_by_flow: stepsByFlow,
        active_enrollments_by_flow: enrollmentCounts,
      });
    }

    if (action === "update_sequence") {
      const flowId = typeof body?.flow_id === "string" ? body.flow_id : "";
      if (!flowId) return respond({ success: false, error: "flow_id is required." });

      // Verify ownership
      const { data: ownFlow } = await cloudAdmin
        .from("email_flows")
        .select("id")
        .eq("id", flowId)
        .eq("author_id", authorProfile.id)
        .maybeSingle();
      if (!ownFlow) return respond({ success: false, error: "Sequence not found." });

      // Optional flow-level updates
      const flowPatch: Record<string, unknown> = {};
      if (typeof body?.title === "string") flowPatch.title = body.title.slice(0, 250);
      if (typeof body?.description === "string") flowPatch.description = body.description.slice(0, 2000);
      if (Object.keys(flowPatch).length > 0) {
        const { error: upFlowErr } = await cloudAdmin
          .from("email_flows")
          .update(flowPatch)
          .eq("id", flowId);
        if (upFlowErr) throw upFlowErr;
      }

      // Replace steps if provided
      if (Array.isArray(body?.steps)) {
        const incoming = body.steps as any[];
        // Delete existing then insert (avoids unique-constraint conflicts on step_number)
        const { error: delErr } = await cloudAdmin
          .from("email_flow_steps")
          .delete()
          .eq("flow_id", flowId);
        if (delErr) throw delErr;

        if (incoming.length > 0) {
          const rows = incoming.map((s, idx) => ({
            flow_id: flowId,
            step_number: Number.isFinite(s.step_number) ? Number(s.step_number) : idx + 1,
            trigger_delay_days: Number.isFinite(s.trigger_delay_days) ? Number(s.trigger_delay_days) : 0,
            subject: typeof s.subject === "string" ? s.subject.slice(0, 500) : "",
            body_markdown: typeof s.body_markdown === "string" ? s.body_markdown : (typeof s.body === "string" ? s.body : ""),
            preview_text: typeof s.preview_text === "string" ? s.preview_text.slice(0, 500) : null,
            status: "active",
          }));
          const { error: insErr } = await cloudAdmin
            .from("email_flow_steps")
            .insert(rows);
          if (insErr) throw insErr;
        }
      }

      return respond({ success: true });
    }

    if (action === "generate_all_sequences") {
      // Generate node-specific sequences for the 28 product nodes + a master_nurture flow.
      const NODES = [
        'BP-01','BP-02','BP-03','BP-04','BP-05','BP-06','BP-07','BP-08','BP-09',
        'BA-10','BA-11','BA-12','BA-13','BA-14','BA-15','BA-16','BA-17','BA-18',
        'YR-19','YR-20','YR-21','YR-22','YR-23','YR-24','YR-25','YR-26','YR-27','YR-28',
      ];
      const includeMaster = body?.include_master !== false;

      const { data: existingFlows } = await cloudAdmin
        .from("email_flows").select("node_id, flow_type")
        .eq("author_id", authorProfile.id);
      const existingNodes = new Set((existingFlows || []).filter((f: any) => f.node_id).map((f: any) => f.node_id));
      const hasMaster = (existingFlows || []).some((f: any) => f.flow_type === 'master_nurture');

      // Master first so node sequences can roll into it on completion.
      const targets: Array<{ kind: 'master' | 'node'; node_id?: string }> = [];
      if (includeMaster && !hasMaster) targets.push({ kind: 'master' });
      for (const n of NODES) if (!existingNodes.has(n)) targets.push({ kind: 'node', node_id: n });

      const skipped = NODES.filter((n) => existingNodes.has(n)).length + (hasMaster ? 1 : 0);

      // Run generations in the background — each AI call can take 5-15s and 29
      // sequential calls would exceed any reasonable client timeout. Respond
      // immediately so the UI doesn't abort, and let the worker fan-out.
      const runBackground = async () => {
        const results: Array<{ target: string; status: string; flow_id?: string; error?: string }> = [];
        for (const t of targets) {
          try {
            const payload: Record<string, unknown> = { author_id: authorProfile.id };
            if (t.kind === 'master') payload.sequence_type = 'master_nurture';
            else payload.node_id = t.node_id;

            const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-email-sequence`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify(payload),
            });
            const data = await resp.json().catch(() => ({}));
            results.push({
              target: t.kind === 'master' ? 'master_nurture' : t.node_id!,
              status: resp.ok ? 'created' : 'failed',
              flow_id: data?.flow_id,
              error: resp.ok ? undefined : (data?.message || `HTTP ${resp.status}`),
            });
          } catch (e) {
            results.push({ target: t.kind === 'master' ? 'master_nurture' : t.node_id!, status: 'error', error: (e as Error).message });
          }
        }

        const created = results.filter((r) => r.status === 'created').length;
        const failed = results.length - created;
        try {
          await cloudAdmin.from('notifications').insert({
            user_id: authorProfile.user_id,
            title: `Email sequences ready`,
            message: `${created} sequence${created === 1 ? '' : 's'} generated${failed ? ` · ${failed} failed` : ''}. Open Marketing Hub → Sequences to review.`,
            link: `/marketing-hub?tab=sequences`,
          });
        } catch (_) { /* ignore notification errors */ }
      };

      // @ts-ignore — EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
        // @ts-ignore
        EdgeRuntime.waitUntil(runBackground());
      } else {
        // Fallback: don't await
        runBackground().catch((e) => console.error('background generation error:', e));
      }

      return respond({
        success: true,
        background: true,
        skipped_existing: skipped,
        attempted: targets.length,
        results: [],
      });
    }

    if (action === "toggle_sequence_status") {
      const flowId = typeof body?.flow_id === "string" ? body.flow_id : "";
      const nextStatus = body?.status === "active" ? "active" : body?.status === "paused" ? "paused" : null;
      if (!flowId || !nextStatus) {
        return respond({ success: false, error: "A valid flow id and status are required." });
      }

      const { data: updatedFlow, error } = await cloudAdmin
        .from("email_flows")
        .update({ status: nextStatus })
        .eq("id", flowId)
        .eq("author_id", authorProfile.id)
        .select("id, status")
        .maybeSingle();

      if (error) throw error;
      if (!updatedFlow) {
        return respond({ success: false, error: "Sequence not found." });
      }

      return respond({ success: true, flow: updatedFlow });
    }

    if (action === "activate_all_sequences") {
      // Bulk-activate every draft (and optionally paused) sequence for this author.
      const includePaused = body?.include_paused === true;
      const statuses = includePaused ? ["draft", "paused"] : ["draft"];
      const { data: updated, error } = await cloudAdmin
        .from("email_flows")
        .update({ status: "active" })
        .eq("author_id", authorProfile.id)
        .in("status", statuses)
        .select("id");
      if (error) throw error;
      return respond({ success: true, activated_count: updated?.length ?? 0 });
    }

    if (action === "activate_node" || action === "pause_node") {
      const nodeIds = Array.isArray(body?.node_ids) ? body.node_ids.filter((n: any) => typeof n === "string") : [];
      if (nodeIds.length === 0) {
        return respond({ success: false, error: "At least one node id is required." });
      }

      const now = action === "activate_node" ? new Date().toISOString() : null;
      const results: any[] = [];

      for (const nid of nodeIds) {
        const { data: existing } = await cloudAdmin
          .from("author_nodes")
          .select("id, status")
          .eq("author_id", authorProfile.id)
          .eq("node_id", nid)
          .maybeSingle();

        if (existing) {
          const { data: updated, error: updErr } = await cloudAdmin
            .from("author_nodes")
            .update({ marketing_activated_at: now })
            .eq("id", existing.id)
            .select("node_id, marketing_activated_at")
            .maybeSingle();
          if (updErr) {
            results.push({ node_id: nid, error: updErr.message });
          } else {
            results.push({ node_id: nid, ok: true, row: updated });
          }
        } else if (action === "activate_node") {
          const { data: inserted, error: insErr } = await cloudAdmin
            .from("author_nodes")
            .insert({
              author_id: authorProfile.id,
              node_id: nid,
              node_name: nid,
              status: "live",
              marketing_activated_at: now,
            })
            .select("node_id, marketing_activated_at")
            .maybeSingle();
          if (insErr) {
            results.push({ node_id: nid, error: insErr.message });
          } else {
            results.push({ node_id: nid, ok: true, row: inserted });
          }
        } else {
          results.push({ node_id: nid, ok: true, row: null });
        }
      }

      const failed = results.filter((r) => r.error);
      return respond({
        success: failed.length === 0,
        results,
        error: failed.length > 0 ? failed.map((f) => `${f.node_id}: ${f.error}`).join("; ") : undefined,
      });
    }

    if (action === "email_settings") {
      const { data: settings, error } = await cloudAdmin
        .from("author_email_settings")
        .select("sender_name, reply_to_email, domain_verified, subdomain, verification_sent_at, verified_at")
        .eq("author_id", authorProfile.id)
        .maybeSingle();

      if (error) throw error;

      return respond({
        success: true,
        author_profile_id: authorProfile.id,
        settings: settings ?? {
          sender_name: "",
          reply_to_email: "",
          domain_verified: false,
          subdomain: null,
          verification_sent_at: null,
          verified_at: null,
        },
      });
    }

    if (action === "save_email_settings") {
      const senderName = typeof body?.sender_name === "string" ? body.sender_name.trim() : "";
      const replyToRaw = typeof body?.reply_to_email === "string" ? body.reply_to_email.trim() : "";
      const replyTo = replyToRaw === "" ? null : replyToRaw;

      if (!senderName) {
        return respond({ success: false, error: "Sender name is required." });
      }
      if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
        return respond({ success: false, error: "Reply-to email is not a valid email address." });
      }

      const { data: saved, error } = await cloudAdmin
        .from("author_email_settings")
        .upsert(
          {
            author_id: authorProfile.id,
            sender_name: senderName,
            reply_to_email: replyTo,
          },
          { onConflict: "author_id" },
        )
        .select("sender_name, reply_to_email, domain_verified, subdomain")
        .maybeSingle();

      if (error) throw error;

      return respond({ success: true, settings: saved });
    }

    if (action === "send_verification_email") {
      const { data: settings, error: loadErr } = await cloudAdmin
        .from("author_email_settings")
        .select("id, sender_name, reply_to_email, domain_verified, verification_token, verification_sent_at")
        .eq("author_id", authorProfile.id)
        .maybeSingle();

      if (loadErr) throw loadErr;
      if (!settings || !settings.reply_to_email || !settings.sender_name) {
        return respond({ success: false, error: "Save your sender name and reply-to email before sending a confirmation." });
      }
      if (settings.domain_verified) {
        return respond({ success: true, already_verified: true });
      }

      // Throttle: 60s between sends
      if (settings.verification_sent_at) {
        const last = new Date(settings.verification_sent_at).getTime();
        if (Date.now() - last < 60_000) {
          return respond({ success: false, error: "Please wait a moment before sending another confirmation email." });
        }
      }

      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const sentAt = new Date().toISOString();

      const { error: tokenErr } = await cloudAdmin
        .from("author_email_settings")
        .update({ verification_token: token, verification_sent_at: sentAt })
        .eq("id", settings.id);

      if (tokenErr) throw tokenErr;

      const verifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-sender-email?token=${token}`;

      try {
        const sendRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              templateName: "sender-email-verification",
              recipientEmail: settings.reply_to_email,
              idempotencyKey: `sender-verify-${settings.id}-${sentAt}`,
              templateData: {
                senderName: settings.sender_name,
                verifyUrl,
              },
            }),
          },
        );
        if (!sendRes.ok) {
          const errText = await sendRes.text().catch(() => "");
          console.error("send-transactional-email failed:", sendRes.status, errText);
        }
      } catch (e) {
        console.error("send-transactional-email error:", e);
      }

      return respond({
        success: true,
        sent_to: settings.reply_to_email,
        sent_at: sentAt,
      });
    }

    return respond({ success: false, error: "Unsupported action." });
  } catch (err) {
    console.error("marketing-hub-state error:", err);
    return respond({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});
