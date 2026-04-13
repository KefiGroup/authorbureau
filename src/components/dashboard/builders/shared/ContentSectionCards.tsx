import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Pencil, Check, BookOpen, FileText, MessageCircle, Gift, Sparkles, ListChecks, PenLine } from "lucide-react";

interface ContentSection {
  title: string;
  body: string;
  icon: React.ReactNode;
}

/** Guess an icon based on section title keywords */
function iconForTitle(title: string): React.ReactNode {
  const t = title.toLowerCase();
  if (t.includes("foreword") || t.includes("letter")) return <BookOpen className="h-5 w-5" />;
  if (t.includes("prompt") || t.includes("reflection")) return <MessageCircle className="h-5 w-5" />;
  if (t.includes("chapter") || t.includes("exclusive")) return <FileText className="h-5 w-5" />;
  if (t.includes("gift") || t.includes("inscription")) return <Gift className="h-5 w-5" />;
  if (t.includes("companion") || t.includes("resource") || t.includes("guide")) return <ListChecks className="h-5 w-5" />;
  if (t.includes("identity") || t.includes("edition")) return <Sparkles className="h-5 w-5" />;
  if (t.includes("workbook") || t.includes("exercise") || t.includes("worksheet")) return <PenLine className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

/**
 * Detect if a line is a MAJOR section header (not a sub-item like "Prompt:").
 * Major headers are: numbered sections like "1) TITLE" or ALL-CAPS lines
 * that are short and don't start with "Prompt:" or similar sub-item prefixes.
 */
function isMajorSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Normalize markdown/numbering before classifying header vs sub-item
  const normalized = trimmed
    .replace(/^#{1,4}\s+/, "")
    .replace(/^\d+[\.)]\s+/, "")
    .replace(/\*\*/g, "")
    .trim();

  if (!normalized) return false;

  // Exclude sub-item prefixes — these are NEVER major headers
  if (/^Prompt/i.test(normalized)) return false;
  if (/^(Source|Why it matters|Note|Tip|Hint|Answer|Option|Step\s+\d)/i.test(normalized)) return false;
  // "To: Mum", "To: Mummy" etc. are inscription examples, not headers
  if (/^To:/i.test(normalized)) return false;
  // "Dear Mum, ..." are gift-journal prompt stems, not section headers
  if (/^Dear\s/i.test(normalized)) return false;
  // "Day 1 —", "Day 2 —" etc. are sub-items within companion resources
  if (/^Day\s+\d/i.test(normalized)) return false;
  // Companion micro-steps are sub-items, not top-level cards
  if (/^(Warm start|Story share|Bridge question|Keepsake line|Close|Tiny add-on)/i.test(normalized)) return false;
  // Edition identity sub-fields are not section headers
  if (/^(Title|Subtitle|Tagline)\s*:/i.test(normalized)) return false;

  // Numbered section: "1) EDITION IDENTITY" or "2) THEMED FOREWORD..."
  if (/^\d+\)\s+[A-Z]/.test(trimmed)) return true;

  // ALL-CAPS header line (at least 2 words, not a sub-item)
  if (/^[A-Z][A-Z\s\-&/(),:]+$/.test(normalized) && normalized.length > 4 && normalized.length < 120) {
    return true;
  }

  // ALL-CAPS with em-dash description: "REFLECTION PROMPTS (10) — Mother's Day Themed"
  if (/^[A-Z][A-Z\s\-&/()0-9]+\s*[—–-]\s*.+/.test(normalized) && /^[A-Z]/.test(normalized)) {
    const capsPartMatch = normalized.match(/^([A-Z][A-Z\s\-&/()0-9]+)/);
    if (capsPartMatch && capsPartMatch[1].length >= 5) return true;
  }

  return false;
}

function isSpecialEditionPrimaryTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    (t.includes("edition") && t.includes("identity")) ||
    t.includes("themed foreword") ||
    (t.includes("foreword") && t.includes("letter")) ||
    t.includes("gift journal") ||
    t.includes("journal prompts") ||
    (t.includes("exclusive") && t.includes("chapter")) ||
    (t.includes("bonus") && t.includes("chapter")) ||
    t.includes("inscription") ||
    (t.includes("companion") && t.includes("resource"))
  );
}

function collapseSpecialEditionSections(rawSections: ContentSection[], content: string): ContentSection[] {
  if (rawSections.length <= 6) return rawSections;

  const lower = content.toLowerCase();
  const hasSpecialEditionSignature =
    lower.includes("gift journal") &&
    lower.includes("companion resource") &&
    (lower.includes("edition identity") || lower.includes("foreword"));

  if (!hasSpecialEditionSignature) return rawSections;

  const collapsed: ContentSection[] = [];
  for (const sec of rawSections) {
    if (isSpecialEditionPrimaryTitle(sec.title)) {
      collapsed.push({ ...sec });
      continue;
    }

    if (collapsed.length === 0) {
      collapsed.push({ ...sec });
      continue;
    }

    const parent = collapsed[collapsed.length - 1];
    const extra = [sec.title, sec.body].filter(Boolean).join("\n");
    parent.body = [parent.body, extra].filter(Boolean).join("\n\n");
  }

  return collapsed;
}

/** Parse content into major themed sections */
function parseContentSections(content: string): ContentSection[] {
  const lines = content.split("\n");
  const sectionStarts: { index: number; title: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (isMajorSectionHeader(lines[i])) {
      let title = lines[i].trim();
      // Clean up: remove numbering prefix like "1) " or "1. "
      title = title.replace(/^\d+[\.)]\s+/, "");
      // Remove ** markdown bold
      title = title.replace(/\*\*/g, "");
      sectionStarts.push({ index: i, title });
    }
  }

  // If we found fewer than 2 sections, try markdown heading pattern (## or ###)
  if (sectionStarts.length < 2) {
    sectionStarts.length = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^#{1,4}\s+(.+)/);
      if (match) {
        const headingText = match[1].replace(/\*\*/g, "").trim();
        const normalizedHeading = headingText.replace(/^\d+[\.)]\s+/, "").trim();

        // Skip sub-items even as markdown headings
        if (/^Prompt/i.test(normalizedHeading)) continue;
        if (/^(Source|Why it matters)/i.test(normalizedHeading)) continue;
        if (/^To:/i.test(normalizedHeading)) continue;
        if (/^Dear\s/i.test(normalizedHeading)) continue;
        if (/^Day\s+\d/i.test(normalizedHeading)) continue;
        if (/^(Warm start|Story share|Bridge question|Keepsake line|Close|Tiny add-on)/i.test(normalizedHeading)) continue;

        sectionStarts.push({ index: i, title: normalizedHeading });
      }
    }
  }

  if (sectionStarts.length < 2) {
    return [{ title: "Content", body: content.trim(), icon: <FileText className="h-5 w-5" /> }];
  }

  const rawSections: ContentSection[] = [];
  for (let i = 0; i < sectionStarts.length; i++) {
    const startLine = sectionStarts[i].index + 1;
    const endLine = i + 1 < sectionStarts.length ? sectionStarts[i + 1].index : lines.length;
    const body = lines.slice(startLine, endLine).join("\n").trim();
    const title = sectionStarts[i].title;
    rawSections.push({ title, body, icon: iconForTitle(title) });
  }

  const normalizedSections = collapseSpecialEditionSections(rawSections, content);

  // Merge sub-item sections (Prompt:, Source:, etc.) back into their parent
  const sections: ContentSection[] = [];
  for (const sec of normalizedSections) {
    if (/^Prompt/i.test(sec.title) || /^(Source|Why it matters)/i.test(sec.title) || /^To:/i.test(sec.title)) {
      if (sections.length > 0) {
        const parent = sections[sections.length - 1];
        parent.body = parent.body + "\n\n" + sec.title + "\n" + sec.body;
      } else {
        sections.push(sec);
      }
    } else {
      sections.push(sec);
    }
  }

  // Merge consecutive headline sections into a single "HEADLINE OPTIONS" card
  const mergedSections: ContentSection[] = [];
  let headlineBuffer: ContentSection[] = [];

  const flushHeadlines = () => {
    if (headlineBuffer.length <= 1) {
      mergedSections.push(...headlineBuffer);
    } else {
      // Merge multiple headline sections into one with "Option N:" format
      const mergedBody = headlineBuffer
        .map((h, i) => {
          let label = h.title.replace(/headline/i, "").replace(/[:\-—–]/g, "").trim();
          if (!label || label.length < 3) label = h.title.trim();
          return `Option ${i + 1} (${label || `Variant ${i + 1}`}):\n${h.body}`;
        })
        .join("\n\n");
      mergedSections.push({
        title: "HEADLINE OPTIONS",
        body: mergedBody,
        icon: <Sparkles className="h-5 w-5" />,
      });
    }
    headlineBuffer = [];
  };

  const isHeadlineVariant = (title: string): boolean => {
    if (/headline/i.test(title) && !/options/i.test(title)) return true;
    // Short titles that look like quiz/title variants
    if (title.length < 100 && /quiz|finder|compass|assessment|checker|test|starter/i.test(title)) return true;
    return false;
  };

  /** Check if two titles share at least one significant word (3+ chars) */
  const sharesWord = (a: string, b: string): boolean => {
    const wordsA = a.toLowerCase().match(/[a-z]{3,}/g) || [];
    const wordsB = new Set((b.toLowerCase().match(/[a-z]{3,}/g) || []));
    return wordsA.some(w => wordsB.has(w));
  };

  for (const sec of sections) {
    if (isHeadlineVariant(sec.title)) {
      // Only buffer if it shares a word with existing buffer items (or buffer is empty)
      if (headlineBuffer.length === 0 || headlineBuffer.some(h => sharesWord(h.title, sec.title))) {
        headlineBuffer.push(sec);
      } else {
        flushHeadlines();
        headlineBuffer.push(sec);
      }
    } else {
      flushHeadlines();
      mergedSections.push(sec);
    }
  }
  flushHeadlines();

  return mergedSections;
}

