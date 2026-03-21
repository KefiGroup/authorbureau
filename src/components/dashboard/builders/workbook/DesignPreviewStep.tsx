import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, BookOpen, FileText, List } from "lucide-react";

import { DESIGN_TEMPLATES, CONTENT_TYPE_LABELS, type WorkbookSection } from "./types";
import type { WorkbookStepProps } from "./types";

export default function DesignPreviewStep({ stepData, setStepData, onMarkEdited, bookTitle }: WorkbookStepProps) {
  const sections: WorkbookSection[] = stepData.sections || [];
  const setup = stepData.setup || {};
  const [currentPage, setCurrentPage] = useState(0);
  const selectedTemplate = setup.template || "clean";

  // Build page list: cover, TOC, then sections
  const pages = [
    { type: "cover" as const, title: "Cover Page" },
    { type: "toc" as const, title: "Table of Contents" },
    ...sections.map(s => ({ type: "section" as const, title: s.title, section: s })),
    { type: "back" as const, title: "Back Cover" },
  ];

  const page = pages[currentPage];

  const switchTemplate = (id: string) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, template: id } }));
    onMarkEdited("design");
  };

  return (
    <div className="space-y-5">
      <StepInstructions
        summary="Preview how your workbook will look as a formatted document. Navigate through pages and switch templates."
        items={[
          { label: "Design Template badges", description: "click to switch between visual styles (Clean, Modern, Bold, etc.)." },
          { label: "Page navigator", description: "use the arrows to browse through Cover, Table of Contents, Sections, and Back Cover." },
          { label: "Cover page", description: "shows your title, subtitle, and selected template style." },
          { label: "Section pages", description: "preview how your exercises, reflections, and other content will be laid out." },
          { label: "Back cover", description: "includes your call-to-action (CTA) directing readers to your next product." },
        ]}
      />
      {/* Template switcher */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Design Template</p>
        <div className="flex gap-2 flex-wrap">
          {DESIGN_TEMPLATES.map(t => (
            <Badge
              key={t.id}
              variant={selectedTemplate === t.id ? "default" : "outline"}
              className="cursor-pointer text-xs px-3 py-1"
              onClick={() => switchTemplate(t.id)}
            >
              {t.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Page preview */}
      <Card className="overflow-hidden bg-background">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 0} onClick={() => setCurrentPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">Page {currentPage + 1} of {pages.length}</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md aspect-[8.5/11] bg-white border border-border rounded-lg shadow-sm flex flex-col overflow-hidden">
            {page.type === "cover" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-secondary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">{setup.title || "Workbook Title"}</h2>
                {setup.subtitle && <p className="text-sm text-muted-foreground mb-3">{setup.subtitle}</p>}
                <p className="text-xs text-muted-foreground">A companion workbook for</p>
                <p className="text-sm font-medium text-foreground">{bookTitle || "Your Book"}</p>
                <Badge variant="outline" className="mt-4 text-[10px]">{selectedTemplate}</Badge>
              </div>
            )}

            {page.type === "toc" && (
              <div className="flex-1 p-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><List className="h-4 w-4" /> Table of Contents</h3>
                <div className="space-y-1.5">
                  {sections.map((s, i) => (
                    <div key={s.id} className="flex justify-between text-xs border-b border-dashed border-border pb-1">
                      <span className="truncate">{s.title}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{i + 3}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {page.type === "section" && page.section && (
              <div className="flex-1 p-6 overflow-y-auto">
                <h3 className="text-sm font-bold mb-2">{page.section.title}</h3>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{page.section.intro || "Section introduction..."}</p>
                {(page.section.elements || []).slice(0, 3).map((el, i) => (
                  <div key={i} className="mb-3 p-2 rounded border border-border bg-muted/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[8px]">{CONTENT_TYPE_LABELS[el.type] || el.type}</Badge>
                      <span className="text-[10px] font-medium">{el.title}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{el.content || "..."}</p>
                  </div>
                ))}
                {(page.section.elements || []).length > 3 && (
                  <p className="text-[9px] text-muted-foreground text-center">+ {(page.section.elements || []).length - 3} more elements</p>
                )}
              </div>
            )}

            {page.type === "back" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold mb-1">Ready for More?</p>
                <p className="text-xs text-muted-foreground mb-3">Take the next step in your journey.</p>
                <Badge variant="secondary" className="text-[10px]">CTA → Online Course / Website</Badge>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
