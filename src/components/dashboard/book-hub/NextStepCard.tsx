import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStudioPath } from "@/config/abbyFrameworkConfig";
import type { NodeWithProgress } from "@/hooks/useBookNodeProgress";
import type { AccentClasses } from "./categoryAccent";

interface Props {
  node: NodeWithProgress | null;
  bookId: string;
  bookTitle: string;
  accent: AccentClasses;
  onUpgrade?: () => void;
  onNavigateSection?: (section: string) => void;
  emptyMessage?: string;
}

export default function NextStepCard({ node, bookId, bookTitle, accent, onUpgrade, onNavigateSection, emptyMessage }: Props) {
  const navigate = useNavigate();

  if (!node) {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-emerald-800">All caught up</h3>
          <p className="text-sm text-emerald-700/80">{emptyMessage || "You've built everything in this category. Move to the next stage to keep growing."}</p>
        </div>
      </div>
    );
  }

  const Icon = node.icon;
  const handleClick = () => {
    if (node.state === "locked") { onUpgrade?.(); return; }
    const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";
    const path = getStudioPath(node.id, bookId, titleParam);
    if (path) navigate(path);
    else if (node.navigateTo && onNavigateSection) onNavigateSection(node.navigateTo);
  };

  const isLocked = node.state === "locked";
  const ctaLabel = node.state === "in-progress" ? "Continue Building" : isLocked ? `Unlock ${node.tierRequired}` : "Build Now";

  return (
    <div className={`rounded-2xl border-2 ${accent.borderSoft} ${accent.gradientCard} p-5 sm:p-6`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className={`h-3.5 w-3.5 ${accent.text}`} />
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${accent.text}`}>
          Your Next Step · {node.code}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${accent.bg} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-xl font-black text-foreground">{node.label}</h3>
          <p className="text-sm text-foreground/70 mt-1 line-clamp-2">{node.description}</p>
        </div>
        <Button
          size="lg"
          className={`${accent.buttonBg} gap-2 shrink-0`}
          onClick={handleClick}
        >
          {isLocked && <Lock className="h-4 w-4" />}
          {ctaLabel}
          {!isLocked && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
