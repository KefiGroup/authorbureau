// Single source of truth for turning a BP-01 (Email Marketing) kit into the
// real sending engine. enroll-subscriber + process-email-flows read ONLY
// email_flows / email_flow_steps, never author_nodes.content_json.
// Used by: save-author-node (publish) and enroll-subscriber (self-heal).
//
// Flow model (author-level unified welcome, with an opt-in per-book override):
//   - MASTER flow    → email_flows row with node_id 'BP-01' AND book_id IS NULL.
//                      One per author. The unified welcome every subscriber gets
//                      unless the author switches to book-specific mode.
//   - BOOK flow      → email_flows row with node_id 'BP-01' AND book_id = <book>.
//                      One per book. Only used when welcome_flow_mode =
//                      'book_specific'; otherwise it is kept warm but unused.
// The author's choice lives in author_email_settings.welcome_flow_mode
// ('master' | 'book_specific'), default 'master'.
// deno-lint-ignore no-explicit-any
type Admin = any;

export type WelcomeFlowMode = "master" | "book_specific";

function extractSequence(content: Record<string, unknown>) {
  const seq = (content.welcome_sequence ?? content.steps ?? content.sequence_steps) as
    | Array<Record<string, unknown>>
    | undefined;
  return Array.isArray(seq) && seq.length > 0 ? seq : null;
}

/** Read the author's chosen welcome mode. Defaults to the unified master flow. */
export async function getWelcomeFlowMode(admin: Admin, authorProfileId: string): Promise<WelcomeFlowMode> {
  const { data } = await admin
    .from("author_email_settings")
    .select("welcome_flow_mode")
    .eq("author_id", authorProfileId)
    .maybeSingle();
  return data?.welcome_flow_mode === "book_specific" ? "book_specific" : "master";
}

