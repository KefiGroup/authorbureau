// Single source of truth for turning a BP-01 (Email Marketing) kit into the
// real sending engine. enroll-subscriber + process-email-flows read ONLY
// email_flows / email_flow_steps, never author_nodes.content_json.
// Used by: save-author-node (publish) and enroll-subscriber (self-heal).
// deno-lint-ignore no-explicit-any
type Admin = any;

export async function syncBp01Flow(
  admin: Admin,
  authorId: string,
  content: Record<string, unknown>,
  bookId: string | null,
): Promise<{ flowId: string | null; steps: number }> {
  const seq = (content.welcome_sequence ?? content.steps ?? content.sequence_steps) as
    Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(seq) || seq.length === 0) return { flowId: null, steps: 0 };

  const { data: existingFlow } = await admin
    .from("email_flows").select("id").eq("author_id", authorId).eq("node_id", "BP-01").maybeSingle();
  let flowId = (existingFlow?.id as string | undefined) ?? null;
  const flowFields = {
    book_id: bookId,
    title: String(content.campaign_name ?? "Welcome Sequence"),
    status: "active",
  };
  if (flowId) {
    await admin.from("email_flows").update(flowFields).eq("id", flowId);
  } else {
    const { data: nf, error } = await admin.from("email_flows").insert({
      author_id: authorId, node_id: "BP-01", flow_type: "BP-01", ai_generated: true, ...flowFields,
    }).select("id").single();
    if (error) { console.error("[bp01-flow-sync] flow insert:", error.message); return { flowId: null, steps: 0 }; }
    flowId = nf.id;
  }

  // Emails go TO READERS: never greet them with the author's own first name.
  const { data: ap } = await admin.from("author_profiles").select("pen_name").eq("id", authorId).maybeSingle();
  const authorFirst = String(ap?.pen_name ?? "").trim().split(/\s+/)[0];
  const fix = (t: string) => {
    if (!authorFirst) return t;
    const n = authorFirst.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return t
      .replace(new RegExp(`\\b(Dearest|Dear|Hi|Hello|Hey|Welcome)\\s+${n}\\b`, "g"), "$1 {{first_name}}")
      .replace(new RegExp(`,\\s*${n}(?=[?!.,])`, "g"), ", {{first_name}}")
      .replace(new RegExp(`(^|\\n)\\s*${n},`, "g"), "$1{{first_name}},");
  };

  await admin.from("email_flow_steps").delete().eq("flow_id", flowId);
  const rows = seq.map((s, i) => ({
    flow_id: flowId,
    step_number: i + 1,
    subject: fix(String(s.subject ?? `Email ${i + 1}`)),
    preview_text: (s.preview_text as string) ?? null,
    body_markdown: fix(String(s.body ?? s.body_markdown ?? s.body_html ?? "")),
    trigger_delay_days: Number(
      s.send_delay_days ?? s.trigger_delay_days ?? (s.delay_hours ? Math.round(Number(s.delay_hours) / 24) : i),
    ),
    status: "active",
  }));
  const { error: sErr } = await admin.from("email_flow_steps").insert(rows);
  if (sErr) { console.error("[bp01-flow-sync] steps insert:", sErr.message); return { flowId, steps: 0 }; }
  return { flowId, steps: rows.length };
}

/** Self-heal: if the author has a Live BP-01 but no active flow with steps, build it now. */
export async function ensureBp01FlowActive(admin: Admin, authorId: string): Promise<void> {
  const { data: flow } = await admin
    .from("email_flows").select("id, status").eq("author_id", authorId).eq("node_id", "BP-01").maybeSingle();
  if (flow?.status === "active") {
    const { count } = await admin.from("email_flow_steps").select("id", { count: "exact", head: true }).eq("flow_id", flow.id);
    if ((count ?? 0) > 0) return;
  }
  const { data: nodes } = await admin
    .from("author_nodes").select("content_json, book_id, activated_at")
    .eq("author_id", authorId).eq("node_id", "BP-01").eq("status", "live")
    .order("activated_at", { ascending: false, nullsFirst: false }).limit(1);
  const node = nodes?.[0];
  if (!node?.content_json) return;
  const r = await syncBp01Flow(admin, authorId, node.content_json, node.book_id ?? null);
  console.log("[bp01-flow-sync] self-healed", { authorId, ...r });
}
