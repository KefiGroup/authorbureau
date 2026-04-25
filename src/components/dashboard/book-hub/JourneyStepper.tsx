import { useNavigate } from "react-router-dom";
import { CheckCircle2, Lock, ArrowRight, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStudioPath } from "@/config/abbyFrameworkConfig";
import type { NodeWithProgress, NodeStatus } from "@/hooks/useBookNodeProgress";

interface Props {
  nodes: NodeWithProgress[];
  bookId: string;
  bookTitle: string;
  highlightNodeId?: string | null;
  accentClass: string; // e.g. "builder-brand"
  onUpgrade?: () => void;
  onNavigateSection?: (section: string) => void;
}

const stateMeta: Record<NodeStatus, { label: string; pillClass: string; cta: string }> = {
  completed:    { label: "Completed",   pillClass: "bg-emerald-100 text-emerald-700 border-emerald-200", cta: "View" },
  "in-progress":{ label: "In Progress", pillClass: "bg-amber-100 text-amber-700 border-amber-200",       cta: "Continue" },
  available:    { label: "Ready",       pillClass: "bg-slate-100 text-slate-700 border-slate-200",       cta: "Build Now" },
  locked:       { label: "Locked",      pillClass: "bg-muted text-muted-foreground border-border",       cta: "Unlock" },
  "coming-soon":{ label: "Coming Soon", pillClass: "bg-muted text-muted-foreground border-border",       cta: "Notify Me" },
};

export default function JourneyStepper({ nodes, bookId, bookTitle, highlightNodeId, accentClass, onUpgrade, onNavigateSection }: Props) {
  const navigate = useNavigate();

  const handleClick = (n: NodeWithProgress) => {
    if (n.state === "locked") { onUpgrade?.(); return; }
    if (n.state === "coming-soon") return;
    const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";
    if (n.navigateTo && onNavigateSection && !getStudioPath(n.id, bookId, titleParam)) {
      onNavigateSection(n.navigateTo);
      return;
    }
    const path = getStudioPath(n.id, bookId, titleParam);
    if (path) navigate(path);
    else if (n.navigateTo && onNavigateSection) onNavigateSection(n.navigateTo);
  };

  // group by subCategory while preserving order
  const groups: { name: string; nodes: NodeWithProgress[] }[] = [];
  for (const n of nodes) {
    const sub = n.subCategory || "Products";
    let g = groups.find((x) => x.name === sub);
    if (!g) { g = { name: sub, nodes: [] }; groups.push(g); }
    g.nodes.push(n);
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.name}>
          <div className={`flex items-center gap-2 mb-3`}>
            <div className={`h-px flex-1 bg-${accentClass}/20`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] text-${accentClass}`}>{group.name}</span>
            <div className={`h-px flex-1 bg-${accentClass}/20`} />
          </div>
          <ol className="space-y-2">
            {group.nodes.map((n) => {
              const meta = stateMeta[n.state];
              const isHighlight = highlightNodeId === n.id;
              const Icon = n.icon;
              const isClickable = n.state !== "coming-soon";
              return (
                <li
                  key={n.id}
                  className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-all ${
                    isHighlight
                      ? `border-${accentClass} bg-${accentClass}/5 shadow-sm ring-1 ring-${accentClass}/30`
                      : n.state === "completed"
                        ? "border-emerald-200 bg-emerald-50/40"
                        : n.state === "in-progress"
                          ? "border-amber-200 bg-amber-50/30"
                          : n.state === "locked" || n.state === "coming-soon"
                            ? "border-border bg-muted/30 opacity-75"
                            : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  {isHighlight && (
                    <span className={`absolute -left-px top-3 bottom-3 w-1 rounded-full bg-${accentClass}`} />
                  )}
                  {/* Sequence + code */}
                  <div className="flex flex-col items-center justify-center w-12 shrink-0">
                    <span className={`text-[10px] font-mono font-bold ${isHighlight ? `text-${accentClass}` : "text-muted-foreground"}`}>
                      {n.code}
                    </span>
                    <span
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        n.state === "completed"
                          ? "bg-emerald-500 text-white"
                          : n.state === "in-progress"
                            ? "bg-amber-500 text-white"
                            : isHighlight
                              ? `bg-${accentClass} text-white`
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {n.state === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : n.sequence}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                    n.state === "completed" ? "bg-emerald-100 text-emerald-700" :
                    isHighlight ? `bg-${accentClass}/15 text-${accentClass}` :
                    n.state === "locked" || n.state === "coming-soon" ? "bg-muted text-muted-foreground" :
                    "bg-secondary/10 text-foreground/70"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Title + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{n.label}</span>
                      <span className={`text-[10px] font-medium rounded-full px-1.5 py-px border ${meta.pillClass}`}>
                        {meta.label}
                      </span>
                      {isHighlight && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-${accentClass}`}>
                          <Sparkles className="h-3 w-3" /> Next
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.description}</p>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    {n.state === "locked" ? (
                      <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => handleClick(n)}>
                        <Lock className="h-3 w-3" /> {n.tierRequired || "Upgrade"}
                      </Button>
                    ) : n.state === "coming-soon" ? (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2">
                        <Clock className="h-3 w-3" /> Soon
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={isHighlight ? "default" : "outline"}
                        className={`text-xs h-8 gap-1 ${
                          isHighlight ? `bg-${accentClass} text-white hover:bg-${accentClass}/90 border-transparent` :
                          n.state === "completed" ? "text-emerald-700 border-emerald-300 hover:bg-emerald-50" :
                          n.state === "in-progress" ? "text-amber-700 border-amber-300 hover:bg-amber-50" :
                          ""
                        }`}
                        onClick={() => handleClick(n)}
                        disabled={!isClickable}
                      >
                        {meta.cta} <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
