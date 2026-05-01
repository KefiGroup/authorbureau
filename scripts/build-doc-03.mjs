#!/usr/bin/env node
// Build docs/03-abby-node-activation-prompts.md from all
// supabase/functions/generate-<slug>/index.ts edge functions.
// Captures inline messages[{role, content: `...`}] template literals
// (the pattern used by 25 of 29 generators), in addition to top-level
// const/let/var template literals.
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FN_DIR = path.join(ROOT, "supabase/functions");
const OUT = path.join(ROOT, "docs/03-abby-node-activation-prompts.md");

// Canonical labels — single source of truth from builderNodeConfig.ts
const NODE_LABELS = {
  "BP-00": "Initial Analysis",
  "BP-01": "Email Marketing",
  "BP-02": "Lead Magnet",
  "BP-03": "Social Media",
  "BP-04": "Author Website",
  "BP-05": "Webinar / Live Event",
  "BP-06": "Online Course",
  "BP-07": "Home Study Course",
  "BP-08": "Special Editions",
  "BP-09": "Speaking Decks",
  "BA-10": "Online Course (Build)",
  "BA-11": "Audiobook",
  "BA-12": "Membership",
  "BA-13": "Group Coaching",
  "BA-14": "Podcast",
  "BA-15": "Media & PR",
  "BA-16": "Affiliate Program",
  "BA-17": "Bundles",
  "BA-18": "JV Partnerships",
  "YR-19": "1:1 Coaching",
  "YR-20": "Big-Ticket Offer",
  "YR-21": "Paid Speaking",
  "YR-22": "Corporate Training",
  "YR-23": "Mastermind",
  "YR-24": "Retreats",
  "YR-25": "Certification",
  "YR-26": "Conference",
  "YR-27": "Fundraising",
  "YR-28": "Sponsors",
};

const SLUG_TO_NODE = {
  "generate-bp00-analysis": "BP-00",
  "generate-bp01-email-marketing": "BP-01",
  "generate-bp02-lead-magnets": "BP-02",
  "generate-bp02-social-pack": "BP-02-SocialPack",
  "generate-bp03-social-media": "BP-03",
  "generate-bp04-website": "BP-04",
  "generate-bp05-webinars": "BP-05",
  "generate-bp06-online-course": "BP-06",
  "generate-bp07-coaching": "BP-07",
  "generate-bp08-mastermind": "BP-08",
  "generate-bp09-speaking": "BP-09",
  "generate-ba10-online-course": "BA-10",
  "generate-ba11-audiobook": "BA-11",
  "generate-ba12-membership": "BA-12",
  "generate-ba13-group-coaching": "BA-13",
  "generate-ba14-podcast": "BA-14",
  "generate-ba15-media-pr": "BA-15",
  "generate-ba16-affiliate": "BA-16",
  "generate-ba17-upsells": "BA-17",
  "generate-ba18-jv-partnerships": "BA-18",
  "generate-yr19-coaching": "YR-19",
  "generate-yr20-big-ticket": "YR-20",
  "generate-yr21-speaking": "YR-21",
  "generate-yr22-corporate": "YR-22",
  "generate-yr23-mastermind": "YR-23",
  "generate-yr24-retreats": "YR-24",
  "generate-yr25-certification": "YR-25",
  "generate-yr26-conference": "YR-26",
  "generate-yr27-fundraising": "YR-27",
  "generate-yr28-sponsors": "YR-28",
};

function extractTopLevelConsts(src) {
  const re = /(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*`([\s\S]*?)`/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, name, body] = m;
    if (body.length > 80 && (/You are |Generate |Create |^# /m.test(body) || /system|prompt/i.test(name))) {
      out.push({ kind: name, body });
    }
  }
  return out;
}

function extractInlineMessages(src) {
  // Matches: { role: "system" | "user", content: `...` }
  // Tolerates whitespace & either single/double quotes around the role value.
  const re = /\{\s*role\s*:\s*["'](system|user)["']\s*,\s*content\s*:\s*`([\s\S]*?)`\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, role, body] = m;
    out.push({ kind: role, body });
  }
  return out;
}

function extractModel(src) {
  const m = src.match(/model\s*:\s*["']([^"']+)["']/);
  return m ? m[1] : "unknown";
}

function extractMaxTokens(src) {
  const m = src.match(/max_completion_tokens\s*:\s*([0-9]+)/);
  return m ? m[1] : "default";
}

function dynamicVars(body) {
  const set = new Set();
  const re = /\$\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const expr = m[1].trim().split(/[\s.?]/)[0];
    if (expr) set.add(expr);
  }
  return Array.from(set);
}

