// @ts-nocheck — Deno runtime
/**
 * topical-social-engine — BP-03 "Anchor & Hook" weekly topical posts.
 *
 * Rules (see docs/04-node-frameworks/BP-03.md §2b):
 *  1. Anchor & Hook: every post pairs ONE real headline from a curated niche
 *     RSS feed (timely hook) with ONE principle from the analysed book (anchor).
 *     No headline may be invented; the source title + link are stored.
 *  2. Visual format is chosen by content type (news_split, carousel,
 *     comparison, quote_card, cheat_sheet) and mapped to a BP-03 archetype.
 *  3. Output lands as PENDING drafts. Nothing is posted until the author
 *     approves (single or "Schedule all"), which creates social_posts rows.
 *
 * Modes:
 *  - { mode: "cron" }                       weekly batch (bounded, locked, idempotent per week)
 *  - { action: "generate", book_id }        author-triggered for one book
 *  - { action: "approve", ids[] }           approve selected drafts
 *  - { action: "approve_all", book_id }     approve every pending draft for the book
 *  - { action: "dismiss", ids[] }
 */
import { fetchAiGateway, corsHeaders, makeServiceClient, buildAuthorContext } from "../_shared/builder-helpers.ts";
import { resolveUser } from "../_shared/resolve-user.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BATCH = 5;
const SITE = "https://authorsbureau.com";

const FEEDS: Record<string, { name: string; url: string }[]> = {
  finance: [
    { name: "CNBC Finance", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html" },
    { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/" },
    { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
    { name: "Entrepreneur", url: "https://www.entrepreneur.com/latest.rss" },
  ],
  leadership: [
    { name: "Fast Company", url: "https://www.fastcompany.com/leadership/rss" },
    { name: "Inc.", url: "https://www.inc.com/rss/" },
    { name: "Entrepreneur", url: "https://www.entrepreneur.com/latest.rss" },
    { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  ],
  health: [
    { name: "ScienceDaily Health", url: "https://www.sciencedaily.com/rss/health_medicine.xml" },
    { name: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml" },
    { name: "NYT Well", url: "https://rss.nytimes.com/services/xml/rss/nyt/Well.xml" },
    { name: "NPR Health", url: "https://feeds.npr.org/1128/rss.xml" },
  ],
};

const FORMATS = {
  news_split: "Question",   // hot take on the headline
  carousel: "Framework",    // step-by-step, swipe carousel
  comparison: "Lesson",     // Old way vs Book way
  quote_card: "Quote",      // mindset / authority line
  cheat_sheet: "Proof",     // actionable checklist
} as const;
const PLATFORM_FOR: Record<string, string> = {
  news_split: "linkedin", carousel: "linkedin", comparison: "instagram", quote_card: "facebook", cheat_sheet: "instagram",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() - day + 1); // Monday
  return t.toISOString().slice(0, 10);
}

function pickNiche(text: string): string {
  const t = text.toLowerCase();
  const score = (ws: string[]) => ws.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  const s = {
    finance: score(["invest", "money", "financ", "wealth", "stock", "buffett", "retire", "budget", "value"]),
    health: score(["health", "heal", "wellness", "fitness", "nutrition", "medical", "body", "mental", "cancer"]),
    leadership: score(["lead", "business", "career", "success", "entrepreneur", "executive", "mindset", "team", "management"]),
  };
  return Object.entries(s).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(s).sort((a, b) => b[1] - a[1])[0][0] : "leadership";
}

const strip = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();

async function fetchFeed(f: { name: string; url: string }) {
  try {
    const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 AuthorsBureauBot" } });
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<item[\s\S]*?<\/item>/g)].slice(0, 25).map((m) => {
      const g = (tag: string) => strip((m[0].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)) || [])[1] || "");
      return { source: f.name, title: g("title"), link: g("link"), summary: g("description").slice(0, 280), date: g("pubDate") };
    }).filter((i) => i.title && i.link);
  } catch { return []; }
}

function keywords(text: string) {
  const stop = new Set(["the","and","for","with","your","that","this","from","into","what","how","are","you","our","their","about","have","will","book","author"]);
  return [...new Set(text.toLowerCase().match(/[a-z]{4,}/g) || [])].filter((w) => !stop.has(w));
}

