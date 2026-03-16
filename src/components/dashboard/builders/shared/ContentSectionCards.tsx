import { useState } from "react";
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

  // Numbered section: "1) EDITION IDENTITY" or "2) THEMED FOREWORD..."
  if (/^\d+\)\s+[A-Z]/.test(trimmed)) return true;

  // ALL-CAPS header line (at least 2 words, not a sub-item)
  // Must NOT start with "Prompt:", "Source:", "Why it matters:", etc.
  if (/^[A-Z][A-Z\s\-&/(),:]+$/.test(trimmed) && trimmed.length > 4 && trimmed.length < 120) {
    // Exclude sub-items
    if (/^(PROMPT|SOURCE|WHY|NOTE|TIP|HINT|ANSWER|OPTION|STEP\s+\d)/i.test(trimmed)) return false;
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
        sectionStarts.push({ index: i, title: match[1].replace(/\*\*/g, "").trim() });
      }
    }
  }

  if (sectionStarts.length < 2) {
    return [{ title: "Content", body: content.trim(), icon: <FileText className="h-5 w-5" /> }];
  }

  const sections: ContentSection[] = [];
  for (let i = 0; i < sectionStarts.length; i++) {
    const startLine = sectionStarts[i].index + 1; // skip the header line
    const endLine = i + 1 < sectionStarts.length ? sectionStarts[i + 1].index : lines.length;
    const body = lines.slice(startLine, endLine).join("\n").trim();
    const title = sectionStarts[i].title;
    sections.push({ title, body, icon: iconForTitle(title) });
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

/** Render formatted body content with proper paragraphs, bold, and workbook lines */
function FormattedBody({ body, sectionTitle }: { body: string; sectionTitle: string }) {
  const showWritingSpaces = isWorkbookContent(sectionTitle, body);
  const paragraphs = body.split(/\n{2,}/);

  return (
    <div className="space-y-3">
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check if it's a sub-header (like "Prompt: ..." or a short bold line)
        const isSubHeader = /^(Prompt\s*[:—]|Source\s*[:—]|Why it matters|Chapter|Day\s+\d|Week\s+\d|Module\s+\d|Section\s+\d)/i.test(trimmed);
        const isBulletBlock = trimmed.split("\n").every(l => /^[-•●]\s/.test(l.trim()) || !l.trim());

        if (isBulletBlock) {
          const items = trimmed.split("\n").filter(l => l.trim());
          return (
            <ul key={pIdx} className="space-y-1.5 ml-1">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                  <span className="text-muted-foreground mt-1 shrink-0">•</span>
                  <span>{renderInlineFormatting(item.replace(/^[-•●]\s*/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Render lines within a paragraph
        const lines = trimmed.split("\n");

        return (
          <div key={pIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const lt = line.trim();
              if (!lt) return null;

              // Sub-header styling (Prompt:, Source Chapter:, etc.)
              const promptMatch = lt.match(/^Prompt\s*[:—–]\s*[""]?(.+?)[""]?\s*$/i);
              if (promptMatch) {
                return (
                  <div key={lIdx} className="mt-3 first:mt-0">
                    <p className="text-sm font-semibold text-foreground">
                      {renderInlineFormatting(promptMatch[1])}
                    </p>
                    {showWritingSpaces && <WritingLines count={3} />}
                  </div>
                );
              }

              // "Source Chapter:" or "Why it matters:" — secondary info
              if (/^(Source\s*(Chapter)?|Why it matters)\s*[:—]/i.test(lt)) {
                return (
                  <p key={lIdx} className="text-xs text-muted-foreground italic ml-1">
                    {renderInlineFormatting(lt)}
                  </p>
                );
              }

              // Numbered sub-items like "1. Title Option" — render as formatted list
              if (/^\d+[\.\)]\s/.test(lt)) {
                return (
                  <p key={lIdx} className="text-sm text-foreground leading-relaxed">
                    {renderInlineFormatting(lt)}
                  </p>
                );
              }

              // Bullet items
              if (/^[-•●]\s/.test(lt)) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 text-sm text-foreground leading-relaxed ml-1">
                    <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                    <span>{renderInlineFormatting(lt.replace(/^[-•●]\s*/, ""))}</span>
                  </div>
                );
              }

              // "Write your answer:" type prompts in workbooks
              if (showWritingSpaces && /^(write|describe|list|reflect|your answer|answer here)/i.test(lt)) {
                return (
                  <div key={lIdx}>
                    <p className="text-sm text-foreground font-medium mt-2">{renderInlineFormatting(lt)}</p>
                    <WritingLines count={4} />
                  </div>
                );
              }

              // Regular paragraph line
              return (
                <p key={lIdx} className="text-sm text-foreground leading-relaxed">
                  {renderInlineFormatting(lt)}
                </p>
              );
            })}
          </div>
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
                  <Textarea
                    value={section.body}
                    onChange={e => handleSectionEdit(idx, e.target.value)}
                    rows={Math.max(8, section.body.split("\n").length + 2)}
                    className="text-sm font-mono"
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