function fence(body) {
  // markdown ```text fences; if body contains ```, escape via ~~~ fences.
  const useTilde = body.includes("```");
  const f = useTilde ? "~~~text" : "```text";
  const e = useTilde ? "~~~" : "```";
  return `${f}\n${body}\n${e}`;
}

async function buildSection(slug, nodeId) {
  const fnPath = path.join(FN_DIR, slug, "index.ts");
  let src;
  try {
    src = await fs.readFile(fnPath, "utf8");
  } catch {
    return `## ${nodeId} · ${NODE_LABELS[nodeId.replace(/-SocialPack$/, "")] ?? nodeId}\n\n_Edge function not yet built._\n\n---\n`;
  }

  const label =
    nodeId === "BP-02-SocialPack"
      ? "Lead Magnet — Social Pack (companion to BP-02)"
      : NODE_LABELS[nodeId] ?? nodeId;
  const headerNode = nodeId === "BP-02-SocialPack" ? "BP-02 (Social Pack)" : nodeId;

  const model = extractModel(src);
  const maxTokens = extractMaxTokens(src);

  // Prefer inline messages capture — that's what generators actually send.
  let blocks = extractInlineMessages(src);
  // If no inline blocks (legacy generators using top-level consts), fall back.
  if (blocks.length === 0) blocks = extractTopLevelConsts(src);

  const allVars = new Set();
  blocks.forEach((b) => dynamicVars(b.body).forEach((v) => allVars.add(v)));

  let md = `## ${headerNode} · ${label}\n\n`;
  md += `- **Edge function**: \`supabase/functions/${slug}/index.ts\`\n`;
  md += `- **Model**: \`${model}\`\n`;
  md += `- **Max tokens**: \`${maxTokens}\`\n`;
  md += `- **Prompt blocks extracted**: ${blocks.length}\n`;
  if (allVars.size > 0) {
    md += `- **Dynamic variables**: ${Array.from(allVars).map((v) => `\`${v}\``).join(", ")}\n`;
  }
  md += `\n`;

  if (blocks.length === 0) {
    md += `_Could not auto-extract prompt blocks — see source file for details._\n`;
  } else {
    blocks.forEach((b, i) => {
      const header = b.kind === "system" || b.kind === "user" ? b.kind : b.kind;
      md += `### ${header}${blocks.length > 2 ? ` (block ${i + 1})` : ""}\n\n`;
      md += fence(b.body);
      md += `\n\n`;
    });
  }

  md += `---\n`;
  return md;
}

async function main() {
  const slugs = Object.keys(SLUG_TO_NODE);
  // Order: BP-00, BP-01, BP-02 (+ social pack), BP-03 .. YR-28
  slugs.sort((a, b) => {
    const na = SLUG_TO_NODE[a].replace("-SocialPack", "");
    const nb = SLUG_TO_NODE[b].replace("-SocialPack", "");
    if (na !== nb) return na.localeCompare(nb);
    return a.localeCompare(b);
  });

  let out = `# 03 · ABBY Node Activation Prompts\n\n`;
  out += `_Version 2.0 · ${new Date().toISOString().slice(0, 10)}_\n\n`;
  out += `For every node builder shipped to date, this document records the **exact prompt(s)** the corresponding edge function sends to the Lovable AI Gateway when the author activates that node.\n\n`;
  out += `Prompts are extracted verbatim from each \`supabase/functions/generate-*/index.ts\` file. Both top-level template-literal constants and inline \`messages: [{ role, content: \\\`...\\\` }]\` blocks are captured. Dynamic placeholders such as \`\${authorName}\`, \`\${bookTitle}\`, \`\${ctx.target_audience_persona}\` are preserved exactly as they appear in source.\n\n`;
  out += `**Sprint 2 fix**: v1.0 missed 25 of 29 generators because the build script only matched top-level template-literal consts. v2.0 also captures inline message blocks.\n\n---\n\n`;

  for (const slug of slugs) {
    const nodeId = SLUG_TO_NODE[slug];
    out += await buildSection(slug, nodeId);
    out += `\n`;
  }

  await fs.writeFile(OUT, out);
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