async function generateForBook(sb, authorId: string, bookId: string, wk: string) {
  const { data: profile } = await sb.from("author_profiles").select("pen_name, genres, user_id, slug").eq("id", authorId).single();
  if (!profile) return { book_id: bookId, skipped: "no_profile" };
  const ctxB = await buildAuthorContext(sb, authorId, profile.user_id ?? null, bookId, "BP-03");
  if (ctxB.contextBlocked || !ctxB.bookTitle) return { book_id: bookId, skipped: "no_book_analysis" };
  const ctx = ctxB.ctx || {};
  const frameworks = JSON.stringify(ctx.key_frameworks || []).slice(0, 2500);
  const bookText = `${ctxB.bookTitle} ${ctxB.coreThesis || ""} ${frameworks} ${(profile.genres || []).join(" ")} ${ctxB.book?.genre || ""}`;
  const niche = pickNiche(bookText);
  const kws = keywords(bookText);

  const cutoff = Date.now() - 10 * 86400_000;
  const items = (await Promise.all(FEEDS[niche].map(fetchFeed))).flat()
    .filter((i) => !i.date || Date.parse(i.date) > cutoff)
    .map((i) => ({ ...i, score: kws.reduce((n, k) => n + ((i.title + " " + i.summary).toLowerCase().includes(k) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score).slice(0, 10);
  if (items.length < 3) return { book_id: bookId, skipped: "no_news" };

  const prompt = `You write weekly topical social posts for an author. Use the ANCHOR & HOOK rule:
each post pairs exactly one REAL headline from the list below (the hook) with one principle from the author's book (the anchor).
Never invent news, numbers, quotes, people or results that are not in the headline/summary or the book context. No em dashes. No prices.

Book: ${ctxB.bookTitle}
Author: ${profile.pen_name}
Core thesis: ${ctxB.coreThesis}
Key frameworks: ${frameworks}
Audience: ${JSON.stringify(ctx.target_audience_persona || {}).slice(0, 800)}

HEADLINES (use the index):
${items.map((i, n) => `[${n}] ${i.source}: ${i.title} :: ${i.summary}`).join("\n")}

Write exactly 5 posts, one per visual_format, each using a DIFFERENT headline:
- news_split: hot take. Hook names the headline; body gives the book's counter-intuitive verdict.
- carousel: 3-5 numbered steps from a book framework applied to the headline (one step per line, "1. ...").
- comparison: "Old way" vs "Book way" lines (format: "Old way: ..." / "Book way: ..." 3 pairs).
- quote_card: one sharp authority line from the book's thesis, tied to the moment.
- cheat_sheet: 4-6 checklist lines ("- ...") readers can save.
Bridge formula to follow: "While the headlines are reacting to X, [book principle] shows why Y. Here is how to navigate it."
Body 60-160 words. Hook max 12 words. CTA max 8 words, pointing to the book.
Return JSON only: {"posts":[{"visual_format":"news_split","headline_index":0,"hook":"","body":"","cta":"","book_anchor":"name of principle/framework used"}]}`;

  const resp = await fetchAiGateway({
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.2",
      messages: [{ role: "system", content: "You are ABBY for Authors Bureau. Respond with valid JSON only." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 6000,
    }),
  }, "topical-social-engine");
  if (!resp.ok) {
    const err: any = new Error(`AI ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const raw = (data.choices?.[0]?.message?.content || "").replace(/```json|```/g, "");
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");
  const posts = (parsed.posts || []).filter((p) => FORMATS[p.visual_format] && items[p.headline_index]);
  if (!posts.length) return { book_id: bookId, skipped: "ai_empty" };

  const bookUrl = profile.slug && ctxB.book?.slug ? `${SITE}/${profile.slug}/${ctxB.book.slug}` : null;
  const monday = new Date(wk + "T01:00:00Z"); // 09:00 Singapore
  const rows = posts.slice(0, 5).map((p, i) => {
    const n = items[p.headline_index];
    const when = new Date(monday.getTime() + i * 86400_000);
    const content = [p.hook, "", p.body, "", p.cta, bookUrl, "", `Source: ${n.source}, "${n.title}"`].filter((x) => x !== null).join("\n").replace(/\s*[—–]\s*/g, ", ");
    return {
      author_id: authorId, book_id: bookId, week_key: wk, post_index: i,
      platform: PLATFORM_FOR[p.visual_format], archetype: FORMATS[p.visual_format], visual_format: p.visual_format,
      hook: p.hook, content, cta: p.cta, book_anchor: p.book_anchor,
      news_title: n.title, news_url: n.link, news_source: n.source, suggested_at: when.toISOString(),
    };
  });
  const { error } = await sb.from("topical_social_drafts").upsert(rows, { onConflict: "author_id,book_id,week_key,post_index", ignoreDuplicates: true });
  if (error) throw error;
  if (profile.user_id) {
    await sb.from("notifications").insert({
      user_id: profile.user_id,
      title: `${rows.length} topical posts ready: ${ctxB.bookTitle}`,
      message: `ABBY matched this week's ${niche} news to your book. Review and schedule them in Marketing Hub, Social Calendar.`,
      link: `/dashboard?section=marketing-hub&tab=social&bookId=${bookId}`,
    });
  }
  return { book_id: bookId, created: rows.length, niche };
}

async function approve(sb, drafts) {
  let n = 0;
  for (const d of drafts) {
    if (d.status !== "pending") continue;
    const { data: post, error } = await sb.from("social_posts").insert({
      author_id: d.author_id, book_id: d.book_id, node_id: "BP-03", platform: d.platform,
      content: d.content, scheduled_at: d.suggested_at && Date.parse(d.suggested_at) > Date.now() ? d.suggested_at : new Date(Date.now() + 3600_000).toISOString(),
      status: "ready", archetype: d.archetype, post_type: `topical_${d.visual_format}`,
    }).select("id").single();
    if (error) throw error;
    await sb.from("topical_social_drafts").update({ status: "approved", social_post_id: post.id, updated_at: new Date().toISOString() }).eq("id", d.id);
    n++;
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = makeServiceClient();
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  // ── Weekly batch ─────────────────────────────────────────────
  if (body.mode === "cron") {
    const { data: st } = await sb.from("topical_engine_state").select("*").eq("id", "weekly").single();
    if (st?.paused_reason) return json({ success: true, status: "paused", message: st.paused_reason });
    const now = new Date();
    const { data: locked } = await sb.from("topical_engine_state")
      .update({ lock_until: new Date(now.getTime() + 15 * 60_000).toISOString() })
      .eq("id", "weekly").or(`lock_until.is.null,lock_until.lt.${now.toISOString()}`).select("id");
    if (!locked?.length) return json({ success: true, status: "locked", message: "Another run is in progress" });

    const wk = weekKey();
    const results: any[] = [];
    try {
      const { data: nodes } = await sb.from("author_nodes").select("author_id, book_id")
        .eq("node_id", "BP-03").in("status", ["live", "content_ready"]).not("book_id", "is", null);
      const { data: done } = await sb.from("topical_social_drafts").select("author_id, book_id").eq("week_key", wk);
      const doneSet = new Set((done || []).map((d) => `${d.author_id}:${d.book_id}`));
      const todo = (nodes || []).filter((n) => !doneSet.has(`${n.author_id}:${n.book_id}`)).slice(0, BATCH);
      for (const n of todo) {
        try { results.push(await generateForBook(sb, n.author_id, n.book_id, wk)); }
        catch (e) {
          if (e.status === 402 || e.status === 403) {
            await sb.from("topical_engine_state").update({ paused_reason: `AI credits/policy blocked (${e.status}). Resume by clearing paused_reason.` }).eq("id", "weekly");
            results.push({ book_id: n.book_id, error: `paused_${e.status}` });
            break;
          }
          results.push({ book_id: n.book_id, error: String(e.message || e) });
          if (e.status === 429) break;
        }
      }
    } finally {
      await sb.from("topical_engine_state").update({ lock_until: null, last_run_at: new Date().toISOString(), last_result: results }).eq("id", "weekly");
    }
    return json({ success: true, status: "ok", message: `Processed ${results.length} books`, results });
  }

  // ── Author actions ───────────────────────────────────────────
  const user = await resolveUser(req.headers.get("Authorization"));
  if (!user.id) return json({ success: false, status: "unauthorized", message: "Please sign in again." }, 401);
  const { data: profiles } = await sb.from("author_profiles").select("id").eq("user_id", user.id);
  const owned = new Set((profiles || []).map((p) => p.id));
  if (!owned.size) return json({ success: false, status: "forbidden", message: "No author profile." }, 403);

  try {
    if (body.action === "generate") {
      if (typeof body.book_id !== "string") return json({ success: false, status: "bad_request", message: "book_id required" }, 400);
      const { data: node } = await sb.from("author_nodes").select("author_id").eq("node_id", "BP-03").eq("book_id", body.book_id).in("author_id", [...owned]).limit(1);
      if (!node?.length) return json({ success: false, status: "not_ready", message: "Build Social Media (BP-03) for this book first." });
      const wk = weekKey();
      await sb.from("topical_social_drafts").delete().eq("author_id", node[0].author_id).eq("book_id", body.book_id).eq("week_key", wk).eq("status", "pending");
      const r = await generateForBook(sb, node[0].author_id, body.book_id, wk);
      return json({ success: !r.skipped, status: r.skipped || "ok", message: r.skipped ? `Could not generate: ${r.skipped}` : `${r.created} topical posts ready`, result: r });
    }
    if (body.action === "approve" || body.action === "dismiss" || body.action === "approve_all") {
      let q = sb.from("topical_social_drafts").select("*").in("author_id", [...owned]).eq("status", "pending");
      if (body.action === "approve_all") {
        if (typeof body.book_id !== "string") return json({ success: false, status: "bad_request", message: "book_id required" }, 400);
        q = q.eq("book_id", body.book_id);
      } else {
        if (!Array.isArray(body.ids) || !body.ids.length) return json({ success: false, status: "bad_request", message: "ids required" }, 400);
        q = q.in("id", body.ids.slice(0, 50));
      }
      const { data: drafts } = await q;
      if (body.action === "dismiss") {
        await sb.from("topical_social_drafts").update({ status: "dismissed" }).in("id", (drafts || []).map((d) => d.id));
        return json({ success: true, status: "ok", message: "Dismissed" });
      }
      const n = await approve(sb, drafts || []);
      return json({ success: true, status: "ok", message: `${n} posts scheduled`, scheduled: n });
    }
    return json({ success: false, status: "bad_request", message: "Unknown action" }, 400);
  } catch (e) {
    const s = e.status === 402 ? "AI credits are used up. Please top up and try again." : String(e.message || e);
    return json({ success: false, status: "error", message: s }, 200);
  }
});
