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

  // Exclude sub-item prefixes — these are NEVER major headers
  if (/^Prompt/i.test(trimmed)) return false;
  if (/^(Source|Why it matters|Note|Tip|Hint|Answer|Option|Step\s+\d)/i.test(trimmed)) return false;
  // "To: Mum", "To: Mummy" etc. are inscription examples, not headers
  if (/^To:/i.test(trimmed)) return false;

  // Numbered section: "1) EDITION IDENTITY" or "2) THEMED FOREWORD..."
  if (/^\d+\)\s+[A-Z]/.test(trimmed)) return true;

  // ALL-CAPS header line (at least 2 words, not a sub-item)
  if (/^[A-Z][A-Z\s\-&/(),:]+$/.test(trimmed) && trimmed.length > 4 && trimmed.length < 120) {
    return true;
  }

  // ALL-CAPS with em-dash description: "REFLECTION PROMPTS (10) — Mother's Day Themed"
  if (/^[A-Z][A-Z\s\-&/()0-9]+\s*[—–-]\s*.+/.test(trimmed) && /^[A-Z]/.test(trimmed)) {
    const capsPartMatch = trimmed.match(/^([A-Z][A-Z\s\-&/()0-9]+)/);
    if (capsPartMatch && capsPartMatch[1].length >= 5) return true;
  }

  return false;
}

/** Parse content into major themed sections */
function parseContentSections(content: string): ContentSection[] {
  const lines = content.split("\n");
  const sectionStarts: { index: number; title: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (isMajorSectionHeader(lines[i])) {
      let title = lines[i].trim();
      // Clean up: remove "1) " prefix
      title = title.replace(/^\d+\)\s+/, "");
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
        // Skip prompt/source sub-items even as markdown headings
        if (/^Prompt/i.test(headingText)) continue;
        if (/^(Source|Why it matters)/i.test(headingText)) continue;
        sectionStarts.push({ index: i, title: headingText });
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

  // Merge sub-item sections (Prompt:, Source:, etc.) back into their parent
  const sections: ContentSection[] = [];
  for (const sec of rawSections) {
    if (/^Prompt/i.test(sec.title) || /^(Source|Why it matters)/i.test(sec.title)) {
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

  return sections;
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
      isInlineHeader(trimmed);

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
  // "Label:" or "Label (detail):" pattern, under 80 chars
  if (/^[A-Z][^.!?]*:\s*$/.test(trimmed) && trimmed.length < 80) return true;
  // "Label (parenthetical):" pattern
  if (/^[A-Z][^:]+\([^)]+\)\s*:\s*$/.test(trimmed) && trimmed.length < 100) return true;
  return false;
}

/** Detect "N Title Options (choose 1)" pattern and extract numbered options */
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

/** Render formatted body content with proper paragraphs, bold headers, and workbook lines */
function FormattedBody({ body, sectionTitle }: { body: string; sectionTitle: string }) {
  const showWritingSpaces = isWorkbookContent(sectionTitle, body);

  // Check for title choice options
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
}

export default function ContentSectionCards({ content, onChange, stepTitle }: Props) {
  const sections = parseContentSections(content);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

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

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const isExpanded = expandedIdx === idx;
        const isEditing = editingIdx === idx;
        const previewText = section.body.replace(/\n/g, " ").slice(0, 100);

        return (
          <Card key={idx} className="overflow-hidden border-border/60 hover:border-border transition-colors">
            {/* Header — always visible */}
            <button
              type="button"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{section.title}</p>
                {!isExpanded && section.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {previewText}…
                  </p>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Expanded body */}
            {isExpanded && (
              <div className="px-5 pb-5 border-t border-border/40">
                <div className="flex justify-end mt-3 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingIdx(isEditing ? null : idx)}
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
