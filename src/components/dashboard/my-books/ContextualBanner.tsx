import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, CreditCard, ClipboardList, Rocket } from "lucide-react";

interface ContextualBannerProps {
  priority: 1 | 2 | 3 | 4 | 5;
  bookTitle?: string;
  revenueRange?: string;
  pendingReviewCount?: number;
  productsBuilt?: number;
  totalProducts?: number;
  onAction: () => void;
}

export default function ContextualBanner({
  priority, bookTitle, revenueRange, pendingReviewCount, productsBuilt, totalProducts, onAction,
}: ContextualBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const configs: Record<number, {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    cta: string;
    bg: string;
    border: string;
    dismissible: boolean;
  }> = {
    1: {
      icon: <Sparkles className="h-5 w-5 text-[#C4973B]" />,
      title: "Your business plan is ready! Subscribe to unlock the AI builders that turn your plan into real products — automatically.",
      subtitle: revenueRange ? `Revenue potential: ${revenueRange}` : "",
      cta: "Subscribe Now →",
      bg: "bg-gradient-to-r from-[#FDF6E9] to-[#FEF3C7] border-[#E8D5A8]",
      border: "border",
      dismissible: false,
    },
    2: {
      icon: <CreditCard className="h-5 w-5 text-[#6366F1]" />,
      title: "Connect your Stripe account to start accepting payments",
      subtitle: "This takes about 2 minutes. Stripe handles everything securely.",
      cta: "Connect Stripe →",
      bg: "bg-card border-l-4 border-l-[#6366F1] border border-border",
      border: "",
      dismissible: true,
    },
    3: {
      icon: <Sparkles className="h-5 w-5 text-[#C4973B]" />,
      title: `Abby says: "${bookTitle || "Your book"}" is waiting for me — let me analyze this book and map its revenue streams. It's free and takes 2 minutes.`,
      subtitle: "",
      cta: "Analyze with Abby →",
      bg: "bg-gradient-to-r from-[#FDF6E9] to-[#FEF3C7] border-[#E8D5A8]",
      border: "border",
      dismissible: false,
    },
    4: {
      icon: <ClipboardList className="h-5 w-5 text-[#0D9488]" />,
      title: `You have ${pendingReviewCount || 0} products ready for review. Review and publish them to make them live on your microsite.`,
      subtitle: "",
      cta: "Review Products →",
      bg: "bg-card border-l-4 border-l-[#0D9488] border border-border",
      border: "",
      dismissible: false,
    },
    5: {
      icon: <Rocket className="h-5 w-5 text-[#0D9488]" />,
      title: `You're on track! ${productsBuilt || 0} of ${totalProducts || 0} products built. Keep building to unlock your full revenue potential${revenueRange ? ` of ${revenueRange}` : ""}.`,
      subtitle: "",
      cta: "Continue Building →",
      bg: "bg-card border-l-4 border-l-[#0D9488] border border-border",
      border: "",
      dismissible: false,
    },
  };

  const config = configs[priority];

  return (
    <div className={`rounded-xl p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{config.title}</p>
          {config.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={onAction} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs h-8">
            {config.cta}
          </Button>
          {config.dismissible && (
            <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
