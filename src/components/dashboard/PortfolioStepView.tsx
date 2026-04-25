import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken } from "@/lib/get-active-token";
import { ABBY_CATEGORIES, getStudioPath, type AbbyCategory } from "@/config/abbyFrameworkConfig";
import { isSuperAdmin } from "@/lib/superadmin";
import { useNodeGating } from "@/hooks/useNodeGating";
import { useBookNodeProgress, type NodeWithProgress, type NodeStatus } from "@/hooks/useBookNodeProgress";
import { ACCENT_CLASSES, categoryToAccent } from "@/components/dashboard/book-hub/categoryAccent";
import NextStepCard from "@/components/dashboard/book-hub/NextStepCard";
import CategoryProgressDots from "@/components/dashboard/book-hub/CategoryProgressDots";
import SmartProductCard, { type ProductCardState } from "@/components/dashboard/SmartProductCard";

interface BookSummary { id: string; title: string; }

interface Props {
  categoryId: string;
  tier?: string;
  onNavigate?: (section: string) => void;
  analyzedBooks?: BookSummary[];
}

const CATEGORY_HEADLINES: Record<string, { title: string; revenue: string; intro: string }> = {
  "revenue-streams": {
    title: "Build Your Brand",
    revenue: "$5,520 – $15,480 /yr potential",
    intro: "Foundation first. These 9 products turn your book into a recognizable brand. Start at #1 and work down — each step amplifies the next.",
  },
  "marketing-channels": {
    title: "Build Your Authority",
    revenue: "$13,500 – $39,480 /yr potential",
    intro: "Scale your reach. Now that your brand is in place, these 9 products turn followers into students, clients, and partners.",
  },
  "authority-builders": {
    title: "Yield Premium Revenue",
    revenue: "$68,400 – $215,520 /yr potential",
    intro: "High-ticket services. Unlike Brand and Build, these 10 don't require sequence — pursue the ones that match your strengths and audience demand.",
  },
};

