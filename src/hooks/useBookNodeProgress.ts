import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ABBY_CATEGORIES, type AbbyCategory, type AbbyNode } from "@/config/abbyFrameworkConfig";

export type NodeStatus = "completed" | "in-progress" | "available" | "locked" | "coming-soon";

// Maps node config id -> author_nodes.node_id (BP-XX / BA-XX / YR-XX)
export const NODE_CODE_MAP: Record<string, string> = {
  microsite: "BP-04",
  "lead-magnet": "BP-02",
  "lead-magnets": "BP-02",
  "email-marketing": "BP-01",
  "social-media": "BP-03",
  webinars: "BP-05",
  workbooks: "BP-06",
  "home-study": "BP-07",
  "special-editions": "BP-08",
  "book-sales-events": "BP-09",
  courses: "BA-10",
  audiobook: "BA-11",
  memberships: "BA-12",
  "group-coaching": "BA-13",
  "podcast-guest": "BA-14",
  "in-house-speaker": "BA-15",
  affiliates: "BA-16",
  upsells: "BA-17",
  "revenue-sharing": "BA-18",
  "coaching-1on1": "YR-19",
  "big-ticket": "YR-20",
  keynotes: "YR-21",
  training: "YR-22",
  masterminds: "YR-23",
  retreats: "YR-24",
  certification: "YR-25",
  conventions: "YR-26",
  fundraising: "YR-27",
  exhibitors: "YR-28",
};

const TIER_ORDER = ["free", "brand", "build", "yield"];

function tierMet(userTier: string, required?: string) {
  if (!required) return true;
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required.toLowerCase());
}

export interface NodeWithProgress extends AbbyNode {
  category: AbbyCategory;
  code: string;
  state: NodeStatus;
}

export interface CategoryProgress {
  total: number;
  completed: number;
  inProgress: number;
  nextStep: NodeWithProgress | null;
  nodes: NodeWithProgress[];
}

export interface BookNodeProgress {
  loading: boolean;
  byCategory: Record<AbbyCategory, CategoryProgress>;
  overallTotal: number;
  overallCompleted: number;
  topNextSteps: NodeWithProgress[]; // up to 3 next-actionable nodes globally
  continueWhereYouLeftOff: NodeWithProgress | null;
  refresh: () => void;
}

