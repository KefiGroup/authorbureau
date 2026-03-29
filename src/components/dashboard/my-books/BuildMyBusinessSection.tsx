import { Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionTier } from "@/hooks/useAuth";
import { hasTierAccess } from "@/hooks/useAuth";

interface BuildMyBusinessSectionProps {
  bookTitle: string;
  recommendedCount: number;
  tier: SubscriptionTier;
  brandBuilt: number;
  buildAuthorityBuilt: number;
  yieldBuilt: number;
  onBuild: () => void;
}

export default function BuildMyBusinessSection({
  bookTitle, recommendedCount, tier, brandBuilt, buildAuthorityBuilt, yieldBuilt, onBuild,
}: BuildMyBusinessSectionProps) {
  const categories = [
    { label: "B·Brand Products", total: 9, built: brandBuilt, requiredTier: "brand" as const },
    { label: "B·Build Authority", total: 9, built: buildAuthorityBuilt, requiredTier: "build" as const },
    { label: "Y·Yield Revenue", total: 10, built: yieldBuilt, requiredTier: "yield" as const },
  ];

  const totalBuilt = brandBuilt + buildAuthorityBuilt + yieldBuilt;

  return (
    <div className="rounded-2xl bg-[#1A1A2E] p-6 lg:p-8 space-y-5">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-[#C4973B]" />
        <h3 className="text-lg font-heading font-bold text-white uppercase tracking-wide">
          Build My Author Business
        </h3>
      </div>

      <p className="text-sm text-white/70">
        One click. All your recommended products generated in 15-30 minutes.
        Abby's AI builders will create courses, workbooks, coaching packages,
        keynote scripts, and more — all from your book's content.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {categories.map((cat) => {
          const unlocked = hasTierAccess(tier, cat.requiredTier);
          return (
            <div
              key={cat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-center space-y-1"
            >
              <p className="text-xs font-semibold text-white">{cat.label}</p>
              <p className="text-[11px] text-white/50">{cat.total} products</p>
              {unlocked ? (
                <p className={`text-[11px] ${cat.built > 0 ? "text-[#0D9488]" : "text-white/40"}`}>
                  ✓ {cat.built} built
                </p>
              ) : (
                <p className="text-[11px] text-white/40 flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" /> {cat.requiredTier === "brand" ? "Brand" : cat.requiredTier === "build" ? "Build" : "Yield"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-white/50">
        For: {bookTitle} — {recommendedCount} products recommended by Abby
        {totalBuilt > 0 && ` · ${totalBuilt} built so far`}
      </p>

      <Button
        onClick={onBuild}
        className="w-full h-12 bg-[#C4973B] hover:bg-[#D4A843] text-white font-semibold text-sm"
      >
        <Zap className="h-4 w-4 mr-2" /> Build My Author Business →
      </Button>

      <p className="text-[11px] text-white/40 text-center">
        Products are generated as drafts. You review and approve before anything goes live.
      </p>
    </div>
  );
}
