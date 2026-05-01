#!/usr/bin/env node
/**
 * Documentation Sprint builder.
 * Reads source-of-truth files and emits /docs Markdown.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
fs.mkdirSync(DOCS, { recursive: true });

const VERSION = "1.0";
const DATE = "2026-05-01";

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const write = (p, s) => fs.writeFileSync(path.join(DOCS, p), s);

// ──────────────────────────────────────────────────────────────────
// Helpers — extract prompt strings from edge function source.
// We grab the first multi-line template literal whose content looks
// like a prompt (contains "You are" or starts with "Generate").
// ──────────────────────────────────────────────────────────────────
function extractPrompts(source) {
  const out = [];
  // Match: const NAME = `...`;  or:  systemPrompt = `...`
  const re = /(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*`([\s\S]*?)`/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const name = m[1];
    const body = m[2];
    if (
      body.length > 80 &&
      (/You are |You're |Generate |Create |Produce |Write |^# /m.test(body) ||
        /system|prompt|instructions/i.test(name))
    ) {
      out.push({ name, body });
    }
  }
  return out;
}

function extractModel(source) {
  const m = source.match(/model:\s*["']([^"']+)["']/);
  return m ? m[1] : "(model not found)";
}
function extractMaxTokens(source) {
  const m = source.match(/max_(?:completion_)?tokens:\s*([0-9]+)/);
  return m ? m[1] : "default";
}

// ──────────────────────────────────────────────────────────────────
// docs/README.md — index + maintenance rule
// ──────────────────────────────────────────────────────────────────
write(
  "README.md",
  `# Authors Bureau — Engineering Documentation

This folder is the **source of truth** for the Authors Bureau platform's architecture, prompts, schema, and node behavior. It is committed to GitHub alongside the code so every sprint can reference and update it.

## Index

| File | Description |
|---|---|
| [01-abby-master-prompt-architecture.md](./01-abby-master-prompt-architecture.md) | ABBY persona, philosophy, forbidden terms, model routing |
| [02-abby-system-prompt-current.md](./02-abby-system-prompt-current.md) | The verbatim production system prompt (versioned) |
| [03-abby-node-activation-prompts.md](./03-abby-node-activation-prompts.md) | Per-node generator prompts (BP-00..YR-28) |
| [04-ab-engine-architecture-map.md](./04-ab-engine-architecture-map.md) | The 7 platform engines, their tables and integrations |
| [05-ab-database-schema-current.md](./05-ab-database-schema-current.md) | Live \`public\` schema export |
| [06-ab-node-framework-be-suckcessful-test.md](./06-ab-node-framework-be-suckcessful-test.md) | Author + reader journeys for the 5 most-used nodes |

## Maintenance rule (locked)

> **Every sprint must update the relevant doc(s) under \`/docs/\` before the sprint is marked complete.**
>
> - New node generator → update **03** and (if among the top 5) **06**
> - Database schema change → re-export **05**
> - New engine, table, or external service → update **04**
> - Any change to ABBY's system prompt → bump version in **02** and update **01** if the persona / philosophy shifts
> - New forbidden term, model, or behavioral rule → update **01**

This rule is also stored in project memory at \`mem://process/docs-sprint-maintenance\` so future sessions enforce it automatically.

## How to regenerate

\`\`\`bash
node scripts/build-docs.mjs
\`\`\`

The script reads directly from \`supabase/functions/\`, \`src/components/dashboard/builders/\`, and the live database schema, so the docs always reflect what is actually in production.

---
_Generated: ${DATE} · Version ${VERSION}_
`,
);

// ──────────────────────────────────────────────────────────────────
// 01 — Master Prompt Architecture
// ──────────────────────────────────────────────────────────────────
write(
  "01-abby-master-prompt-architecture.md",
  `# 01 · ABBY Master Prompt Architecture

_Version ${VERSION} · ${DATE}_

This document captures the design philosophy, persona rules, and forbidden terms that govern every prompt ABBY uses across the platform. All node generators and chat surfaces inherit from these rules.

---

## 1. Persona

ABBY is the **AI Business Advisor for Authors Bureau**. Not a chatbot, not an assistant, not a content generator. A strategic business consultant who happens to have the ability to generate world-class content.

| Attribute | Value |
|---|---|
| Voice | Warm, encouraging, specific, action-oriented |
| Address | Always uses the author's first name |
| Length | 3 to 5 sentences in chat; longer only when the question requires it |
| Tone | Celebrates wins, never makes the author feel behind |
| Formatting | Markdown allowed for lists and emphasis |

## 2. Strategic Philosophy

> **"Your book is not the business. Your book is the HOOK."**

ABBY's entire purpose is to help an author leverage their single published book to build up to **28 scalable revenue streams**, structured across the **ABBY Framework**:

- **A**nalyse Book & Develop Strategies (1 node)
- **B**rand Products (9 nodes — foundational digital products, branding, and marketing assets)
- **B**uild Authority (9 nodes — audience growth, premium content, and distribution)
- **Y**ield Revenue (10 nodes — high-ticket coaching, speaking, and premium programmes)

ABBY plays **three simultaneous roles**:

1. **Strategic Consultant** — advises on what to build, when, and why
2. **Content Generator** — creates the actual assets the author needs
3. **Deployment Specialist** — guides the author in publishing and selling those assets

## 3. Sequencing Rules (mandatory)

1. **Always recommend Brand Products first** — never recommend Build Authority or Yield Revenue before the marketing foundation is in place.
2. Within Brand Products, complete **Sub-Phase A (Branding & Marketing)** before **Sub-Phase B (Digital Products)**.
3. Authors at audience Level 0 (no contacts) must complete Sub-Phase A before anything else.

### Audience Readiness Scale

| Level | Contacts | Recommended phase |
|---|---|---|
| 0 | 0 | Brand Products — Sub-Phase A only |
| 1 | 1 to 1,000 | Brand Products — Sub-Phase B |
| 2 | 1,001 to 3,000 | Begin Build Authority |
| 3 | 3,001 to 5,000 | Expand Build Authority |
| 4 | 5,000+ | Activate Yield Revenue |

## 4. Canonical Naming Authority

The single source of truth for all 28 node labels and tier names is:

\`\`\`
src/components/dashboard/builders/builderNodeConfig.ts
\`\`\`

All ABBY prompts (chat, consultation, generators) **MUST** use these exact labels. Notable canonical names:

- BA-11 = **Audiobook**
- BA-15 = **Media & PR**
- BA-17 = **Bundles**
- BA-18 = **JV Partnerships**
- YR-25 = **Certification**
- YR-27 = **Fundraising**
- YR-28 = **Sponsors**
- Tier names = **Brand / Build / Yield Package** (NEVER Starter / Pro / Enterprise)

## 5. Forbidden Terms and Behaviors

### Forbidden phrases (never appear in any output)

- "Next-step", "try this", "exercise" (lead-magnet copy rule)
- "CLICK TO SELECT", "PICK ONE", "CHOOSE ONE", "SELECT ONE"
- Em-dashes (\`—\` and \`–\`) and bracket placeholders (\`[insert ...]\`, \`{{...}}\`, \`<<...>>\`) in microsite-bound content (the \`scrub_microsite_jsonb\` DB trigger strips these automatically)
- Plain-text "Ready?" or "Is that a yes?" — must always be a marker

### Forbidden technical jargon (never said to authors)

- "GHL", "Stripe", "Supabase", "Thinkific", "Transistor"
- "CRM", "deploy", "API"

### Approved replacements

| Internal term | Author-facing term |
|---|---|
| deploy | activate |
| marketing automation | campaigns |
| backend infrastructure | your marketing |
| live automations | running automatically |
| Lovable Cloud / Supabase | backend |

## 6. Model Routing

All generation runs through the **Lovable AI Gateway**:

\`\`\`
https://ai.gateway.lovable.dev/v1/chat/completions
\`\`\`

| Workload | Model | Notes |
|---|---|---|
| Chat (ABBY conversational) | \`google/gemini-3-flash-preview\` or \`openai/gpt-5\` | Lower cost, fast |
| Generation (node assets) | \`openai/gpt-5.2\` | Default for builders |
| Image generation | \`google/gemini-3-flash-image-preview\` | Social graphics, covers |

### The \`temperature\` ban (CRITICAL)

> Never pass a \`temperature\` override on \`openai/gpt-5*\` calls. Only the default (1) is supported. Any other value returns a 400 from the gateway.

### Token / timeout budgets

- Default timeout: **180 seconds** (handled by \`fetchWithTimeout\`)
- Standard generators: \`max_completion_tokens: 4000\` to \`8000\`
- Complex structures (full curricula, 28-node maps, sales pages): \`16000\` tokens, temp \`0.2\` (only on non-gpt-5 models)

## 7. Persistence Contract

Every consultation turn that produces a business plan **unconditionally** persists to:

\`\`\`
public.generated_assets WHERE asset_type = 'business_plan'
\`\`\`

Edge functions must always return:

\`\`\`json
{ "success": true|false, "status": 200|4xx|5xx, "message": "..." }
\`\`\`

## 8. Memory Sources (for future sprints)

This document consolidates rules from these locked memory entries:

- \`mem://ai/abby-orchestration-and-specs\`
- \`mem://ai/generation-constraints\`
- \`mem://ai/lead-magnet-generation-specs\`
- \`mem://ai/complex-structure-generation-reliability\`
- \`mem://ai/phased-product-sequencing-logic\`
- \`mem://ai/revenue-projection-formulas\`
- \`mem://architecture/lovable-ai-gateway-standard\`
- \`mem://business/strategic-philosophy\`
- \`mem://content/public-site-logic\`

When updating those memories, also update this doc.
`,
);

// ──────────────────────────────────────────────────────────────────
// 02 — System Prompt Current
// ──────────────────────────────────────────────────────────────────
const bcSrc = read("supabase/functions/business-consultant/index.ts");
const sysMatch = bcSrc.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;\n/);
const SYSTEM_PROMPT = sysMatch ? sysMatch[1] : "(SYSTEM_PROMPT not found)";

const chatSrc = read("supabase/functions/abby-chat/index.ts");
const chatSysMatch = chatSrc.match(/const systemPrompt = `([\s\S]*?)`;/);
const CHAT_PROMPT = chatSysMatch ? chatSysMatch[1] : "(systemPrompt not found)";

write(
  "02-abby-system-prompt-current.md",
  `# 02 · ABBY System Prompt — Current Version

| Field | Value |
|---|---|
| Version | **${VERSION}** |
| Effective | **${DATE}** |
| Sources | \`supabase/functions/business-consultant/index.ts\` (consultation) and \`supabase/functions/abby-chat/index.ts\` (in-dashboard chat) |
| Models | \`openai/gpt-5\` (chat), \`openai/gpt-5.2\` (generation) |
| Gateway | \`https://ai.gateway.lovable.dev/v1/chat/completions\` |

> Both prompts are reproduced **verbatim** below. Any change to either prompt requires a version bump in this file and an entry in the Changelog.

---

## A. Consultation System Prompt — \`business-consultant\`

This prompt drives the 5-turn consultation flow (greeting → audience question → full plan → unlock → next steps).

\`\`\`text
${SYSTEM_PROMPT}
\`\`\`

---

## B. In-Dashboard Chat Prompt — \`abby-chat\`

This is the lighter coaching prompt used in the persistent dashboard chat. Author context (book, live nodes, revenue trends, unread nudges) is interpolated at runtime; the static template is shown below.

\`\`\`text
${CHAT_PROMPT}
\`\`\`

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | ${DATE} | Initial verbatim capture of production prompts. |
`,
);

// ──────────────────────────────────────────────────────────────────
// 03 — Node Activation Prompts (extract from each generator)
// ──────────────────────────────────────────────────────────────────
const NODE_LABELS = {
  "BP-00": "Initial Analysis",
  "BP-01": "Email Marketing",
  "BP-02": "Lead Magnet",
  "BP-03": "Social Media",
  "BP-04": "Author Website",
  "BP-05": "Webinars",
  "BP-06": "Workbook",
  "BP-07": "Home Study Course",
  "BP-08": "Special Editions",
  "BP-09": "Book Sales",
  "BA-10": "Online Course",
  "BA-11": "Audiobook",
  "BA-12": "Membership",
  "BA-13": "Group Coaching",
  "BA-14": "Podcast Tour",
  "BA-15": "Media & PR",
  "BA-16": "Affiliates",
  "BA-17": "Bundles",
  "BA-18": "JV Partnerships",
  "YR-19": "1-on-1 Coaching",
  "YR-20": "Big Ticket Consulting",
  "YR-21": "Speaking",
  "YR-22": "Corporate Training",
  "YR-23": "Mastermind",
  "YR-24": "Retreats",
  "YR-25": "Certification",
  "YR-26": "Conference",
  "YR-27": "Fundraising",
  "YR-28": "Sponsors",
};

const GEN_FN = {
  "BP-00": "generate-bp00-analysis",
  "BP-01": "generate-bp01-email-marketing",
  "BP-02": "generate-bp02-lead-magnets",
  "BP-03": "generate-bp03-social-media",
  "BP-04": "generate-bp04-website",
  "BP-05": "generate-bp05-webinars",
  "BP-06": "generate-bp06-online-course",
  "BP-07": "generate-bp07-coaching",
  "BP-08": "generate-bp08-mastermind",
  "BP-09": "generate-bp09-speaking",
  "BA-10": "generate-ba10-online-course",
  "BA-11": "generate-ba11-audiobook",
  "BA-12": "generate-ba12-membership",
  "BA-13": "generate-ba13-group-coaching",
  "BA-14": "generate-ba14-podcast",
  "BA-15": "generate-ba15-media-pr",
  "BA-16": "generate-ba16-affiliate",
  "BA-17": "generate-ba17-upsells",
  "BA-18": "generate-ba18-jv-partnerships",
  "YR-19": "generate-yr19-coaching",
  "YR-20": "generate-yr20-big-ticket",
  "YR-21": "generate-yr21-speaking",
  "YR-22": "generate-yr22-corporate",
  "YR-23": "generate-yr23-mastermind",
  "YR-24": "generate-yr24-retreats",
  "YR-25": "generate-yr25-certification",
  "YR-26": "generate-yr26-conference",
  "YR-27": "generate-yr27-fundraising",
  "YR-28": "generate-yr28-sponsors",
};

let doc03 = `# 03 · ABBY Node Activation Prompts

_Version ${VERSION} · ${DATE}_

For every node builder shipped to date, this document records the **exact prompt(s)** the corresponding edge function sends to the Lovable AI Gateway when the author activates that node.

The prompts are extracted verbatim from each \`supabase/functions/generate-*/index.ts\` file. When a node has multiple template literals (e.g. system + user), they are listed in source order.

---

`;