/** Check if content appears to be workbook-type (exercises, fill-in, writing spaces) */
function isWorkbookContent(title: string, body: string): boolean {
  const lower = (title + " " + body).toLowerCase();
  return (
    lower.includes("workbook") ||
    lower.includes("exercise") ||
    lower.includes("fill in") ||
    lower.includes("write your") ||
    lower.includes("your answer") ||
    lower.includes("worksheet") ||
    lower.includes("journal")
  );
}

/**
 * Group consecutive non-empty lines into paragraphs.
 * A blank line (or double newline) starts a new paragraph.
 * Single newlines within prose are merged into the same paragraph.
 * Lines that are structurally distinct (bullets, prompts, numbered items) stay separate.
 */
function groupIntoParagraphs(body: string): string[][] {
  const lines = body.split("\n");
  const groups: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Blank line = paragraph break
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      continue;
    }

    // Structural lines always start a new group
    const isStructural =
      /^[-•●]\s/.test(trimmed) ||
      /^\d+[\.\)]\s/.test(trimmed) ||
      /^Prompt\s*[:—–]/i.test(trimmed) ||
      /^(Source\s*(Chapter)?|Why it matters)\s*[:—]/i.test(trimmed) ||
      isInlineHeader(trimmed) ||
      isSubSectionHeader(trimmed);

    if (isStructural) {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      groups.push([trimmed]);
    } else {
      current.push(trimmed);
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** Detect if a line looks like a label/header (e.g. "Cover Concept Brief (publication-ready):") */
function isInlineHeader(line: string): boolean {
  const trimmed = line.trim();
  // Ends with ":" and is short-ish, not a bullet or numbered item
  if (/^[-•●]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) return false;
  if (/^(Prompt|Source|Why it matters)/i.test(trimmed)) return false;
  // Edition identity sub-fields rendered as interactive chooser, not headers
  if (/^(Title|Subtitle|Tagline|Option\s+\d)\s*:/i.test(trimmed)) return false;
  // "Label:" or "Label (detail):" pattern, under 80 chars
  if (/^[A-Z][^.!?]*:\s*$/.test(trimmed) && trimmed.length < 80) return true;
  // "Label (parenthetical):" pattern
  if (/^[A-Z][^:]+\([^)]+\)\s*:\s*$/.test(trimmed) && trimmed.length < 100) return true;
  return false;
}