export function useBookNodeProgress(tier: string = "free", openNodeIds?: Set<string>, bookId?: string | null): BookNodeProgress {
  const { user } = useAuth();
  const [statusByCode, setStatusByCode] = useState<Record<string, "completed" | "in-progress">>({});
  const [hasAuthorSlug, setHasAuthorSlug] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) { setLoading(false); return; }
      // Only show the loading shimmer the first time. On refetch, keep showing the
      // previous counters so the badge never flashes "0 of 28".
      if (!hasLoadedOnce) setLoading(true);
      try {
        const { data: profile } = await supabase
          .from("author_profiles")
          .select("id, author_slug")
          .eq("user_id", user.id)
          .maybeSingle();

        const map: Record<string, "completed" | "in-progress"> = {};
        if (profile?.id) {
          // Scope to the current book when provided so the Book Hub tile state
          // reflects ONLY this book — not other books the author also owns.
          let q = supabase
            .from("author_nodes")
            .select("node_id, status, content_json, book_id")
            .eq("author_id", profile.id);
          if (bookId) q = q.eq("book_id", bookId);
          const { data: nodes } = await q;

          (nodes || []).forEach((n: any) => {
            const content = n.content_json;
            const hasContent =
              content && typeof content === "object" && Object.keys(content).length > 0;
            // Per-node strict gate: BP-04 must have real microsite content,
            // not just the autofilled microsite_url / book_id stub.
            const passesStrictGate = (() => {
              if (!hasContent) return false;
              if (n.node_id === "BP-04") {
                const fields = ["hero_headline", "hero_subheadline", "about_long", "about_short", "cta_label", "lead_magnet_id"];
                const hasField = fields.some((k) => {
                  const v = content[k];
                  return typeof v === "string" ? v.trim().length > 0 : !!v;
                });
                const hasSections = Array.isArray(content.sections) && content.sections.length > 0;
                return hasField || hasSections;
              }
              return true;
            })();
            const isLiveStatus = n.status === "live" || n.status === "published_pending_ghl";
            if (isLiveStatus && passesStrictGate) {
              map[n.node_id] = "completed";
            } else if (
              n.status === "content_ready" ||
              n.status === "draft" ||
              (isLiveStatus && !passesStrictGate)
            ) {
              if (map[n.node_id] !== "completed") map[n.node_id] = "in-progress";
            }
          });
        }
        if (!cancelled) {
          setStatusByCode(map);
          setHasAuthorSlug(!!profile?.author_slug);
          setHasLoadedOnce(true);
          setLoading(false);
        }
      } catch (e) {
        console.error("useBookNodeProgress:", e);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, tick, bookId]);

  const result = useMemo<BookNodeProgress>(() => {
    const byCategory = {} as Record<AbbyCategory, CategoryProgress>;
    const allActionable: NodeWithProgress[] = [];

    (Object.keys(ABBY_CATEGORIES) as AbbyCategory[]).forEach((catId) => {
      const cat = ABBY_CATEGORIES[catId];
      const nodes: NodeWithProgress[] = [...cat.nodes]
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        .map((n) => {
          const code = NODE_CODE_MAP[n.id] || n.id.toUpperCase();
          // Determine effective status from gating data
          const isOpen = !openNodeIds || openNodeIds.has(n.id) || n.status === "available";
          const effectiveStatus: AbbyNode["status"] =
            n.status === "planned" ? "planned" : isOpen ? "available" : (n.status as any);

          let state: NodeStatus;
          const dbStatus = statusByCode[code];
          if (dbStatus === "completed") state = "completed";
          else if (n.id === "microsite" && hasAuthorSlug) state = "completed";
          else if (dbStatus === "in-progress") state = "in-progress";
          else if (effectiveStatus === "coming-soon" || effectiveStatus === "planned") state = "coming-soon";
          else if (!tierMet(tier, n.tierRequired)) state = "locked";
          else state = "available";

          return { ...n, category: catId, code, state };
        });

      const completed = nodes.filter((n) => n.state === "completed").length;
      const inProgress = nodes.filter((n) => n.state === "in-progress").length;
      // Next step: first in-progress, else first available
      const nextStep =
        nodes.find((n) => n.state === "in-progress") ||
        nodes.find((n) => n.state === "available") ||
        null;

      byCategory[catId] = {
        total: nodes.length,
        completed,
        inProgress,
        nextStep,
        nodes,
      };

      nodes.forEach((n) => {
        if (n.state === "in-progress" || n.state === "available") allActionable.push(n);
      });
    });

    // Order actionable across categories: Brand first → Build → Yield, then by sequence
    const catOrder: AbbyCategory[] = ["revenue-streams", "marketing-channels", "authority-builders"];
    allActionable.sort((a, b) => {
      const ca = catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
      if (ca !== 0) return ca;
      return (a.sequence || 0) - (b.sequence || 0);
    });

    const overallTotal =
      byCategory["revenue-streams"].total +
      byCategory["marketing-channels"].total +
      byCategory["authority-builders"].total;
    const overallCompleted =
      byCategory["revenue-streams"].completed +
      byCategory["marketing-channels"].completed +
      byCategory["authority-builders"].completed;

    const continueWhereYouLeftOff =
      allActionable.find((n) => n.state === "in-progress") || allActionable[0] || null;

    return {
      loading,
      byCategory,
      overallTotal,
      overallCompleted,
      topNextSteps: allActionable.slice(0, 3),
      continueWhereYouLeftOff,
      refresh: () => setTick((t) => t + 1),
    };
  }, [statusByCode, hasAuthorSlug, tier, openNodeIds, loading]);

  return result;
}
