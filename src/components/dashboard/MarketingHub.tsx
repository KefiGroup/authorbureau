import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, Megaphone, CheckCircle2, Clock, Zap,
  ArrowRight, Sparkles, PauseCircle, FileText, Hammer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import SequencesTab from "./marketing-hub/SequencesTab";
import SocialCalendarTab from "./marketing-hub/SocialCalendarTab";
import ContactsTab from "./marketing-hub/ContactsTab";
import SettingsTab from "./marketing-hub/SettingsTab";

/* ─── Campaign / Node mapping ─── */

interface CampaignConfig {
  id: string;
  label: string;
  description: string;
  phase: "A" | "B";
  nodeIds: string[];
  successMessage: string;
}

const CAMPAIGNS: CampaignConfig[] = [
  {
    id: "email-marketing", label: "Email Marketing", phase: "A",
    description: "Welcome + Nurture + Launch sequences & automation",
    nodeIds: ["BP-01"],
    successMessage: "Your email marketing is running. New contacts will automatically receive your welcome sequence.",
  },
  {
    id: "lead-magnets", label: "Lead Magnets", phase: "A",
    description: "Opt-in form + delivery emails + lead automation",
    nodeIds: ["BP-02"],
    successMessage: "Your lead magnet is live! Every new subscriber will automatically receive your free gift.",
  },
  {
    id: "social-media", label: "Social Media", phase: "A",
    description: "20 posts across LinkedIn, Instagram, Facebook & X — copy, post, mark done",
    nodeIds: ["BP-03"],
    successMessage: "Your Social Media Kit is in the Social Calendar — copy and post when you're ready.",
  },
  {
    id: "website-microsite", label: "Author's Page", phase: "A",
    description: "Lead capture form + author funnel pipeline",
    nodeIds: ["BP-04"],
    successMessage: "Your author website is now live and your lead capture funnel is running.",
  },
  {
    id: "webinars", label: "Webinars", phase: "A",
    description: "Registration + reminders + follow-up campaigns",
    nodeIds: ["BP-05"],
    successMessage: "Your webinar system is live. Registration is open and follow-ups will fire automatically.",
  },
  {
    id: "digital-products", label: "Digital Products", phase: "B",
    description: "Payment links + purchase automations for all published products",
    nodeIds: ["BP-06", "BP-07", "BP-08", "BP-09"],
    successMessage: "Your digital products are now for sale. Payment links are live.",
  },
  {
    id: "build-authority", label: "Build Authority", phase: "B",
    description: "Campaigns for courses, memberships, podcasts, and affiliates",
    nodeIds: ["BA-10", "BA-11", "BA-12", "BA-13", "BA-14", "BA-15", "BA-16", "BA-17", "BA-18"],
    successMessage: "Your authority-building campaigns are active.",
  },
  {
    id: "yield-revenue", label: "Yield Revenue", phase: "B",
    description: "High-ticket offer campaigns and premium pipeline",
    nodeIds: ["YR-19", "YR-20", "YR-21", "YR-22", "YR-23", "YR-24", "YR-25", "YR-26", "YR-27", "YR-28"],
    successMessage: "Your premium offer campaigns are live.",
  },
];

/* ─── Status types ─── */

type NodeStatus = "not_built" | "draft" | "ready" | "active";

function deriveNodeStatus(row: NodeRow | undefined): NodeStatus {
  if (!row || row.status === "locked") return "not_built";
  if (row.status === "draft") return "draft";
  if (row.status === "content_ready") return "ready";
  if (row.status === "live" && row.marketing_activated_at) return "active";
  if (row.status === "live") return "ready";
  return "not_built";
}