export default function PortfolioStepView({ categoryId, tier = "free", onNavigate, analyzedBooks }: Props) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [bookLoading, setBookLoading] = useState(true);
  const [showWhy, setShowWhy] = useState(false);
  const { gating } = useNodeGating();

  const openNodeIds = new Set(gating.filter(r => r.is_open).map(r => r.node_id));
  const effectiveTier = isAdmin || isSuperAdmin(user?.email) ? "yield" : tier;
  const progress = useBookNodeProgress(effectiveTier, openNodeIds);

  useEffect(() => {
    async function fetchBooks() {
      if (!user) { setBookLoading(false); return; }
      try {
        const token = await getActiveToken();
        if (!token) { setBookLoading(false); return; }
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const result = await response.json();
        if (response.ok) setBooks(result.books || []);
      } catch (err) { console.error(err); }
      setBookLoading(false);
    }
    fetchBooks();
  }, [user]);

  const cat = ABBY_CATEGORIES[categoryId as AbbyCategory];
  if (!cat) return null;

  const accent = ACCENT_CLASSES[categoryToAccent(categoryId)];
  const catProgress = progress.byCategory[categoryId as AbbyCategory];
  const HeaderIcon = cat.headerIcon;
  const headline = CATEGORY_HEADLINES[categoryId];
  const primaryBookId = analyzedBooks?.[0]?.id || books[0]?.id || "";
  const primaryBookTitle = analyzedBooks?.[0]?.title || books[0]?.title || "";

  if (progress.loading || bookLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-2xl bg-muted/40" />
        <div className="h-32 rounded-2xl bg-muted/40" />
        <div className="h-64 rounded-2xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Compact header */}
      <div className={`rounded-2xl border-2 ${accent.borderSoft} ${accent.gradientCard} p-5`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${accent.bg} flex items-center justify-center text-white shadow-md shrink-0`}>
            <HeaderIcon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`font-heading text-xl sm:text-2xl font-black ${accent.text}`}>
              {headline?.title || cat.label}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-foreground/70 flex-wrap">
              <span><strong>{catProgress.completed}</strong> of {catProgress.total} built</span>
              {catProgress.inProgress > 0 && <span>· {catProgress.inProgress} in progress</span>}
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {headline?.revenue}</span>
            </div>
          </div>
          <div className="hidden sm:block shrink-0">
            <CategoryProgressDots total={catProgress.total} completed={catProgress.completed} accent={accent} />
          </div>
        </div>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{headline?.intro}</p>
        <button
          onClick={() => setShowWhy((v) => !v)}
          className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${accent.text} hover:underline`}
        >
          Why this order? <ChevronDown className={`h-3 w-3 transition-transform ${showWhy ? "rotate-180" : ""}`} />
        </button>
        {showWhy && (
          <div className="mt-3 rounded-lg bg-card/60 border border-border p-3 text-xs text-foreground/75 leading-relaxed space-y-2">
            <p>Each product builds on the foundation of the previous one. <strong>Branding & Marketing</strong> products (#1–5) make sure people can find you and stay in touch. <strong>Digital Products</strong> (#6–9) give them ways to buy from you at higher price points.</p>
            <p>You can build out of order, but completing in sequence gives the smoothest growth path.</p>
          </div>
        )}
      </div>

      {/* Next step hero */}
      <NextStepCard
        node={catProgress.nextStep}
        bookId={primaryBookId}
        bookTitle={primaryBookTitle}
        accent={accent}
        onUpgrade={() => onNavigate?.("build-business")}
        onNavigateSection={onNavigate}
        emptyMessage={
          categoryId === "revenue-streams"
            ? "Brand foundation complete. Move on to Build Authority to scale your reach."
            : categoryId === "marketing-channels"
              ? "Authority built. Yield Revenue is where you turn it into premium income."
              : "You've activated your full revenue stack. Keep refining and expanding."
        }
      />

      {/* Full journey — grouped SmartProductCard grid */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
          The Full Journey
        </h2>
        {(() => {
          const stateMap: Record<NodeStatus, ProductCardState> = {
            completed: "published",
            "in-progress": "in-progress",
            available: "available",
            locked: "locked",
            "coming-soon": "coming-soon",
          };
          const groups: { name: string; nodes: NodeWithProgress[] }[] = [];
          for (const n of catProgress.nodes) {
            const sub = n.subCategory || "Products";
            let g = groups.find((x) => x.name === sub);
            if (!g) { g = { name: sub, nodes: [] }; groups.push(g); }
            g.nodes.push(n);
          }
          const handleNav = (n: NodeWithProgress) => {
            if (n.state === "locked") { onNavigate?.("build-business"); return; }
            if (n.state === "coming-soon") return;
            const titleParam = primaryBookTitle ? `&bookTitle=${encodeURIComponent(primaryBookTitle)}` : "";
            const path = getStudioPath(n.id, primaryBookId, titleParam);
            if (path) navigate(path);
            else if (n.navigateTo && onNavigate) onNavigate(n.navigateTo);
          };
          return (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.name}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-px flex-1 ${accent.divider}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${accent.text}`}>{group.name}</span>
                    <div className={`h-px flex-1 ${accent.divider}`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.nodes.map((n) => {
                      const isNext = catProgress.nextStep?.id === n.id;
                      const cardState: ProductCardState = isNext && (n.state === "available" || n.state === "in-progress")
                        ? "recommended"
                        : stateMap[n.state];
                      return (
                        <SmartProductCard
                          key={n.id}
                          id={n.id}
                          label={n.label}
                          icon={n.icon}
                          description={n.description || ""}
                          state={cardState}
                          tierRequired={n.tierRequired}
                          code={n.code}
                          onBuild={() => handleNav(n)}
                          onContinue={() => handleNav(n)}
                          onView={() => handleNav(n)}
                          onUpgrade={() => onNavigate?.("build-business")}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Status updates automatically as you publish each product.
      </p>
    </div>
  );
}
