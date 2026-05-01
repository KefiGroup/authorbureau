#!/usr/bin/env node
/**
 * scripts/build-master-pdf.mjs (Sprint 53.1)
 *
 * Builds /mnt/documents/AB_Master_Documentation.pdf from /docs.
 *
 * Fixes vs prior ad-hoc render:
 *  - Canonical node ordering: BP-01..BP-09, BA-10..BA-18, YR-19..YR-28
 *    (NOT alphabetical — that incorrectly placed BA-10 first)
 *  - Wide tables, long file paths, code blocks word-break instead of clipping
 *  - Versioned + canonical copies emitted
 *
 * Run: node scripts/build-master-pdf.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { resolve, join } from "node:path";

const VERSION = "v3.6";
const DOCS = resolve(process.cwd(), "docs");
const OUT_DIR = "/mnt/documents";
const TMP_DIR = "/tmp/ab-master-pdf";
const HTML = join(TMP_DIR, "master.html");
const PDF_CANON = join(OUT_DIR, "AB_Master_Documentation.pdf");
const PDF_VERSION = join(OUT_DIR, `AB_Master_Documentation_${VERSION}.pdf`);

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const NODE_IDS = [
  ...Array.from({ length: 9 }, (_, i) => `BP-0${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `BA-${10 + i}`),
  ...Array.from({ length: 10 }, (_, i) => `YR-${19 + i}`),
];

const FOUNDATIONAL = [
  "README.md",
  "01-architecture/01-master-architecture-reference.md",
  "01-architecture/02-database-schema-current.md",
  "01-architecture/03-engine-architecture-map.md",
  "01-architecture/04-node-connector-map.md",
  "01-architecture/05-technology-stack-current.md",
  "02-business-rules/01-count-business-rules-v2.md",
  "02-business-rules/02-node-readiness-gates-full-spec.md",
  "02-business-rules/03-product-lifecycle-rules.md",
  "02-business-rules/04-stripe-connection-rules.md",
  "02-business-rules/05-author-vs-book-level-registry.md",
  "03-abby-ai/01-master-prompt-architecture.md",
  "03-abby-ai/02-system-prompt-current.md",
  "03-abby-ai/03-node-activation-prompts.md",
  "03-abby-ai/04-content-generation-prompts.md",
  "03-abby-ai/05-crm-intelligence-prompts.md",
  "03-abby-ai/06-abby-score-algorithm.md",
  "03-abby-ai/07-autonomous-actions-registry.md",
  "04-node-frameworks/README.md",
];

const NODE_DOCS = NODE_IDS.map((id) => `04-node-frameworks/${id}.md`);

const TRAILING = [
  "05-sprint-records/01-sprint-log-master.md",
  "05-sprint-records/02-sprint-prompt-archive.md",
  "05-sprint-records/03-bug-registry.md",
  "05-sprint-records/04-decision-log.md",
  "06-user-experience/01-design-rules.md",
  "06-user-experience/02-author-journey-map.md",
  "06-user-experience/03-reader-journey-map.md",
  "06-user-experience/04-test-account-credentials.md",
];

const EXTRA_CANDIDATES = [
  "05-sprint-records/05-integrity-audit-2026-05-01.md",
  "06-be-suckcessful-test.md",
];
const EXTRA = EXTRA_CANDIDATES.filter((p) => existsSync(join(DOCS, p)));

const ORDER = [...FOUNDATIONAL, ...NODE_DOCS, ...TRAILING, ...EXTRA];

const onDisk = new Set();
function walk(dir, prefix = "") {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(p, rel);
    else if (entry.name.endsWith(".md")) onDisk.add(rel);
  }
}
walk(DOCS);
const missingFromOrder = [...onDisk].filter((p) => !ORDER.includes(p));
if (missingFromOrder.length) {
  console.warn("⚠️  Docs on disk but not in canonical order (will be appended):");
  missingFromOrder.forEach((p) => console.warn(`   - ${p}`));
  ORDER.push(...missingFromOrder.sort());
}

// NOTE: title uses ASCII hyphen (not em-dash) because the pandoc-default
// header font lacks an em-dash glyph and renders it as ��� in chromium.
// Body text continues to use em-dashes (rendered fine via our CSS font stack).
const banner = `% Authors Bureau - Master Documentation
% Sprint 53.1 · ${VERSION}
% Generated ${new Date().toISOString().slice(0, 10)}

`;
const parts = [banner];
for (const rel of ORDER) {
  const abs = join(DOCS, rel);
  if (!existsSync(abs)) { console.warn(`   skipped (missing): ${rel}`); continue; }
  parts.push(`\n\n<div class="doc-break"></div>\n\n`);
  parts.push(`<!-- source: docs/${rel} -->\n\n`);
  parts.push(readFileSync(abs, "utf8"));
  parts.push("\n\n");
}
const combinedMd = join(TMP_DIR, "combined.md");
writeFileSync(combinedMd, parts.join(""));

const css = `
  @page { size: A4; margin: 18mm 16mm 22mm 16mm; }
  html { font-size: 11pt; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #0f172a; line-height: 1.45; max-width: 100%;
  }
  h1, h2, h3, h4, h1.title { color: #0f172a; page-break-after: avoid;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
  h1 { font-size: 22pt; margin-top: 0; }
  h1.title { font-size: 26pt; text-align: center; margin: 2em 0 1em; }
  h2 { font-size: 16pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 1.6em; }
  h3 { font-size: 13pt; margin-top: 1.4em; }
  h4 { font-size: 11.5pt; margin-top: 1.2em; }
  p, li { word-break: break-word; overflow-wrap: anywhere; }
  ul, ol { padding-left: 1.25em; }
  code, pre, pre code, kbd, samp {
    font-family: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 9.5pt;
  }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px;
    word-break: break-all; overflow-wrap: anywhere; white-space: pre-wrap; }
  pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;
    padding: 10px 12px; white-space: pre-wrap !important;
    word-break: break-word; overflow-wrap: anywhere; page-break-inside: avoid; }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed;
    margin: 1em 0; page-break-inside: auto; font-size: 9.5pt; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top;
    text-align: left; word-break: break-word; overflow-wrap: anywhere; }
  /* Long single-row "index" lists rendered as tables get the most room */
  th { background: #f1f5f9; font-weight: 600; }
  a { color: #0d9488; text-decoration: none; word-break: break-all; overflow-wrap: anywhere; }
  blockquote { border-left: 3px solid #0d9488; background: #f0fdfa;
    margin: 1em 0; padding: 8px 14px; color: #134e4a; page-break-inside: avoid; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 2em 0; }
  .doc-break { page-break-before: always; }
  img { max-width: 100%; height: auto; }
`;

const pandoc = spawnSync("pandoc", [
  combinedMd,
  "-f", "gfm+yaml_metadata_block+pipe_tables",
  "-t", "html5", "--standalone",
  "--metadata", "title=Authors Bureau — Master Documentation",
  "--toc", "--toc-depth=1",
  "-o", HTML,
], { stdio: "inherit" });
if (pandoc.status !== 0) { console.error("pandoc failed"); process.exit(1); }

let html = readFileSync(HTML, "utf8");
if (!html.includes('charset="utf-8"') && !html.includes("charset=utf-8")) {
  html = html.replace("<head>", '<head>\n<meta charset="utf-8">');
}
html = html.replace("</head>", `<style>${css}</style></head>`);
writeFileSync(HTML, html);

const chromium = spawnSync("chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--print-to-pdf=${PDF_CANON}`,
  "--no-pdf-header-footer",
  "--virtual-time-budget=10000",
  `file://${HTML}`,
], { stdio: "inherit" });
if (chromium.status !== 0) { console.error("chromium failed"); process.exit(1); }

copyFileSync(PDF_CANON, PDF_VERSION);
console.log(`\n✓ Wrote ${PDF_CANON}`);
console.log(`✓ Wrote ${PDF_VERSION}`);
console.log(`  Sections in order: ${ORDER.length}`);