async function upsertFlow(
  admin: Admin,
  authorId: string,
  bookId: string | null,
  content: Record<string, unknown>,
  seq: Array<Record<string, unknown>>,
  fix: (t: string) => string,
): Promise<{ flowId: string | null; steps: number }> {
  let q = admin.from("email_flows").select("id").eq("author_id", authorId).eq("node_id", "BP-01");
  q = bookId ? q.eq("book_id", bookId) : q.is("book_id", null);
  const { data: existingFlow } = await q.maybeSingle();

  let flowId = (existingFlow?.id as string | undefined) ?? null;
  const flowFields = {
    book_id: bookId,
    title: String(content.campaign_name ?? (bookId ? "Book Welcome Sequence" : "Master Welcome Sequence")),
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

export async function syncBp01Flow(
  admin: Admin,
  authorId: string,
  content: Record<string, unknown>,
  bookId: string | null,
): Promise<{ flowId: string | null; steps: number; masterFlowId: string | null; mode: WelcomeFlowMode }> {
  const mode = await getWelcomeFlowMode(admin, authorId);
  const seq = extractSequence(content);
  if (!seq) return { flowId: null, steps: 0, masterFlowId: null, mode };

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

  // 1. Always keep this book's own sequence in its own row — publishing one book
  //    must never wipe another book's welcome emails.
  const bookResult = bookId
    ? await upsertFlow(admin, authorId, bookId, content, seq, fix)
    : { flowId: null, steps: 0 };

  // 2. Maintain the author-level MASTER flow. It is (re)written when the author
  //    explicitly nominates this kit as the master, or when no master exists yet
  //    (so every author always has a unified welcome to fall back on).
  const { data: master } = await admin
    .from("email_flows").select("id").eq("author_id", authorId).eq("node_id", "BP-01").is("book_id", null).maybeSingle();
  const nominated = content.set_as_master_welcome === true || content.welcome_flow_scope === "master";
  let masterResult: { flowId: string | null; steps: number } = { flowId: master?.id ?? null, steps: 0 };
  if (nominated || !master) {
    masterResult = await upsertFlow(admin, authorId, null, content, seq, fix);
  }

  const active = mode === "book_specific" && bookResult.flowId ? bookResult : masterResult;
  return {
    flowId: active.flowId ?? masterResult.flowId ?? bookResult.flowId,
    steps: active.steps || masterResult.steps || bookResult.steps,
    masterFlowId: masterResult.flowId,
    mode,
  };
}

/**
 * Self-heal: if the author has a Live BP-01 but no active flow with steps, build it now.
 * Guarantees every author always has at least a master welcome flow.
 */
export async function ensureBp01FlowActive(admin: Admin, authorId: string, bookId?: string | null): Promise<void> {
  const mode = await getWelcomeFlowMode(admin, authorId);

  // Always keep this book's own flow warm (if the book has a Live BP-01), so
  // switching to book-specific mode later never silently falls back to another
  // book's emails. `mode` still decides which flow the reader is enrolled in.
  void mode;
  const wantBookFlow = !!bookId;

  const check = async (bid: string | null) => {
    let q = admin.from("email_flows").select("id, status").eq("author_id", authorId).eq("node_id", "BP-01");
    q = bid ? q.eq("book_id", bid) : q.is("book_id", null);
    const { data: flow } = await q.maybeSingle();
    if (flow?.status !== "active") return false;
    const { count } = await admin
      .from("email_flow_steps").select("id", { count: "exact", head: true }).eq("flow_id", flow.id);
    return (count ?? 0) > 0;
  };

  const masterOk = await check(null);
  const bookOk = wantBookFlow ? await check(bookId!) : true;
  if (masterOk && bookOk) return;

  // Rebuild from the Live BP-01 node — prefer the node for this book when we need it.
  const rebuildFrom = async (bid: string | null) => {
    let q = admin
      .from("author_nodes").select("content_json, book_id, activated_at")
      .eq("author_id", authorId).eq("node_id", "BP-01").eq("status", "live");
    if (bid) q = q.eq("book_id", bid);
    const { data: nodes } = await q.order("activated_at", { ascending: false, nullsFirst: false }).limit(1);
    const node = nodes?.[0];
    if (!node?.content_json) return null;
    return await syncBp01Flow(admin, authorId, node.content_json, node.book_id ?? bid ?? null);
  };

  if (wantBookFlow && !bookOk) {
    const r = await rebuildFrom(bookId!);
    if (r) console.log("[bp01-flow-sync] self-healed book flow", { authorId, bookId, ...r });
  }
  if (!masterOk) {
    const r = await rebuildFrom(null);
    if (r) console.log("[bp01-flow-sync] self-healed master flow", { authorId, ...r });
  }
}

/**
 * Pick the flow ids a new subscriber should be enrolled into, honouring the
 * author's welcome mode. Always falls back to the master flow so nobody is
 * left without a welcome sequence.
 */
export async function resolveWelcomeFlowIds(
  admin: Admin,
  authorProfileId: string,
  bookId: string | null,
): Promise<{ mode: WelcomeFlowMode; flowIds: string[] }> {
  const mode = await getWelcomeFlowMode(admin, authorProfileId);
  const { data: flows } = await admin
    .from("email_flows")
    .select("id, book_id, status")
    .eq("author_id", authorProfileId)
    .eq("node_id", "BP-01");

  const list = (flows ?? []) as Array<{ id: string; book_id: string | null; status: string }>;
  const master = list.find((f) => f.book_id === null && f.status === "active");
  const book = bookId ? list.find((f) => f.book_id === bookId && f.status === "active") : undefined;

  if (mode === "book_specific" && book) return { mode, flowIds: [book.id] };
  if (master) return { mode, flowIds: [master.id] };
  // Last-resort fallback: any active BP-01 flow beats sending nothing.
  const any = list.find((f) => f.status === "active");
  return { mode, flowIds: any ? [any.id] : [] };
}
