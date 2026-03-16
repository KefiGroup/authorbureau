import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Pencil, Check, BookOpen, FileText, MessageCircle, Gift, Sparkles, ListChecks } from "lucide-react";
import { mdToHtml } from "@/lib/md-to-html";

interface ContentSection {
  title: string;
  body: string;
  icon: React.ReactNode;
}

/** Guess an icon based on section title keywords */
function iconForTitle(title: string): React.ReactNode {
  const t = title.toLowerCase();
  if (t.includes("foreword") || t.includes("letter")) return <BookOpen className="h-4 w-4" />;
  if (t.includes("prompt") || t.includes("reflection")) return <MessageCircle className="h-4 w-4" />;
  if (t.includes("chapter") || t.includes("exclusive")) return <FileText className="h-4 w-4" />;
  if (t.includes("gift") || t.includes("inscription")) return <Gift className="h-4 w-4" />;
  if (t.includes("companion") || t.includes("resource") || t.includes("guide")) return <ListChecks className="h-4 w-4" />;
  if (t.includes("identity") || t.includes("edition")) return <Sparkles className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

/** Split content into sections based on numbered headings like "1) TITLE", "2) TITLE" or "## Title" patterns */
function parseContentSections(content: string): ContentSection[] {
  // Try splitting by numbered section patterns: "1) ...", "2) ..." at line start
  const numberedPattern = /^(\d+)\)\s+(.+)/gm;
  const matches: { index: number; number: string; title: string }[] = [];
  let m;
  while ((m = numberedPattern.exec(content)) !== null) {
    matches.push({ index: m.index, number: m[1], title: m[2].trim() });
  }

  // Also try markdown heading pattern
  if (matches.length < 2) {
    const headingPattern = /^#{1,4}\s+(.+)/gm;
    matches.length = 0;
    while ((m = headingPattern.exec(content)) !== null) {
      matches.push({ index: m.index, number: String(matches.length + 1), title: m[1].trim() });
    }
  }

  // Also try uppercase label pattern: "FOREWORD:", "REFLECTION PROMPTS:", etc.
  if (matches.length < 2) {
    const uppercasePattern = /^([A-Z][A-Z\s&()]+(?:—[^\n]+)?)\s*$/gm;
    matches.length = 0;
    while ((m = uppercasePattern.exec(content)) !== null) {
      matches.push({ index: m.index, number: String(matches.length + 1), title: m[1].trim() });
    }
  }

  if (matches.length < 2) {
    // Can't split — return single section
    return [{ title: "Content", body: content.trim(), icon: <FileText className="h-4 w-4" /> }];
  }

  const sections: ContentSection[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    // Get body text after the title line
    const rawBlock = content.slice(start, end).trim();
    const firstNewline = rawBlock.indexOf("\n");
    const body = firstNewline >= 0 ? rawBlock.slice(firstNewline + 1).trim() : "";
    const title = matches[i].title.replace(/\*\*/g, "").replace(/^[-–—]\s*/, "").trim();
    sections.push({ title, body, icon: iconForTitle(title) });
  }

  return sections;
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

  // For single section fallback, show regular textarea
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
    // Reconstruct full content from sections with updated body
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

        return (
          <Card key={idx} className="overflow-hidden border-border/60">
            {/* Header — always visible */}
            <button
              type="button"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 text-secondary">
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{section.title}</p>
                {!isExpanded && section.body && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {section.body.slice(0, 80)}…
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
              <div className="px-4 pb-4 border-t border-border/40">
                <div className="flex justify-end mt-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setEditingIdx(isEditing ? null : idx)}
                  >
                    {isEditing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                    {isEditing ? "Done" : "Edit"}
                  </Button>
                </div>

                {isEditing ? (
                  <Textarea
                    value={section.body}
                    onChange={e => handleSectionEdit(idx, e.target.value)}
                    rows={Math.max(6, section.body.split("\n").length + 2)}
                    className="text-sm"
                  />
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(section.body) }}
                  />
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