/**
 * Detect sub-section headers within content cards — these get bold + spacing
 * but are NOT major section breaks. Examples:
 * - "Scoring & Results (Diagnosis Only)"
 * - "Step 1: Identify your Primary Stage"
 * - "S3 Subtotal (0–6): ___"
 * - "S1 — Start by Sucking (visibility, voice, meaning)"
 */
function isSubSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;
  // "Step N: ..." pattern
  if (/^Step\s+\d+\s*[:—–]\s*.+/i.test(trimmed)) return true;
  // "SN — ..." or "S1 (Start by Sucking):" stage headers
  if (/^S\d+\s*[—–(:]/.test(trimmed)) return true;
  // "SN Subtotal" pattern
  if (/^S\d+\s+Subtotal/i.test(trimmed)) return true;
  // "Scoring & Results" or similar standalone section labels
  if (/^(Scoring|Results|Instructions|Directions|How (to|it) (Score|Works?))/i.test(trimmed) && trimmed.length < 80) return true;
  // "Section Name (parenthetical)" — short title-case line with parens, no trailing content
  if (/^[A-Z][A-Za-z\s&]+\([^)]+\)\s*$/.test(trimmed) && trimmed.length < 80) return true;
  return false;
}

/** Parse structured "Option N:" blocks with Title/Subtitle/Tagline fields */
interface EditionOption {
  title: string;
  subtitle: string;
  tagline: string;
}

function extractEditionOptions(body: string): { preamble: string; options: EditionOption[]; rest: string } | null {
  const lines = body.split("\n");
  // Look for the "TITLE/SUBTITLE/TAGLINE OPTIONS" or similar header
  const headerIdx = lines.findIndex(l => /title.*subtitle.*tagline.*options?\s*\(choose/i.test(l.trim()) || /options?\s*\(choose\s*\d+\)/i.test(l.trim()));
  if (headerIdx === -1) return null;

  const preamble = lines.slice(0, headerIdx).join("\n").trim();
  const options: EditionOption[] = [];
  let afterIdx = headerIdx + 1;
  let currentOption: Partial<EditionOption> | null = null;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // "Option N:" starts a new option block
    if (/^Option\s+\d+\s*:/i.test(trimmed)) {
      if (currentOption?.title) options.push(currentOption as EditionOption);
      currentOption = { title: "", subtitle: "", tagline: "" };
      afterIdx = i + 1;
      continue;
    }

    if (currentOption) {
      const titleMatch = trimmed.match(/^Title\s*:\s*(.+)/i);
      const subtitleMatch = trimmed.match(/^Subtitle\s*:\s*(.+)/i);
      const taglineMatch = trimmed.match(/^Tagline\s*:\s*(.+)/i);

      if (titleMatch) { currentOption.title = titleMatch[1].trim(); afterIdx = i + 1; continue; }
      if (subtitleMatch) { currentOption.subtitle = subtitleMatch[1].trim(); afterIdx = i + 1; continue; }
      if (taglineMatch) { currentOption.tagline = taglineMatch[1].trim(); afterIdx = i + 1; continue; }

      // Blank line after a complete option — keep scanning
      if (!trimmed) { afterIdx = i + 1; continue; }

      // Non-matching content = end of options block
      if (currentOption.title) options.push(currentOption as EditionOption);
      currentOption = null;
      afterIdx = i;
      break;
    }

    // Skip blank lines between header and first option
    if (!trimmed) { afterIdx = i + 1; continue; }

    // Non-option content after header but before any "Option N:" — treat as end
    if (!currentOption && options.length === 0) { afterIdx = i; break; }
  }

  if (currentOption?.title) options.push(currentOption as EditionOption);
  if (options.length < 2) return null;

  const rest = lines.slice(afterIdx).join("\n").trim();
  return { preamble, options, rest };
}

