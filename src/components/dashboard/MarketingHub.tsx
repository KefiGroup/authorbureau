import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken } from "@/lib/get-active-token";
import { getBpBuildRoute } from "@/lib/bpRoutes";
import {
  Loader2, Megaphone, CheckCircle2, AlertCircle, Clock, Zap,
  RefreshCw, ArrowRight, Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { NODE_NAMES } from "@/lib/node-slug-map";

/* ─── Campaign / Node mapping ─── */

interface CampaignConfig {
  id: string;
  label: string;
  description: string;
  phase: "A" | "B";
  /** Node IDs that must be 'live' for this campaign to be "Ready to Activate" */
  nodeIds: string[];
  /** Edge functions to call when activating */
  deployFunctions: string[];
  successMessage: string;
  checklist: string[];
  /** Step-by-step instructions for users who haven't published yet */
  howToStart: { step: string; link?: string; linkLabel?: string }[];
}

const CAMPAIGNS: CampaignConfig[] = [
  {
    id: "email-marketing", label: "Email Marketing", phase: "A",
    description: "Welcome (7) + Nurture (14) + Launch (5) sequences + Automation",
    nodeIds: ["BP-01"],
    deployFunctions: ["deploy-bp01-to-ghl"],
    successMessage: "Your email marketing is running. New contacts will automatically receive your welcome sequence.",
    checklist: ["Welcome sequence active", "Nurture sequence queued", "Automation running"],
    howToStart: [
      { step: "Go to Brand Products and open Email Marketing", link: "BP-01", linkLabel: "Build Email Marketing →" },
      { step: "Let Abby generate your welcome, nurture, and launch sequences" },
      { step: "Review the emails and click 'Publish to My Site'" },
      { step: "Come back here and click 'Activate Now' to start sending" },
    ],
  },
  {
    id: "lead-magnets", label: "Lead Magnets", phase: "A",
    description: "Opt-in form + 3-email delivery + Lead automation",
    nodeIds: ["BP-02"],
    deployFunctions: ["deploy-bp02-to-ghl"],
    successMessage: "Your lead magnet funnel is live. Every new subscriber will automatically receive your free gift.",
    checklist: ["Opt-in funnel live", "Thank-you page active", "Lead automation running"],
    howToStart: [
      { step: "Go to Brand Products and open Lead Magnets", link: "BP-02", linkLabel: "Build Lead Magnets →" },
      { step: "Abby will design 3 irresistible free resources from your book" },
      { step: "Review your opt-in page and click 'Publish to My Site'" },
      { step: "Come back here and click 'Activate Now' to start capturing subscribers" },
    ],
  },
  {
    id: "social-media", label: "Social Media", phase: "A",
    description: "90-day content calendar delivered as daily reminders",
    nodeIds: ["BP-03"],
    deployFunctions: ["deploy-bp03-to-ghl"],
    successMessage: "Your 90-day social media calendar is active. Posts will go out automatically every day.",
    checklist: ["Content calendar scheduled", "First 7 days posted", "Remaining 83 days queued"],
    howToStart: [
      { step: "Go to Brand Products and open Social Media", link: "BP-03", linkLabel: "Build Social Media →" },
      { step: "Abby will create a 90-day content calendar from your book" },
      { step: "Review your posts and click 'Publish'" },
      { step: "Come back here and click 'Activate Now' to schedule your posts" },
    ],
  },
  {
    id: "website-microsite", label: "Website / Microsite", phase: "A",
    description: "Lead capture form + Author funnel pipeline",
    nodeIds: ["BP-04"],
    deployFunctions: ["deploy-bp04-to-ghl"],
    successMessage: "Your author website is now live and your lead capture funnel is running.",
    checklist: ["Website pages created", "Lead capture form active", "Author funnel pipeline live"],
    howToStart: [
      { step: "Go to Brand Products and open Website", link: "BP-04", linkLabel: "Open Website Builder →" },
      { step: "Abby will design your author website with Home, About, Book, and Contact pages" },
      { step: "Review your site and click 'Publish to My Site'" },
      { step: "Come back here and click 'Activate Now' to enable lead capture" },
    ],
  },
  {
    id: "webinars", label: "Webinars", phase: "A",
    description: "Registration form + Reminder + Follow-up campaigns + Funnel pipeline",
    nodeIds: ["BP-05"],
    deployFunctions: ["deploy-bp05-to-ghl"],
    successMessage: "Your webinar system is live. Registration is open and follow-up emails will fire automatically.",
    checklist: ["Registration page live", "Reminder emails scheduled", "Follow-up sequence active"],
    howToStart: [
      { step: "Go to Brand Products and open Webinars", link: "BP-05", linkLabel: "Build My Webinar →" },
      { step: "Abby will create your webinar topic, registration page, and follow-up emails" },
      { step: "Review everything and click 'Publish to My Site'" },
      { step: "Come back here and click 'Activate Now' to open registration" },
    ],
  },
  {
    id: "digital-products", label: "Digital Products", phase: "B",
    description: "Stripe payment links + purchase automations for all published products",
    nodeIds: ["BP-06", "BP-07", "BP-08", "BP-09"],
    deployFunctions: ["deploy-bp06-to-ghl", "deploy-bp07-to-ghl", "deploy-bp08-to-ghl", "deploy-bp09-to-ghl"],
    successMessage: "Your digital products are now for sale. Payment links are live and purchase automations are running.",
    checklist: ["Payment links created", "Product pipeline active", "Post-purchase automation running"],
    howToStart: [
      { step: "Build at least one digital product: Workbook, Home Study, Special Edition, or Book Sales", link: "/brand-products", linkLabel: "Go to Brand Products →" },
      { step: "Let Abby generate the product content from your book" },
      { step: "Review and click 'Publish to My Site' for each product" },
      { step: "Come back here and click 'Activate Now' to create payment links" },
    ],
  },
  {
    id: "build-authority", label: "Build Authority", phase: "B",
    description: "Campaigns for courses, memberships, podcasts, and affiliates",
    nodeIds: ["BA-10", "BA-11", "BA-12", "BA-13", "BA-14", "BA-15", "BA-16", "BA-17", "BA-18"],
    deployFunctions: [],
    successMessage: "Your authority-building campaigns are active and promoting your advanced products.",
    checklist: ["Campaign funnels live", "Audience targeting active", "Follow-up sequences running"],
    howToStart: [
      { step: "Go to Build Authority and create at least one product (Course, Audiobook, Membership, etc.)", link: "/build-authority", linkLabel: "Go to Build Authority →" },
      { step: "Let Abby generate the content from your book and expertise" },
      { step: "Review and click 'Publish to My Site'" },
      { step: "Come back here and click 'Activate Now' to start promoting" },
    ],
  },
  {
    id: "yield-revenue", label: "Yield Revenue", phase: "B",
    description: "High-ticket offer campaigns and premium pipeline",
    nodeIds: ["YR-19", "YR-20", "YR-21", "YR-22", "YR-23", "YR-24", "YR-25", "YR-26", "YR-27", "YR-28"],
    deployFunctions: [],
    successMessage: "Your premium offer campaigns are live and your high-ticket pipeline is running.",
    checklist: ["Premium funnels active", "High-ticket pipeline live", "Follow-up automation running"],
    howToStart: [
      { step: "Go to Yield Revenue and create at least one premium offer (Coaching, Speaking, Mastermind, etc.)", link: "/yield-revenue", linkLabel: "Go to Yield Revenue →" },
      { step: "Let Abby design your high-ticket packages and pricing" },
      { step: "Review and click 'Publish to My Site'" },
      { step: "Come back here and click 'Activate Now' to launch your premium pipeline" },
    ],
  },
];

/* ─── Status config ─── */

type CampaignStatus = "active" | "ready" | "pending" | "built" | "activating" | "failed";

const statusConfig: Record<CampaignStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  active:     { label: "Active ✓",           className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  ready:      { label: "Ready to Activate",  className: "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse", icon: Zap },
  built:      { label: "Activate / Connect", className: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Zap },
  pending:    { label: "Not Started",        className: "bg-muted text-muted-foreground border-border", icon: Clock },
  activating: { label: "Activating…",        className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Loader2 },
  failed:     { label: "Needs Attention",    className: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertCircle },
};

/* ─── Node data from DB ─── */

interface NodeRow {
  node_id: string;
  status: string;
  marketing_activated_at: string | null;
}

interface Props {
  onNavigate?: (section: string) => void;
}

export default function MarketingHub({ onNavigate }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [nodeRows, setNodeRows] = useState<NodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingCampaign, setActivatingCampaign] = useState<string | null>(null);
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);
  const [activatedCampaigns, setActivatedCampaigns] = useState<Set<string>>(new Set());
  const [firstBook, setFirstBook] = useState<{ id: string; title: string } | null>(null);

  const highlightRef = useRef<HTMLDivElement | null>(null);

  /* ─── Fetch author nodes ─── */
  const fetchNodes = useCallback(async () => {
    if (!user) return;
    try {
      let profileId: string | null = null;
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        profileId = profile.id;
      } else if (user.email) {
        // Shared-backend identity fallback: resolve via books.owner_email
        const { data: bookByEmail } = await supabase
          .from("books")
          .select("author_id")
          .eq("owner_email", user.email.toLowerCase())
          .limit(1)
          .maybeSingle();
        if (bookByEmail?.author_id) {
          const { data: profileByBook } = await supabase
            .from("author_profiles")
            .select("id")
            .eq("user_id", bookByEmail.author_id)
            .maybeSingle();
          if (profileByBook) profileId = profileByBook.id;
        }
      }
      if (profileId) setAuthorProfileId(profileId);

      if (profileId) {
        const { data } = await supabase
          .from("author_nodes")
          .select("node_id, status, marketing_activated_at")
          .eq("author_id", profileId);
        setNodeRows((data as NodeRow[]) || []);
      }

      // Fetch first book for book-aware routing
      if (user?.email) {
        const { data: booksForAuthor } = await supabase
          .from("books")
          .select("id, title")
          .eq("owner_email", user.email.toLowerCase())
          .limit(1);
        if (booksForAuthor && booksForAuthor.length > 0) {
          setFirstBook({ id: booksForAuthor[0].id, title: booksForAuthor[0].title });
        }
      }
    } catch (err) {
      console.error("Failed to fetch nodes:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  /* ─── Scroll to highlighted campaign ─── */
  useEffect(() => {
    if (highlightId && highlightRef.current && !loading) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [highlightId, loading]);

  /* ─── Derive campaign status ─── */
  const getCampaignStatus = (campaign: CampaignConfig): CampaignStatus => {
    if (activatingCampaign === campaign.id) return "activating";
    if (activatedCampaigns.has(campaign.id)) return "active";

    // Check if any node for this campaign has marketing_activated_at set
    const hasActivated = campaign.nodeIds.some(nid => {
      const row = nodeRows.find(r => r.node_id === nid);
      return row?.marketing_activated_at;
    });
    if (hasActivated) return "active";

    // Check if any node is live (published) but not yet marketing-activated
    const hasLive = campaign.nodeIds.some(nid => {
      const row = nodeRows.find(r => r.node_id === nid);
      return row?.status === "live" && !row?.marketing_activated_at;
    });
    if (hasLive) return "ready";

    // Check if any node is published_pending_ghl or content_ready — built but not yet activated
    const hasBuilt = campaign.nodeIds.some(nid => {
      const row = nodeRows.find(r => r.node_id === nid);
      return row?.status === "published_pending_ghl" || row?.status === "content_ready";
    });
    if (hasBuilt) return "built";

    // Check if any node is in progress (building)
    const hasBuilding = campaign.nodeIds.some(nid => {
      const row = nodeRows.find(r => r.node_id === nid);
      return row?.status === "building";
    });
    if (hasBuilding) return "pending";

    return "pending";
  };

  /* ─── Provision GHL if needed ─── */
  const ensureGhlProvisioned = async (): Promise<boolean> => {
    if (!authorProfileId) return false;
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("ghl_sub_account_id")
      .eq("id", authorProfileId)
      .single();

    if (profile?.ghl_sub_account_id) return true;

    // Need to provision
    const { data, error } = await supabase.functions.invoke("provision-ghl-subaccount", {
      body: { author_id: authorProfileId },
    });
    if (error || !data?.success) {
      const msg = data?.error || error?.message || "Unknown error";
      toast({
        title: "Could not connect to your marketing account",
        description: msg,
        variant: "destructive",
      });
      console.error("GHL provision failed:", msg);
      return false;
    }
    return true;
  };

  /* ─── Activate campaign ─── */
  const handleActivate = async (campaign: CampaignConfig) => {
    if (!authorProfileId) {
      toast({ title: "Profile not found", description: "Please set up your author profile first.", variant: "destructive" });
      return;
    }

    setActivatingCampaign(campaign.id);
    try {
      // Stage 4: ensure GHL sub-account exists
      const provisioned = await ensureGhlProvisioned();
      if (!provisioned) {
        setActivatingCampaign(null);
        return;
      }

      // Determine which deploy functions to call (only for nodes that are live)
      const liveNodeIds = campaign.nodeIds.filter(nid => {
        const row = nodeRows.find(r => r.node_id === nid);
        return row?.status === "live";
      });

      if (liveNodeIds.length === 0) {
        toast({ title: "No published content", description: "Please publish your content first in the node builder.", variant: "destructive" });
        setActivatingCampaign(null);
        return;
      }

      // Map live node IDs to their deploy functions
      const NODE_DEPLOY_MAP: Record<string, string> = {
        "BP-01": "deploy-bp01-to-ghl", "BP-02": "deploy-bp02-to-ghl",
        "BP-03": "deploy-bp03-to-ghl", "BP-04": "deploy-bp04-to-ghl",
        "BP-05": "deploy-bp05-to-ghl", "BP-06": "deploy-bp06-to-ghl",
        "BP-07": "deploy-bp07-to-ghl", "BP-08": "deploy-bp08-to-ghl",
        "BP-09": "deploy-bp09-to-ghl", "BA-10": "deploy-ba10-to-thinkific",
        "BA-11": "deploy-ba11-audiobook", "BA-12": "deploy-ba12-to-ghl",
        "BA-13": "deploy-ba13-to-ghl", "BA-14": "deploy-ba14-to-transistor",
        "BA-15": "deploy-ba15-to-ghl", "BA-16": "deploy-ba16-to-ghl",
        "BA-17": "deploy-ba17-to-ghl", "BA-18": "deploy-ba18-to-ghl",
        "YR-19": "deploy-yr19-to-ghl", "YR-20": "deploy-yr20-to-ghl",
        "YR-21": "deploy-yr21-to-ghl", "YR-22": "deploy-yr22-to-ghl",
        "YR-23": "deploy-yr23-to-ghl", "YR-24": "deploy-yr24-to-ghl",
        "YR-25": "deploy-yr25-to-thinkific", "YR-26": "deploy-yr26-to-ghl",
        "YR-27": "deploy-yr27-to-stripe", "YR-28": "deploy-yr28-to-ghl",
      };

      // Call deploy functions for each live node
      const results = await Promise.allSettled(
        liveNodeIds.map(async (nid) => {
          const fnName = NODE_DEPLOY_MAP[nid];
          if (!fnName) return;
          const { data, error } = await supabase.functions.invoke(fnName, {
            body: { author_id: authorProfileId },
          });
          if (error || !data?.success) {
            throw new Error(data?.error || error?.message || `${fnName} failed`);
          }
          // Mark marketing_activated_at
          await supabase
            .from("author_nodes")
            .update({ marketing_activated_at: new Date().toISOString() })
            .eq("author_id", authorProfileId)
            .eq("node_id", nid);
        })
      );

      const failures = results.filter(r => r.status === "rejected");
      if (failures.length > 0) {
        const firstErr = (failures[0] as PromiseRejectedResult).reason?.message || "Activation failed";
        toast({ title: "Some campaigns failed", description: firstErr, variant: "destructive" });
      }

      setActivatedCampaigns(prev => new Set([...prev, campaign.id]));
      toast({
        title: "🎉 Campaign activated!",
        description: campaign.successMessage,
      });
      await fetchNodes();
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setActivatingCampaign(null);
    }
  };

  /** Resolve a BP node ID to a book-aware dashboard route */
  const resolveBpLink = (nodeId: string): string => {
    return getBpBuildRoute(nodeId, firstBook ? { bookId: firstBook.id, bookTitle: firstBook.title } : undefined);
  };

  /* ─── Counts ─── */
  const activeCount = CAMPAIGNS.filter(c => getCampaignStatus(c) === "active").length;

  /* ─── Abby recommendation logic ─── */
  const getAbbyRecommendation = () => {
    const emailStatus = getCampaignStatus(CAMPAIGNS[0]);
    if (emailStatus !== "active") {
      return "I recommend starting with Email Marketing — it's the foundation that connects all your other campaigns. Once your welcome sequence is active, every new contact will automatically receive it.";
    }
    const readyCampaign = CAMPAIGNS.find(c => getCampaignStatus(c) === "ready");
    if (readyCampaign) {
      return `Your ${readyCampaign.label} is published and ready to go! Activate it now to start promoting automatically.`;
    }
    return `You have ${CAMPAIGNS.length - activeCount} campaigns left. Keep building and publishing to unlock more.`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Your Marketing Hub</h1>
        <p className="text-muted-foreground mt-1">
          Abby manages all your marketing campaigns automatically.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <Megaphone className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {activeCount} of {CAMPAIGNS.length} campaigns active
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${(activeCount / CAMPAIGNS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Abby's Guidance */}
      {activeCount < CAMPAIGNS.length && (
        <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Abby says:</span> {getAbbyRecommendation()}
          </p>
          {getCampaignStatus(CAMPAIGNS[0]) !== "active" && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => navigate(resolveBpLink("BP-01"))}
            >
              Build Email Marketing First <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Campaign list */}
      <div className="space-y-3">
        {CAMPAIGNS.map((campaign) => {
          const status = getCampaignStatus(campaign);
          const isHighlighted = highlightId === campaign.id;
          return (
            <CampaignRow
              key={campaign.id}
              ref={isHighlighted ? highlightRef : undefined}
              campaign={campaign}
              status={status}
              isHighlighted={isHighlighted}
              nodeRows={nodeRows}
              onActivate={() => handleActivate(campaign)}
              resolveBpLink={resolveBpLink}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─── Campaign Row ─── */

import { forwardRef } from "react";

const CampaignRow = forwardRef<HTMLDivElement, {
  campaign: CampaignConfig;
  status: CampaignStatus;
  isHighlighted: boolean;
  nodeRows: NodeRow[];
  onActivate: () => void;
  resolveBpLink: (nodeId: string) => string;
}>(({ campaign, status, isHighlighted, nodeRows, onActivate, resolveBpLink }, ref) => {
  const navigate = useNavigate();
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Show success panel for recently activated
  if (status === "active") {
    return (
      <div ref={ref} className="p-4 rounded-xl bg-card border border-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{campaign.label}</p>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active ✓
              </Badge>
            </div>
            <div className="space-y-1 mt-2">
              {campaign.checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {item}
                </div>
              ))}
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={onActivate}>
            <RefreshCw className="h-3 w-3 mr-1" /> Update
          </Button>
        </div>
      </div>
    );
  }

  // Highlighted "Ready to Activate" with ABBY tip
  const showAbbyTip = isHighlighted && status === "ready";
  const liveNodeNames = campaign.nodeIds
    .filter(nid => nodeRows.find(r => r.node_id === nid)?.status === "live")
    .map(nid => NODE_NAMES[nid] || nid);

  // Find the first howToStart step with a link for the CTA button
  const ctaStep = campaign.howToStart.find(s => s.link);

  return (
    <div
      ref={ref}
      className={`rounded-xl border transition-all ${
        isHighlighted ? "border-amber-400 ring-2 ring-amber-400/30 animate-pulse" :
        status === "ready" ? "border-amber-300 dark:border-amber-700" :
        "border-border"
      } bg-card`}
    >
      {/* ABBY tip for highlighted */}
      {showAbbyTip && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Your {liveNodeNames[0] || campaign.label} is published and ready. Click Activate to start promoting it automatically.
            </p>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{campaign.label}</p>
            <p className="text-xs text-muted-foreground truncate">{campaign.description}</p>
          </div>

          <Badge variant="outline" className={`shrink-0 text-[10px] ${config.className}`}>
            <StatusIcon className={`h-3 w-3 mr-1 ${status === "activating" ? "animate-spin" : ""}`} />
            {config.label}
          </Badge>

          <div className="shrink-0">
            {status === "ready" ? (
              <Button size="sm" onClick={onActivate} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                Activate Now <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ) : status === "built" ? (
              <Button size="sm" onClick={() => navigate("/account-settings?tab=connections")} className="text-xs">
                Connect & Activate <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ) : status === "activating" ? (
              <Button size="sm" disabled className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Setting up…
              </Button>
            ) : status === "failed" ? (
              <Button size="sm" variant="outline" className="text-xs border-red-500/20 text-red-600" onClick={onActivate}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            ) : null}
          </div>
        </div>

        {/* Step-by-step instructions for pending campaigns */}
        {status === "pending" && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">How to get started:</p>
            <ol className="space-y-1.5">
              {campaign.howToStart.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span>{item.step}</span>
                </li>
              ))}
            </ol>
            {ctaStep && (
              <Button
                size="sm"
                className="mt-3 w-full sm:w-auto"
                onClick={() => {
                  // howToStart links now store node IDs like "BP-01", resolve them
                  const link = ctaStep.link!;
                  const resolved = link.startsWith("BP-") ? resolveBpLink(link) : link;
                  navigate(resolved);
                }}
              >
                {ctaStep.linkLabel || "Get Started"} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

CampaignRow.displayName = "CampaignRow";