const statusBadgeConfig: Record<NodeStatus, { label: string; className: string }> = {
  not_built: { label: "Not Built", className: "bg-muted text-muted-foreground border-border" },
  draft:     { label: "Draft",     className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  ready:     { label: "Ready to Activate", className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  active:    { label: "Active",    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

const statusIcon: Record<NodeStatus, typeof CheckCircle2> = {
  not_built: Clock,
  draft: FileText,
  ready: Zap,
  active: CheckCircle2,
};

/* ─── Node data from DB ─── */

interface NodeRow {
  node_id: string;
  status: string;
  marketing_activated_at: string | null;
  content_json: any;
}

interface Props {
  onNavigate?: (section: string) => void;
}

/** Extract a short text preview from content_json */
function getContentPreview(contentJson: any): string {
  if (!contentJson) return "";
  try {
    const obj = typeof contentJson === "string" ? JSON.parse(contentJson) : contentJson;
    // Try common fields
    for (const key of ["description", "summary", "title", "headline", "intro", "content"]) {
      if (typeof obj[key] === "string" && obj[key].length > 0) {
        return obj[key].slice(0, 100) + (obj[key].length > 100 ? "…" : "");
      }
    }
    // Try first string value
    for (const val of Object.values(obj)) {
      if (typeof val === "string" && val.length > 10) {
        return (val as string).slice(0, 100) + ((val as string).length > 100 ? "…" : "");
      }
    }
  } catch { /* ignore */ }
  return "";
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
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});

  const highlightRef = useRef<HTMLDivElement | null>(null);

  /* ─── Fetch author nodes ─── */
  const fetchNodes = useCallback(async () => {
    if (!user) return;
    try {
      let profileId: string | null = null;
      let authorSlug: string | null = null;
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, author_slug")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        profileId = profile.id;
        authorSlug = profile.author_slug;
      } else {
        const { data: sp } = await sharedSupabase
          .from("author_profiles")
          .select("id, author_slug")
          .eq("user_id", user.id)
          .maybeSingle();
        if (sp) {
          profileId = sp.id;
          authorSlug = (sp as any).author_slug || null;
        }
      }
      if (profileId) setAuthorProfileId(profileId);

      if (profileId) {
        const { data } = await supabase
          .from("author_nodes")
          .select("node_id, status, marketing_activated_at, content_json")
          .eq("author_id", profileId);
        const rows = (data as NodeRow[]) || [];

        // Synthesize BP-01 row if author has a live public profile but no BP-01 node
        if (authorSlug && !rows.find(r => r.node_id === "BP-01")) {
          rows.push({
            node_id: "BP-01",
            status: "live",
            marketing_activated_at: null,
            content_json: { microsite_url: `https://authorsbureau.com/${authorSlug}` },
          });
        }

        setNodeRows(rows);

        // Fetch lead counts
        const { data: leads } = await supabase
          .from("leads")
          .select("source")
          .eq("author_id", profileId);
        if (leads) {
          const counts: Record<string, number> = {};
          leads.forEach(() => {
            counts["all"] = (counts["all"] || 0) + 1;
          });
          setLeadCounts(counts);
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

  /* ─── Derive campaign status (worst-state for grouped) ─── */
  const getCampaignStatus = (campaign: CampaignConfig): NodeStatus => {
    if (activatingCampaign === campaign.id) return "ready"; // show as ready while activating
    const statuses = campaign.nodeIds.map(nid => deriveNodeStatus(nodeRows.find(r => r.node_id === nid)));
    if (statuses.every(s => s === "active")) return "active";
    if (statuses.some(s => s === "active" || s === "ready")) return "ready";
    if (statuses.some(s => s === "draft")) return "draft";
    return "not_built";
  };

  /* ─── Activate campaign ─── */
  const handleActivate = async (campaign: CampaignConfig) => {
    if (!authorProfileId) {
      toast({ title: "Profile not found", description: "Please set up your author profile first.", variant: "destructive" });
      return;
    }

    setActivatingCampaign(campaign.id);
    try {
      const liveNodeIds = campaign.nodeIds.filter(nid => {
        const row = nodeRows.find(r => r.node_id === nid);
        return row?.status === "live" && !row?.marketing_activated_at;
      });

      if (liveNodeIds.length === 0) {
        toast({ title: "No content ready", description: "Publish your content in Brand Products first.", variant: "destructive" });
        setActivatingCampaign(null);
        return;
      }

      await Promise.all(
        liveNodeIds.map(nid =>
          supabase
            .from("author_nodes")
            .update({ marketing_activated_at: new Date().toISOString() })
            .eq("author_id", authorProfileId)
            .eq("node_id", nid)
        )
      );

      toast({ title: "🎉 Campaign activated!", description: campaign.successMessage });
      await fetchNodes();
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setActivatingCampaign(null);
    }
  };

  /* ─── Pause campaign ─── */
  const handlePause = async (campaign: CampaignConfig) => {
    if (!authorProfileId) return;
    try {
      await Promise.all(
        campaign.nodeIds.map(nid =>
          supabase
            .from("author_nodes")
            .update({ marketing_activated_at: null })
            .eq("author_id", authorProfileId)
            .eq("node_id", nid)
        )
      );
      toast({ title: "Campaign paused", description: `${campaign.label} has been paused.` });
      await fetchNodes();
    } catch (err: any) {
      toast({ title: "Failed to pause", description: err.message, variant: "destructive" });
    }
  };

  /* ─── Counts ─── */
  const activeCount = CAMPAIGNS.filter(c => getCampaignStatus(c) === "active").length;
  const totalLeads = leadCounts["all"] || 0;

  /* ─── Abby recommendation ─── */
  const getAbbyRecommendation = () => {
    const allNotBuilt = CAMPAIGNS.slice(0, 5).every(c => getCampaignStatus(c) === "not_built");
    if (allNotBuilt) {
      return "Head to Brand Products to start building your marketing assets with ABBY. Once they're published, come back here to activate your campaigns.";
    }
    const readyCampaign = CAMPAIGNS.find(c => getCampaignStatus(c) === "ready");
    if (readyCampaign) {
      return `Your ${readyCampaign.label} content is ready! Activate it now to start promoting automatically.`;
    }
    const draftCampaign = CAMPAIGNS.find(c => getCampaignStatus(c) === "draft");
    if (draftCampaign) {
      return `Your ${draftCampaign.label} content is in draft. Review and approve it in the node builder, then come back to activate.`;
    }
    if (activeCount === CAMPAIGNS.length) {
      return "All campaigns are active! ABBY is managing everything for you. 🎉";
    }
    return `You have ${activeCount} active campaigns. Keep building in Brand Products to unlock more.`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Your Marketing Hub</h1>
        <p className="text-muted-foreground mt-1">
          Activate campaigns, manage email sequences, and track every contact in one place.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="social-calendar">Social Calendar</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats bar */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <Megaphone className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {activeCount} of {CAMPAIGNS.length} campaigns active{totalLeads > 0 ? ` · ${totalLeads} leads captured` : ""}
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
              {CAMPAIGNS.slice(0, 5).every(c => getCampaignStatus(c) === "not_built") && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/brand-products")}
                >
                  Go to Brand Products <ArrowRight className="ml-1 h-3 w-3" />
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
                  isActivating={activatingCampaign === campaign.id}
                  totalLeads={totalLeads}
                  onActivate={() => handleActivate(campaign)}
                  onPause={() => handlePause(campaign)}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          <SequencesTab authorId={authorProfileId} />
        </TabsContent>

        <TabsContent value="social-calendar" className="mt-6">
          <SocialCalendarTab authorId={authorProfileId} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsTab authorId={authorProfileId} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab authorId={authorProfileId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Campaign Row ─── */

const CampaignRow = forwardRef<HTMLDivElement, {
  campaign: CampaignConfig;
  status: NodeStatus;
  isHighlighted: boolean;
  nodeRows: NodeRow[];
  isActivating: boolean;
  totalLeads: number;
  onActivate: () => void;
  onPause: () => void;
}>(({ campaign, status, isHighlighted, nodeRows, isActivating, totalLeads, onActivate, onPause }, ref) => {
  const navigate = useNavigate();
  const badge = statusBadgeConfig[status];
  const Icon = statusIcon[status];

  // Content preview for draft/ready/active
  const firstNodeRow = nodeRows.find(r => campaign.nodeIds.includes(r.node_id));
  const preview = status !== "not_built" ? getContentPreview(firstNodeRow?.content_json) : "";

  // Activation date
  const activatedAt = firstNodeRow?.marketing_activated_at
    ? new Date(firstNodeRow.marketing_activated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const borderClass = isHighlighted
    ? "border-amber-400 ring-2 ring-amber-400/30"
    : status === "active"
    ? "border-emerald-500/20"
    : status === "ready"
    ? "border-yellow-500/20"
    : "border-border";

  return (
    <div ref={ref} className={`rounded-xl border transition-all bg-card ${borderClass}`}>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium truncate">{campaign.label}</p>
              <Badge variant="outline" className={`shrink-0 text-[10px] ${badge.className}`}>
                <Icon className="h-3 w-3 mr-1" /> {badge.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{campaign.description}</p>
          </div>

          <div className="shrink-0">
            {isActivating ? (
              <Button size="sm" disabled className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Activating…
              </Button>
            ) : status === "not_built" ? (
              <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/brand-products")}>
                <Hammer className="h-3 w-3 mr-1" /> Build in Brand Products
              </Button>
            ) : status === "draft" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-amber-500/30 text-amber-700"
                onClick={() => {
                  const nodeId = campaign.nodeIds[0];
                  navigate(`/node-builder/${nodeId}`);
                }}
              >
                <FileText className="h-3 w-3 mr-1" /> Review & Approve
              </Button>
            ) : status === "ready" ? (
              <Button size="sm" onClick={onActivate} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <Sparkles className="h-3 w-3 mr-1" /> Activate Campaign
              </Button>
            ) : status === "active" ? (
              <Button size="sm" variant="outline" onClick={onPause} className="text-xs">
                <PauseCircle className="h-3 w-3 mr-1" /> Pause Campaign
              </Button>
            ) : null}
          </div>
        </div>

        {/* Content preview for draft/ready/active */}
        {preview && status !== "not_built" && (
          <p className="text-xs text-muted-foreground/70 mt-2 italic truncate">"{preview}"</p>
        )}

        {/* Active stats row */}
        {status === "active" && activatedAt && (
          <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>Activated {activatedAt} · {totalLeads} leads captured</span>
          </div>
        )}

        {/* Not built — single line guidance */}
        {status === "not_built" && (
          <p className="text-xs text-muted-foreground mt-2">
            Build this first in{" "}
            <button
              onClick={() => navigate("/brand-products")}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Brand Products
            </button>
          </p>
        )}
      </div>
    </div>
  );
});

CampaignRow.displayName = "CampaignRow";