/** Fallback: Detect simple "N Title Options (choose 1)" pattern with numbered list */
function extractChoiceOptions(body: string): { preamble: string; options: string[]; rest: string } | null {
  const lines = body.split("\n");
  const choiceIdx = lines.findIndex(l => /title options?\s*\(choose\s*\d+\)/i.test(l.trim()));
  if (choiceIdx === -1) return null;

  const preamble = lines.slice(0, choiceIdx).join("\n").trim();
  const options: string[] = [];
  let afterIdx = choiceIdx + 1;

  for (let i = choiceIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      options.push(trimmed.replace(/^\d+[\.\)]\s*/, ""));
      afterIdx = i + 1;
    } else if (trimmed === "") {
      if (options.length > 0) { afterIdx = i + 1; break; }
    } else {
      break;
    }
  }

  if (options.length < 2) return null;
  const rest = lines.slice(afterIdx).join("\n").trim();
  return { preamble, options, rest };
}

/** Generic "Option N (label):" pattern — each option has a label and body text */
interface GenericOption {
  label: string;
  body: string;
}

function extractGenericOptions(body: string): { preamble: string; options: GenericOption[]; rest: string } | null {
  const lines = body.split("\n");
  const options: GenericOption[] = [];
  let firstOptionIdx = -1;

  // Find all "Option N" lines
  const optionIndices: { idx: number; label: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(/^\*?\*?Option\s+\d+\s*(?:\([^)]*\))?\s*:?\*?\*?\s*$/i) ||
              lines[i].trim().match(/^\*?\*?Option\s+\d+\s*\([^)]*\)\s*:?\*?\*?/i);
    if (m) {
      const label = lines[i].trim().replace(/\*\*/g, "").replace(/:$/, "").trim();
      optionIndices.push({ idx: i, label });
      if (firstOptionIdx === -1) firstOptionIdx = i;
    }
  }

  if (optionIndices.length < 2) return null;

  const preamble = lines.slice(0, firstOptionIdx).join("\n").trim();

  for (let i = 0; i < optionIndices.length; i++) {
    const startLine = optionIndices[i].idx + 1;
    const endLine = i + 1 < optionIndices.length ? optionIndices[i + 1].idx : lines.length;
    const optBody = lines.slice(startLine, endLine).join("\n").trim();
    options.push({ label: optionIndices[i].label, body: optBody });
  }

  // Any remaining text after the last option's content
  const lastEnd = optionIndices[optionIndices.length - 1].idx + 1;
  let restStartLine = lines.length;
  // If the last option body is followed by non-option content, it's already captured in body
  const rest = "";

  return { preamble, options, rest };
}