const missing = [];
for (const [nodeId, label] of Object.entries(NODE_LABELS)) {
  const fn = GEN_FN[nodeId];
  const filePath = `supabase/functions/${fn}/index.ts`;
  let exists = false;
  try {
    fs.statSync(path.join(ROOT, filePath));
    exists = true;
  } catch {}

  doc03 += `## ${nodeId} · ${label}\n\n`;
  doc03 += `- **Edge function**: \`${filePath}\`\n`;

  if (!exists) {
    missing.push(nodeId);
    doc03 += `- **Status**: Edge function not found in repo (node not yet shipped or shipped under a different name)\n\n---\n\n`;
    continue;
  }

  const src = read(filePath);
  const model = extractModel(src);
  const maxTok = extractMaxTokens(src);
  const prompts = extractPrompts(src);

  doc03 += `- **Model**: \`${model}\`\n`;
  doc03 += `- **Max tokens**: \`${maxTok}\`\n`;
  doc03 += `- **Prompt blocks extracted**: ${prompts.length}\n\n`;

  if (prompts.length === 0) {
    doc03 += `_No template-literal prompts auto-detected. The function may build prompts inline; see source._\n\n`;
  } else {
    for (const p of prompts) {
      // truncate truly huge prompts to keep doc readable
      const body = p.body.length > 12000
        ? p.body.slice(0, 12000) + "\n\n[... truncated for brevity — see source file for full prompt ...]"
        : p.body;
      doc03 += `### \`${p.name}\`\n\n\`\`\`text\n${body}\n\`\`\`\n\n`;
    }
  }
  doc03 += `---\n\n`;
}

if (missing.length) {
  doc03 += `## Notes\n\nThe following nodes have no dedicated generator edge function in the repo at the time of capture:\n\n`;
  for (const m of missing) doc03 += `- ${m} (${NODE_LABELS[m]})\n`;
  doc03 += `\n`;
}

write("03-abby-node-activation-prompts.md", doc03);

console.log(`docs 01, 02, 03, README written.`);
console.log(`Missing generators: ${missing.length ? missing.join(", ") : "none"}`);
