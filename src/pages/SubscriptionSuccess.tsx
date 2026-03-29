import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, TIERS } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, ArrowRight, PartyPopper } from "lucide-react";

const TIER_UNLOCKS = {
  starter: {
    label: TIERS.brand.label,
    nodes: ["Email Marketing", "Lead Magnets", "Social Media", "Website / Microsite", "Webinars", "Workbook", "Home Study Course", "Special Editions", "Book Sales"],
    hub: "/brand-products",
    hubLabel: "Go to Brand Products",
  },
  pro: {
    label: TIERS.build.label,
    nodes: ["All Brand Products", "Online Course", "Audiobook", "Membership Site", "Group Coaching", "Podcast", "Media & PR", "Affiliate Programme", "Upsells & Bundles", "JV Partnerships"],
    hub: "/build-authority",
    hubLabel: "Go to Build Authority",
  },
  enterprise: {
    label: TIERS.yield.label,
    nodes: ["All Brand Products + Build Authority", "1-on-1 Coaching", "Big Ticket Offers", "Keynote Speaking", "Corporate Training", "Mastermind", "Retreats", "Certification Program", "Conferences", "Fundraising", "Exhibitors & Sponsors"],
    hub: "/yield-revenue",
    hubLabel: "Go to Yield Revenue",
  },
};

export default function SubscriptionSuccess() {
  const { checkSubscription, tier } = useAuth();
  const [searchParams] = useSearchParams();
  const [refreshed, setRefreshed] = useState(false);

  // Auto-refresh subscription on mount
  useEffect(() => {
    checkSubscription().then(() => setRefreshed(true));
  }, [checkSubscription]);

  // Determine tier from query param or current state
  const tierParam = searchParams.get("tier") as keyof typeof TIER_UNLOCKS | null;
  const resolvedTier = tierParam && TIER_UNLOCKS[tierParam] ? tierParam : (tier !== "free" ? tier as keyof typeof TIER_UNLOCKS : "brand");
  const info = TIER_UNLOCKS[resolvedTier] || TIER_UNLOCKS.starter;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="font-heading text-3xl font-bold mb-3">
          Welcome to the {info.label}!
        </h1>
        <p className="text-muted-foreground mb-8">
          Your nodes are now unlocked. Here's what you can start building:
        </p>

        <div className="text-left bg-card border border-border rounded-xl p-6 mb-8">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            What's Unlocked
          </h3>
          <ul className="space-y-2">
            {info.nodes.map((node, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{node}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-full">
            <Link to={info.hub}>
              {info.hubLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