/** Generic option selector with label + body preview */
function GenericOptionSelector({ options, onSelect }: { options: GenericOption[]; onSelect?: (idx: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="space-y-2 my-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose an option</p>
      {options.map((opt, idx) => {
        const isActive = selected === idx;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => { setSelected(idx); onSelect?.(idx); }}
            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm transition-all ${
              isActive
                ? "border-secondary bg-secondary/10 shadow-sm"
                : "border-border/60 bg-background hover:border-border hover:bg-muted/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {isActive ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isActive ? "text-secondary" : "text-muted-foreground"}`}>
                  {opt.label}
                </p>
                <p className="text-sm text-foreground leading-relaxed">{opt.body}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Title choice selector component */
function TitleChoiceSelector({ options, onSelect }: { options: string[]; onSelect?: (idx: number, customTitle?: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const customIdx = options.length; // "Write your own" is the last option

  const handleSelect = useCallback((idx: number) => {
    setSelected(idx);
    if (idx !== customIdx) {
      onSelect?.(idx);
    }
  }, [onSelect, customIdx]);

  return (
    <div className="space-y-2 my-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose a title</p>
      {options.map((opt, idx) => {
        const isActive = selected === idx;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelect(idx)}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
              isActive
                ? "border-secondary bg-secondary/10 font-semibold text-foreground"
                : "border-border/60 bg-background hover:border-border hover:bg-muted/30 text-foreground"
            }`}
          >
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-2.5 text-xs font-bold shrink-0 ${
              isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {idx + 1}
            </span>
            {opt}
          </button>
        );
      })}

      {/* Write your own option */}
      <button
        type="button"
        onClick={() => handleSelect(customIdx)}
        className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
          selected === customIdx
            ? "border-secondary bg-secondary/10 font-semibold text-foreground"
            : "border-border/60 bg-background hover:border-border hover:bg-muted/30 text-foreground"
        }`}
      >
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-2.5 text-xs font-bold shrink-0 ${
          selected === customIdx ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
        }`}>
          ✎
        </span>
        Write my own title
      </button>

      {selected === customIdx && (
        <div className="pl-8 pt-1">
          <input
            type="text"
            value={customTitle}
            onChange={e => {
              setCustomTitle(e.target.value);
              onSelect?.(customIdx, e.target.value);
            }}
            placeholder="Type your custom title here…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

/** Edition option selector with Title + Subtitle + Tagline per card */
function EditionOptionSelector({ options }: { options: EditionOption[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="space-y-3 my-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose your edition identity</p>
      {options.map((opt, idx) => {
        const isActive = selected === idx;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => setSelected(idx)}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
              isActive
                ? "border-secondary bg-secondary/10"
                : "border-border/60 bg-background hover:border-border hover:bg-muted/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className={`text-sm font-bold ${isActive ? "text-foreground" : "text-foreground"}`}>
                  {opt.title}
                </p>
                {opt.subtitle && (
                  <p className="text-xs text-muted-foreground italic">{opt.subtitle}</p>
                )}
                {opt.tagline && (
                  <p className="text-xs text-secondary font-medium">"{opt.tagline}"</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Render formatted body content with proper paragraphs, bold headers, and workbook lines */
function FormattedBody({ body, sectionTitle }: { body: string; sectionTitle: string }) {
  const showWritingSpaces = isWorkbookContent(sectionTitle, body);

  // Check for structured edition options (Title/Subtitle/Tagline per option)
  const editionData = extractEditionOptions(body);
  if (editionData) {
    return (
      <div className="space-y-4">
        {editionData.preamble && <FormattedBodyInner body={editionData.preamble} sectionTitle={sectionTitle} showWritingSpaces={showWritingSpaces} />}
        <EditionOptionSelector options={editionData.options} />
        {editionData.rest && <FormattedBodyInner body={editionData.rest} sectionTitle={sectionTitle} showWritingSpaces={showWritingSpaces} />}
      </div>
    );
  }

  // Fallback: simple title choice options
  const choiceData = extractChoiceOptions(body);
  if (choiceData) {
    return (
      <div className="space-y-4">
        {choiceData.preamble && <FormattedBodyInner body={choiceData.preamble} sectionTitle={sectionTitle} showWritingSpaces={showWritingSpaces} />}
        <TitleChoiceSelector options={choiceData.options} />
        {choiceData.rest && <FormattedBodyInner body={choiceData.rest} sectionTitle={sectionTitle} showWritingSpaces={showWritingSpaces} />}
      </div>
    );
  }

  // Generic "Option N:" pattern (e.g. headline options in lead magnets)
  const genericData = extractGenericOptions(body);
  if (genericData) {
    return (
      <div className="space-y-4">
        {genericData.preamble && <FormattedBodyInner body={genericData.preamble} sectionTitle={sectionTitle} showWritingSpaces={showWritingSpaces} />}
        <GenericOptionSelector options={genericData.options} />
        {genericData.rest && <FormattedBodyInner body={genericData.rest} sectionTitle={sectionTitle} showWritingSpaces={showWritingSpaces} />}
      </div>
    );
  }

  return <FormattedBodyInner body={body} sectionTitle={sectionTitle} showWritingSpaces={showWritingSpaces} />;
}

function FormattedBodyInner({ body, sectionTitle, showWritingSpaces }: { body: string; sectionTitle: string; showWritingSpaces: boolean }) {
  const groups = groupIntoParagraphs(body);

  return (
    <div className="space-y-4">
      {groups.map((lines, gIdx) => {
        // Single structural line
        if (lines.length === 1) {
          const lt = lines[0];

          // Inline header (e.g. "Cover Concept Brief (publication-ready):")
          if (isInlineHeader(lt)) {
            return (
              <p key={gIdx} className="text-sm font-bold text-foreground mt-2">
                {renderInlineFormatting(lt)}
              </p>
            );
          }

          // Prompt line
          const promptMatch = lt.match(/^Prompt\s*[:—–]\s*[""\u201C]?(.+?)[""\u201D]?\s*$/i);
          if (promptMatch) {
            return (
              <div key={gIdx} className="mt-2">
                <p className="text-sm font-semibold text-foreground">
                  {renderInlineFormatting(promptMatch[1])}
                </p>
                {showWritingSpaces && <WritingLines count={3} />}
              </div>
            );
          }

          // Source/Why it matters
          if (/^(Source\s*(Chapter)?|Why it matters)\s*[:—]/i.test(lt)) {
            return (
              <p key={gIdx} className="text-xs text-muted-foreground italic ml-1">
                {renderInlineFormatting(lt)}
              </p>
            );
          }

          // Bullet item
          if (/^[-•●]\s/.test(lt)) {
            return (
              <div key={gIdx} className="flex items-start gap-2 text-sm text-foreground leading-relaxed ml-1">
                <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                <span>{renderInlineFormatting(lt.replace(/^[-•●]\s*/, ""))}</span>
              </div>
            );
          }

          // Numbered item
          if (/^\d+[\.\)]\s/.test(lt)) {
            return (
              <p key={gIdx} className="text-sm text-foreground leading-relaxed">
                {renderInlineFormatting(lt)}
              </p>
            );
          }

          // Workbook writing prompt
          if (showWritingSpaces && /^(write|describe|list|reflect|your answer|answer here)/i.test(lt)) {
            return (
              <div key={gIdx}>
                <p className="text-sm text-foreground font-medium">{renderInlineFormatting(lt)}</p>
                <WritingLines count={4} />
              </div>
            );
          }
        }

        // Multi-line prose paragraph — join into a single <p>
        const merged = lines.join(" ");

        // Check if it looks like a header line (short, ends with colon)
        if (isInlineHeader(merged)) {
          return (
            <p key={gIdx} className="text-sm font-bold text-foreground mt-2">
              {renderInlineFormatting(merged)}
            </p>
          );
        }

        return (
          <p key={gIdx} className="text-sm text-foreground leading-relaxed">
            {renderInlineFormatting(merged)}
          </p>
        );
      })}
    </div>
  );
}

/** Render inline markdown: **bold**, *italic* */
function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

/** Workbook writing lines */
function WritingLines({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-2 mb-3 space-y-3 pl-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-dashed border-muted-foreground/30 h-6" />
      ))}
    </div>
  );
}

/** Edit mode that preserves title choices as UI and only edits the rest */
function SectionEditor({ body, sectionTitle, onChange }: { body: string; sectionTitle: string; onChange: (newBody: string) => void }) {
  const choiceData = extractChoiceOptions(body);

  if (choiceData) {
    // Show title chooser as UI, only allow editing the "rest" content
    return (
      <div className="space-y-4">
        {choiceData.preamble && (
          <p className="text-xs text-muted-foreground italic">{choiceData.preamble}</p>
        )}
        <TitleChoiceSelector options={choiceData.options} />
        <Textarea
          value={choiceData.rest}
          onChange={e => {
            // Reconstruct full body: preamble + choices + edited rest
            const choiceBlock = [
              choiceData.preamble,
              choiceData.options.map((o, i) => `${i + 1}. ${o}`).join("\n"),
              "",
              e.target.value,
            ].filter(Boolean).join("\n");
            onChange(choiceBlock);
          }}
          rows={Math.max(8, choiceData.rest.split("\n").length + 2)}
          className="text-sm"
          placeholder="Edit the remaining content..."
        />
      </div>
    );
  }

  return (
    <Textarea
      value={body}
      onChange={e => onChange(e.target.value)}
      rows={Math.max(8, body.split("\n").length + 2)}
      className="text-sm"
    />
  );
}

interface Props {
  content: string;
  onChange: (newContent: string) => void;
  stepTitle: string;
  /** Section title keywords to hide (case-insensitive partial match) */
  hideSections?: string[];
  /** When true, all cards start expanded and in edit mode */
  autoExpand?: boolean;
}

export default function ContentSectionCards({ content, onChange, stepTitle, hideSections, autoExpand }: Props) {
  let sections = parseContentSections(content);
  if (hideSections && hideSections.length > 0) {
    sections = sections.filter(sec => {
      const titleLower = sec.title.toLowerCase();
      return !hideSections.some(kw => titleLower.includes(kw.toLowerCase()));
    });
  }
  const [expandedIdxs, setExpandedIdxs] = useState<Set<number>>(() => autoExpand ? new Set(sections.map((_, i) => i)) : new Set());
  const [editingIdxs, setEditingIdxs] = useState<Set<number>>(() => autoExpand ? new Set(sections.map((_, i) => i)) : new Set());

  const isSingleSection = sections.length === 1 && sections[0].title === "Content";

  if (isSingleSection) {
    return (
      <Textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        rows={20}
        className="text-sm"
      />
    );
  }

  const handleSectionEdit = (idx: number, newBody: string) => {
    const updatedSections = sections.map((s, i) => i === idx ? { ...s, body: newBody } : s);
    const newContent = updatedSections
      .map((s, i) => `${i + 1}) ${s.title}\n${s.body}`)
      .join("\n\n");
    onChange(newContent);
  };

  const toggleExpanded = (idx: number) => {
    setExpandedIdxs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); setEditingIdxs(p => { const n = new Set(p); n.delete(idx); return n; }); }
      else next.add(idx);
      return next;
    });
  };

  const toggleEditing = (idx: number) => {
    setEditingIdxs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const isExpanded = expandedIdxs.has(idx);
        const isEditing = editingIdxs.has(idx);
        const previewText = section.body.replace(/\n/g, " ").slice(0, 100);

        const hasContent = section.body.trim().length > 0;

        return (
          <Card key={idx} className="overflow-hidden border-border/60 hover:border-border transition-colors">
            {/* Header — always visible */}
            <button
              type="button"
              onClick={() => hasContent ? toggleExpanded(idx) : undefined}
              className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${hasContent ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"}`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{section.title}</p>
                {!isExpanded && hasContent && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {previewText}…
                  </p>
                )}
              </div>
              {hasContent && (
                isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )
              )}
            </button>

            {/* Expanded body */}
            {isExpanded && hasContent && (
              <div className="px-5 pb-5 border-t border-border/40">
                <div className="flex justify-end mt-3 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleEditing(idx)}
                  >
                    {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    {isEditing ? "Done" : "Edit"}
                  </Button>
                </div>

                {isEditing ? (
                  <SectionEditor
                    body={section.body}
                    sectionTitle={section.title}
                    onChange={(newBody) => handleSectionEdit(idx, newBody)}
                  />
                ) : (
                  <div className="rounded-lg bg-muted/20 p-4">
                    <FormattedBody body={section.body} sectionTitle={section.title} />
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
