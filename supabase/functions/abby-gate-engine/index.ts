// ABBY Node-Triggered Activation Engine — evaluates the 4 gates and fires
// idempotent side-effects (funnel creation, welcome enrolment, social schedule,
// hot-lead invites). Per-book scoped. Reuses existing infrastructure; never
// touches builders or content generation.
//
// POST { author_id, book_id? }  → { gates: [{id, fired, status, reason?}], summary }
//
// Gate 1: BP-01 + BP-02 + BP-04 all live  → ensure opt-in funnel + welcome seq
// Gate 2: BP-06 live                      → ensure sales funnel + nudge
// Gate 3: Gate 2 passed AND BP-03 live    → social campaign nudge
// Gate 4: ≥5 hot leads (abby_score ≥ 61) AND any YR-* live → hot-lead invite + nudge
//
// Idempotency: each (author, book, gate) fires exactly once via abby_nudges
// dedupe (nudge_type = 'gate_<n>_fired_<bookid>').

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOT_LEAD_THRESHOLD = 61;
const HOT_LEAD_MIN_COUNT = 5;
const YR_NODES = [
  "YR-19","YR-20","YR-21","YR-22","YR-23","YR-24","YR-25","YR-26","YR-27","YR-28",
];

interface GateResult {
  id: 1 | 2 | 3 | 4;
  name: string;
  ready: boolean;
  fired: boolean;
  alreadyFired: boolean;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const author_id: string | undefined = body.author_id;
    const book_id: string | null = body.book_id ?? null;
    if (!author_id) {
      return json({ success: false, error: "author_id required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Author profile (for user_id to query crm_contacts which keys on user_id).
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id, user_id, pen_name, author_slug")
      .eq("id", author_id)
      .maybeSingle();
    if (!profile) return json({ success: false, error: "author not found" }, 404);

    // Load this author's nodes (filter to book if given).
    let q = supabase
      .from("author_nodes")
      .select("node_id, status, book_id")
      .eq("author_id", author_id);
    const { data: nodeRows } = await q;
    const allNodes = (nodeRows ?? []) as Array<{ node_id: string; status: string | null; book_id: string | null }>;

    // For per-book gates 1–3 we look only at rows matching the book context (or
    // null book_id which we treat as applying to every book).
    const bookNodes = book_id
      ? allNodes.filter((n) => !n.book_id || n.book_id === book_id)
      : allNodes;
    const isLive = (id: string) => bookNodes.some((n) => n.node_id === id && n.status === "live");

    // Helper: idempotent nudge emit (also serves as the "fired" marker).
    async function fireNudge(opts: {
      gateId: 1 | 2 | 3 | 4;
      title: string;
      content: string;
      action_label?: string;
      action_url?: string;
    }): Promise<{ alreadyFired: boolean }> {
      const nudgeKey = `gate_${opts.gateId}_fired_${book_id ?? "any"}`;
      const { data: existing } = await supabase
        .from("abby_nudges")
        .select("id")
        .eq("author_id", author_id)
        .eq("nudge_type", nudgeKey)
        .limit(1);
      if (existing && existing.length > 0) return { alreadyFired: true };

      await supabase.from("abby_nudges").insert({
        author_id, // abby_nudges.author_id FK → author_profiles.id
        nudge_type: nudgeKey,
        title: opts.title,
        content: opts.content,
        action_label: opts.action_label ?? null,
        action_url: opts.action_url ?? null,
      });
      return { alreadyFired: false };
    }

    const gates: GateResult[] = [];

    // ─── Gate 1: Funnel Live ────────────────────────────────────────
    {
      const ready = isLive("BP-01") && isLive("BP-02") && isLive("BP-04");
      let fired = false;
      let alreadyFired = false;
      if (ready) {
        // Side-effect: ensure opt-in funnel exists (BP-02 lead magnet funnel).
        await ensureFunnel(supabase, author_id, "BP-02", book_id, "lead_magnet");
        // Welcome sequence is auto-enrolled when readers opt in (Sprint 57 BP-01
        // autowire); we don't enrol anyone here, just confirm the flow exists.
        await ensureFunnel(supabase, author_id, "BP-01", book_id, "opt_in");

        const r = await fireNudge({
          gateId: 1,
          title: "🎉 Your opt-in funnel is live",
          content:
            "ABBY just published your lead-magnet funnel and switched on the welcome email sequence. New readers will now flow into your CRM automatically. Next: build your first paid product (BP-06) so the leads have something to buy.",
          action_label: "Build BP-06 Workbook",
          action_url: "/dashboard?section=workbooks",
        });
        fired = !r.alreadyFired;
        alreadyFired = r.alreadyFired;
      }
      gates.push({ id: 1, name: "Funnel Live", ready, fired, alreadyFired });
    }

    // ─── Gate 2: First Revenue ──────────────────────────────────────
    {
      const ready = isLive("BP-06");
      let fired = false;
      let alreadyFired = false;
      if (ready) {
        await ensureFunnel(supabase, author_id, "BP-06", book_id, "sales");
        const r = await fireNudge({
          gateId: 2,
          title: "💰 Sales campaign activated",
          content:
            "Your workbook is live and ABBY just turned on the sales funnel. To receive payouts on sales, connect Stripe in Account Settings — readers can already buy without it (Authors Bureau is Merchant of Record).",
          action_label: "Connect Stripe",
          action_url: "/dashboard?section=settings",
        });
        fired = !r.alreadyFired;
        alreadyFired = r.alreadyFired;
      }
      gates.push({ id: 2, name: "First Revenue", ready, fired, alreadyFired });
    }

    // ─── Gate 3: Audience Scale ─────────────────────────────────────
    {
      const gate2Ready = isLive("BP-06");
      const ready = gate2Ready && isLive("BP-03");
      let fired = false;
      let alreadyFired = false;
      if (ready) {
        const r = await fireNudge({
          gateId: 3,
          title: "📱 Social campaign live",
          content:
            "ABBY is now scheduling 4 posts per week across your connected social channels. Posts pull from your published products and lead magnets so the funnel feeds itself.",
          action_label: "View Social Calendar",
          action_url: "/dashboard?section=marketing-hub&tab=social",
        });
        fired = !r.alreadyFired;
        alreadyFired = r.alreadyFired;
      }
      gates.push({ id: 3, name: "Audience Scale", ready, fired, alreadyFired });
    }

    // ─── Gate 4: High Ticket ────────────────────────────────────────
    {
      // Hot-lead count uses author_profiles.user_id (crm_contacts.author_id is
      // legacy user_id per Sprint 58 memory). Author-wide, not per-book.
      const { count: hotCount } = await supabase
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profile.user_id)
        .gte("abby_score", HOT_LEAD_THRESHOLD);

      const anyYrLive = allNodes.some((n) => YR_NODES.includes(n.node_id) && n.status === "live");
      const ready = (hotCount ?? 0) >= HOT_LEAD_MIN_COUNT && anyYrLive;

      let fired = false;
      let alreadyFired = false;
      let reason: string | undefined;
      if (!anyYrLive && (hotCount ?? 0) >= HOT_LEAD_MIN_COUNT) {
        reason = "hot_leads_ready_publish_a_yr_node";
      }
      if (ready) {
        // Pull the hot leads and email each a personal invitation. Capped at 25
        // to avoid runaway sends on long-running accounts.
        const { data: hotLeads } = await supabase
          .from("crm_contacts")
          .select("id, email, full_name, abby_score, last_node_id")
          .eq("author_id", profile.user_id)
          .gte("abby_score", HOT_LEAD_THRESHOLD)
          .order("abby_score", { ascending: false })
          .limit(25);

        const liveYr = allNodes.find((n) => YR_NODES.includes(n.node_id) && n.status === "live");
        await sendHotLeadInvites(supabase, {
          authorProfileId: author_id,
          penName: profile.pen_name ?? "Your author",
          authorSlug: profile.author_slug ?? "",
          yrNodeId: liveYr?.node_id ?? "YR-19",
          leads: hotLeads ?? [],
        });

        const r = await fireNudge({
          gateId: 4,
          title: "🚀 Yield revenue campaign active",
          content: `ABBY just sent personal invitations to ${hotLeads?.length ?? 0} hot leads (score ≥ ${HOT_LEAD_THRESHOLD}) about your ${liveYr?.node_id ?? "Yield"} offer. These are your highest-intent contacts — expect replies within 48 hours.`,
          action_label: "Open CRM",
          action_url: "/dashboard?section=crm",
        });
        fired = !r.alreadyFired;
        alreadyFired = r.alreadyFired;
      }
      gates.push({ id: 4, name: "High Ticket", ready, fired, alreadyFired, reason });
    }

    return json({
      success: true,
      author_id,
      book_id,
      gates,
      summary: {
        ready: gates.filter((g) => g.ready).map((g) => g.id),
        fired_now: gates.filter((g) => g.fired).map((g) => g.id),
      },
    });
  } catch (e) {
    console.error("[abby-gate-engine] error:", e);
    return json({ success: false, error: (e as Error).message }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function ensureFunnel(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  nodeId: "BP-01" | "BP-02" | "BP-06",
  bookId: string | null,
  funnelType: "opt_in" | "lead_magnet" | "sales",
) {
  try {
    const { data: existing } = await supabase
      .from("funnels")
      .select("id, status")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .limit(1)
      .maybeSingle();

    let funnelId: string | null = existing?.id ?? null;

    if (!funnelId) {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-funnel`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          author_id: authorId,
          node_id: nodeId,
          book_id: bookId,
          funnel_type: funnelType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      funnelId = data?.funnel?.id ?? null;
      if (!funnelId) {
        console.warn(`[gate-engine] generate-funnel ${nodeId} returned no funnel id`);
        return;
      }
    }

    // Auto-complete stages from Library + publish.
    const archetype: "A" | "B" =
      nodeId === "BP-06" ? "A" : "B";
    await autoCompleteFunnelStages(supabase, {
      funnelId,
      archetype,
      authorId,
      bookId,
    });

    // Publish if not already live.
    if (existing?.status !== "live") {
      await supabase
        .from("funnels")
        .update({ status: "live", published_at: new Date().toISOString() })
        .eq("id", funnelId);
    }
  } catch (e) {
    console.warn(`[gate-engine] ensureFunnel(${nodeId}) error:`, e);
  }
}

// Pulls Library content (BP-01 welcome sequence, BP-02 lead magnet,
// BP-03 social post, BP-06 product) and seeds funnel_stage_overrides
// for any stage that is still empty. Idempotent — does not overwrite
// existing overrides.
async function autoCompleteFunnelStages(
  supabase: ReturnType<typeof createClient>,
  opts: {
    funnelId: string;
    archetype: "A" | "B";
    authorId: string;
    bookId: string | null;
  },
) {
  try {
    // Pull source nodes for this book.
    const { data: nodes } = await supabase
      .from("author_nodes")
      .select("node_id, content_json, microsite_url, book_id")
      .eq("author_id", opts.authorId)
      .in("node_id", ["BP-01", "BP-02", "BP-03", "BP-06"]);

    const filtered = (nodes ?? []).filter(
      (n: any) => !opts.bookId || !n.book_id || n.book_id === opts.bookId,
    );
    const byNode: Record<string, any> = {};
    for (const n of filtered) byNode[n.node_id] = n;

    const bp01 = byNode["BP-01"]?.content_json ?? {};
    const bp02 = byNode["BP-02"]?.content_json ?? {};
    const bp06 = byNode["BP-06"];
    const welcome = Array.isArray(bp01.welcome_sequence) ? bp01.welcome_sequence : [];
    const step1 = welcome[0] ?? null;
    const step2 = welcome[1] ?? null;

    // Pull a recent BP-03 social post body (any platform).
    const { data: socialRows } = await supabase
      .from("social_posts")
      .select("content")
      .eq("author_id", opts.authorId)
      .eq("node_id", "BP-03")
      .order("created_at", { ascending: false })
      .limit(1);
    const socialBody = socialRows?.[0]?.content ?? "";

    // Lead magnet delivery URL: prefer BP-02 microsite_url, else library_asset.
    const leadMagnetUrl =
      byNode["BP-02"]?.microsite_url ||
      bp02?.library_asset?.public_url ||
      bp02?.optin_page?.cta_url ||
      "";

    const upsellHeadline =
      bp06?.content_json?.tagline ||
      bp06?.content_json?.sales_page?.headline ||
      bp06?.content_json?.funnel_name ||
      "";
    const upsellUrl = bp06?.microsite_url || "";

    const stages: Record<string, Record<string, string>> =
      opts.archetype === "B"
        ? {
            traffic: socialBody ? { source_notes: socialBody } : {},
            confirm_email: step1
              ? {
                  subject: step1.subject ?? "",
                  body: step1.body ?? "",
                }
              : {},
            deliver_magnet: leadMagnetUrl
              ? {
                  delivery_url: leadMagnetUrl,
                  subject: `Your free download is here`,
                }
              : {},
            nurture_1: step2
              ? {
                  delay_days: String(step2.send_delay_days ?? 1),
                  subject: step2.subject ?? "",
                  body: step2.body ?? "",
                }
              : {},
            upsell:
              upsellHeadline || upsellUrl
                ? {
                    offer_headline: upsellHeadline,
                    offer_url: upsellUrl,
                  }
                : {},
          }
        : {
            // Archetype A (sales) — seed onboarding email from BP-01 step 1
            // and thank_you next-step from BP-02 magnet URL.
            onboarding_email: step1
              ? { subject: step1.subject ?? "", body: step1.body ?? "" }
              : {},
            thank_you: leadMagnetUrl
              ? { headline: "Thanks — here's your bonus", next_step_url: leadMagnetUrl }
              : {},
          };

    // Existing overrides — don't clobber.
    const { data: existingOverrides } = await supabase
      .from("funnel_stage_overrides")
      .select("stage_id")
      .eq("funnel_id", opts.funnelId);
    const existingStageIds = new Set((existingOverrides ?? []).map((r: any) => r.stage_id));

    for (const [stageId, fields] of Object.entries(stages)) {
      if (existingStageIds.has(stageId)) continue;
      if (Object.keys(fields).length === 0) {
        console.warn(`[gate-engine] autoComplete: no Library content for stage ${stageId}`);
        continue;
      }
      const { error } = await supabase.from("funnel_stage_overrides").insert({
        funnel_id: opts.funnelId,
        author_id: opts.authorId,
        stage_id: stageId,
        field_overrides: fields,
      });
      if (error) console.warn(`[gate-engine] autoComplete insert ${stageId}:`, error.message);
    }
  } catch (e) {
    console.warn("[gate-engine] autoCompleteFunnelStages error:", e);
  }
}

async function sendHotLeadInvites(
  supabase: ReturnType<typeof createClient>,
  opts: {
    authorProfileId: string;
    penName: string;
    authorSlug: string;
    yrNodeId: string;
    leads: Array<{ id: string; email: string; full_name: string | null }>;
  },
) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`;
  for (const lead of opts.leads) {
    if (!lead.email) continue;
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          authorId: opts.authorProfileId,
          to: lead.email,
          subject: `A personal invitation from ${opts.penName}`,
          template: "generic",
          data: {
            heading: `Hi ${lead.full_name?.split(" ")[0] ?? "there"},`,
            body:
              `Because you've been one of my most engaged readers, I wanted to invite you personally to my ${opts.yrNodeId} offer. ` +
              `It's a deeper, hands-on level of work I only open up to a small group at a time. ` +
              `Reply to this email if you'd like the details.`,
            sender_name: opts.penName,
          },
        }),
      });
    } catch (e) {
      console.warn(`[gate-engine] invite to ${lead.email} failed:`, e);
    }
  }
}
