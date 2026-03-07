import { useState, useEffect } from "react";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import type { SubscriptionTier } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe, ExternalLink, Copy, Lock, CheckCircle2, FileText,
  PlusCircle, Edit, ShoppingBag, Megaphone, Calendar, BookOpen,
  Palette, User, ArrowRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MicrositePage {
  id: string;
  name: string;
  description: string;
  icon: typeof Globe;
  requiredTier: SubscriptionTier;
  status: "live" | "draft" | "locked" | "not_created";
}

interface Props {
  onNavigate?: (section: string) => void;
}

export default function MicrositeManager({ onNavigate }: Props) {
  const { user, tier, isPremium } = useAuth();
  const [authorSlug, setAuthorSlug] = useState<string | null>(null);
  const [directoryStatus, setDirectoryStatus] = useState<string>("unlisted");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("author_profiles")
        .select("author_slug, directory_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAuthorSlug(data.author_slug);
        setDirectoryStatus(data.directory_status || "unlisted");
      }
    })();
  }, [user]);

  const isLive = ["listed", "verified", "featured"].includes(directoryStatus);
  const micrositeUrl = authorSlug ? `${window.location.origin}/authors/${authorSlug}` : null;

  const allPages: MicrositePage[] = [
    {
      id: "author-profile",
      name: "Author Profile Page",
      description: "Your public author page with photo, bio, books, and social links.",
      icon: User,
      requiredTier: "free",
      status: isLive ? "live" : (authorSlug ? "draft" : "not_created"),
    },
    {
      id: "product-page-1",
      name: "Product Sales Page",
      description: "A dedicated sales page for one of your digital products.",
      icon: ShoppingBag,
      requiredTier: "starter",
      status: hasTierAccess(tier, "starter") ? "not_created" : "locked",
    },
    {
      id: "landing-page",
      name: "Home / Landing Page",
      description: "A custom landing page with hero section, featured products, and lead capture.",
      icon: Globe,
      requiredTier: "pro",
      status: hasTierAccess(tier, "pro") ? "not_created" : "locked",
    },
    {
      id: "product-pages-unlimited",
      name: "Unlimited Product Sales Pages",
      description: "Create as many sales pages as you need for all your products.",
      icon: ShoppingBag,
      requiredTier: "pro",
      status: hasTierAccess(tier, "pro") ? "not_created" : "locked",
    },
    {
      id: "lead-magnet",
      name: "Free Resources / Lead Magnet Page",
      description: "Offer free downloads to capture email leads.",
      icon: Megaphone,
      requiredTier: "pro",
      status: hasTierAccess(tier, "pro") ? "not_created" : "locked",
    },
    {
      id: "coaching-services",
      name: "Coaching / Services Page",
      description: "Showcase your coaching packages and consulting services.",
      icon: FileText,
      requiredTier: "pro",
      status: hasTierAccess(tier, "pro") ? "not_created" : "locked",
    },
    {
      id: "events-page",
      name: "Events Page",
      description: "Manage and promote your retreats, webinars, and speaking events.",
      icon: Calendar,
      requiredTier: "enterprise",
      status: hasTierAccess(tier, "enterprise") ? "not_created" : "locked",
    },
    {
      id: "content-hub",
      name: "Blog / Content Hub",
      description: "Publish articles and book excerpts to build authority.",
      icon: BookOpen,
      requiredTier: "enterprise",
      status: hasTierAccess(tier, "enterprise") ? "not_created" : "locked",
    },
    {
      id: "custom-domain",
      name: "Custom Domain Support",
      description: "Use your own domain (e.g., yourname.com) for your microsite.",
      icon: Globe,
      requiredTier: "enterprise",
      status: hasTierAccess(tier, "enterprise") ? "not_created" : "locked",
    },
    {
      id: "white-label",
      name: "White-Label Option",
      description: "Remove Authors Bureau branding from your microsite.",
      icon: Palette,
      requiredTier: "enterprise",
      status: hasTierAccess(tier, "enterprise") ? "not_created" : "locked",
    },
  ];

  const tierLabel = (t: SubscriptionTier) => {
    if (t === "free") return "Free";
    if (t === "starter") return "Starter ($47/mo)";
    if (t === "pro") return "Pro ($197/mo)";
    return "Enterprise ($497/mo)";
  };

  const handleCopyUrl = () => {
    if (micrositeUrl) {
      navigator.clipboard.writeText(micrositeUrl);
      toast({ title: "URL copied to clipboard! 📋" });
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">Your Author Microsite</h2>
          {micrositeUrl ? (
            <div className="flex items-center gap-2 mt-1">
              <a
                href={micrositeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-secondary hover:underline flex items-center gap-1"
              >
                {micrositeUrl} <ExternalLink className="h-3 w-3" />
              </a>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopyUrl}>
                <Copy className="h-3 w-3" /> Share
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Set up your author profile to get your microsite URL.</p>
          )}
        </div>
        {!isLive && (
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-fit" onClick={() => onNavigate?.("profile")}>
            {authorSlug ? "Complete Your Profile" : "Set Up Your Microsite"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Status */}
      {isLive && (
        <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <p className="text-sm font-medium text-accent">Your microsite is live!</p>
        </div>
      )}

      {/* Page Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allPages.map((page) => {
          const isLocked = page.status === "locked";
          return (
            <Card
              key={page.id}
              className={`p-4 flex flex-col gap-3 transition-opacity ${isLocked ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isLocked ? "bg-muted" : "bg-secondary/10"
                }`}>
                  {isLocked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <page.icon className="h-4 w-4 text-secondary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-semibold text-sm">{page.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{page.description}</p>
                </div>
              </div>

              {/* Status badge */}
              <div>
                {page.status === "live" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Live
                  </span>
                )}
                {page.status === "draft" && (
                  <span className="inline-flex items-center rounded-full bg-secondary/15 text-secondary px-2 py-0.5 text-[10px] font-semibold">
                    📝 Draft
                  </span>
                )}
                {page.status === "locked" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">
                    <Lock className="h-3 w-3" /> Requires {tierLabel(page.requiredTier)}
                  </span>
                )}
                {page.status === "not_created" && (
                  <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">
                    ➕ Not Created Yet
                  </span>
                )}
              </div>

              {/* Action */}
              <div className="mt-auto pt-1">
                {page.status === "live" && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onNavigate?.("profile")}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
                {page.status === "draft" && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onNavigate?.("profile")}>
                    <Edit className="h-3 w-3 mr-1" /> Complete & Publish
                  </Button>
                )}
                {page.status === "not_created" && (
                  <Button size="sm" className="w-full text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <PlusCircle className="h-3 w-3 mr-1" /> Create
                  </Button>
                )}
                {page.status === "locked" && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onNavigate?.("overview")}>
                    Upgrade to {tierLabel(page.requiredTier).split(" ")[0]} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Microsite Stats Footer */}
      <Card className="p-4 border-border">
        <p className="text-sm text-muted-foreground">
          {isLive
            ? "Your microsite traffic data will appear in the Analytics tab once visitors start arriving."
            : "Set up your microsite to start tracking visits and leads."}
        </p>
      </Card>
    </div>
  );
}
