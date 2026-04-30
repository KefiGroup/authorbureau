import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { callMarketingHubState } from "@/lib/marketing-hub-state";
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
import MarketingHubBookSelector from "./marketing-hub/MarketingHubBookSelector";
import { useMarketingHubBookContext } from "@/hooks/useMarketingHubBookContext";

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

/* ─── Archetype mapping (single source of truth — mirrors author_nodes.archetype) ─── */
type Archetype = "A" | "B" | "C" | "D";
type ArchetypeFilter = "ALL" | Archetype;

const NODE_ARCHETYPE: Record<string, Archetype> = {
  // A — Sales (direct purchase)
  "BP-06": "A", "BP-07": "A", "BP-08": "A", "BP-09": "A",
  "BA-10": "A", "BA-11": "A", "BA-12": "A", "BA-17": "A",
  // B — Opt-in (lead nurture)
  "BP-01": "B", "BP-02": "B", "BP-03": "B", "BP-04": "B", "BP-05": "B", "BA-14": "B",
  // C — Application (high-ticket qualification)
  "BA-13": "C", "YR-19": "C", "YR-20": "C", "YR-21": "C", "YR-22": "C", "YR-23": "C", "YR-25": "C",
  // D — Event (registrations / partnerships)
  "BA-15": "D", "BA-16": "D", "BA-18": "D", "YR-24": "D", "YR-26": "D", "YR-27": "D", "YR-28": "D",
};

const ARCHETYPE_TABS: { key: ArchetypeFilter; label: string; sub: string }[] = [
  { key: "ALL", label: "All Campaigns", sub: "Every channel" },
  { key: "A",   label: "Sales",         sub: "Direct purchase" },
  { key: "B",   label: "Opt-in",        sub: "Lead nurture" },
  { key: "C",   label: "Application",   sub: "High-ticket" },
  { key: "D",   label: "Event",         sub: "Registrations" },
];

/** Compute the dominant archetype for a campaign (most common across its nodes). */
function getCampaignArchetype(campaign: CampaignConfig): Archetype | null {
  const counts: Record<string, number> = {};
  for (const nid of campaign.nodeIds) {
    const a = NODE_ARCHETYPE[nid];
    if (a) counts[a] = (counts[a] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((x, y) => y[1] - x[1]);
  return entries[0][0] as Archetype;
}

/* ─── Status types ─── */

type NodeStatus = "not_built" | "draft" | "ready" | "active";

/**
 * Derive a node's marketing status. BP-03 has its own activation semantics:
 * it is active when the node is live AND social_posts exist for the author.
 * Other nodes are active when the underlying node is already live.
 */
function deriveNodeStatus(
  row: NodeRow | undefined,
  nodeId: string,
  bp03PostsCount: number,
): NodeStatus {
  if (!row || row.status === "locked") return "not_built";
  if (row.status === "draft") return "draft";

  if (nodeId === "BP-03") {
    if (row.status === "live" && bp03PostsCount > 0) return "active";
    if (row.status === "live" || row.status === "content_ready") return "ready";
    return "draft";
  }

  if (row.status === "live") return "active";
  if (row.status === "content_ready") return "ready";
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
  activated_at?: string | null;
  content_json: any;
}

interface Props {
  onNavigate?: (section: string) => void;
}

/** Extract a short text preview from content_json — never returns UUIDs or internal keys. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_KEYS = new Set([
  "book_id", "author_id", "node_id", "id",
  "_currentStep", "pending_connections", "publishChannels",
  "activated", "marketing_activated_at",
]);
const PREFERRED_KEYS = [
  "abby_summary", "tagline", "campaign_name", "funnel_name",
  "site_name", "membership_name", "practice_title", "list_name",
  "description", "summary", "headline", "intro",
];

function getContentPreview(contentJson: any): string {
  if (!contentJson) return "";
  try {
    const obj = typeof contentJson === "string" ? JSON.parse(contentJson) : contentJson;
    if (!obj || typeof obj !== "object") return "";
    const isRenderableString = (v: unknown): v is string =>
      typeof v === "string" && v.length > 0 && !UUID_RE.test(v.trim());

    for (const key of PREFERRED_KEYS) {
      if (isRenderableString(obj[key])) {
        const s = obj[key] as string;
        return s.slice(0, 100) + (s.length > 100 ? "…" : "");
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_KEYS.has(k)) continue;
      if (isRenderableString(v) && (v as string).length > 10) {
        const s = v as string;
        return s.slice(0, 100) + (s.length > 100 ? "…" : "");
      }
    }
  } catch { /* ignore */ }
  return "";
}

export default function MarketingHub({ onNavigate }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const tabParam = searchParams.get("tab");
  const VALID_TABS = ["overview", "sequences", "social-calendar", "contacts", "settings"] as const;
  const initialTab = (VALID_TABS as readonly string[]).includes(tabParam || "")
    ? (tabParam as string)
    : "overview";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sync from URL whenever it changes (e.g. deep-link from BP-03 success screen)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && (VALID_TABS as readonly string[]).includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (next: string) => {
    setActiveTab(next);
    const sp = new URLSearchParams(searchParams);
    if (next === "overview") sp.delete("tab");
    else sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  const [nodeRows, setNodeRows] = useState<NodeRow[]>([]);
  const [bp03PostsCount, setBp03PostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activatingCampaign, setActivatingCampaign] = useState<string | null>(null);
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [crossCounts, setCrossCounts] = useState<{
    sequences: number;
    socialQueued: number;
    contacts: number;
    domainPending: boolean;
  }>({ sequences: 0, socialQueued: 0, contacts: 0, domainPending: false });

  const highlightRef = useRef<HTMLDivElement | null>(null);

  /* ─── Fetch author nodes ─── */
  const fetchNodes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snapshot = await callMarketingHubState<{
        author_profile_id: string;
        node_rows: NodeRow[];
        bp03_posts_count: number;
        lead_count: number;
        cross_counts: {
          sequences: number;
          socialQueued: number;
          contacts: number;
          domainPending: boolean;
        };
      }>("snapshot");

      setAuthorProfileId(snapshot.author_profile_id || null);
      setNodeRows(snapshot.node_rows || []);
      setBp03PostsCount(snapshot.bp03_posts_count || 0);
      setCrossCounts(snapshot.cross_counts || { sequences: 0, socialQueued: 0, contacts: 0, domainPending: false });

      // Per-campaign lead attribution: group crm_contacts by last_node_id.
      // Falls back to global count under the "all" key for the header stat.
      const counts: Record<string, number> = { all: snapshot.lead_count || 0 };
      try {
        const { data: contacts } = await supabase
          .from("crm_contacts")
          .select("last_node_id")
          .eq("author_id", user.id);
        for (const row of contacts || []) {
          const nid = (row as any).last_node_id as string | null;
          if (nid) counts[nid] = (counts[nid] || 0) + 1;
        }
      } catch (e) {
        console.warn("[MarketingHub] per-campaign lead attribution failed", e);
      }
      setLeadCounts(counts);
    } catch (err) {
      console.error("Failed to fetch nodes:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const [archetypeFilter, setArchetypeFilter] = useState<ArchetypeFilter>("ALL");

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
    const statuses = campaign.nodeIds.map(nid =>
      deriveNodeStatus(nodeRows.find(r => r.node_id === nid), nid, bp03PostsCount),
    );
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
      // BP-03 has its own activation semantics: rebuild social_posts via repair_calendar.
      if (campaign.id === "social-media") {
        const bp03Row = nodeRows.find(r => r.node_id === "BP-03");
        if (!bp03Row || !["live", "content_ready"].includes(bp03Row.status)) {
          toast({
            title: "Build your kit first",
            description: "Open the Social Media builder and generate your starter kit before activating.",
            variant: "destructive",
          });
          navigate("/node-builder/BP-03");
          return;
        }

        const token = await getActiveToken();
        if (!token) {
          toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
          return;
        }
        const res = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bp03-node-state`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: "repair_calendar", author_id: authorProfileId }),
          },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          toast({
            title: "Activation failed",
            description: json?.error || "We couldn't rebuild your Social Calendar. Please open BP-03 and try again.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "🎉 Social Media activated!",
          description: `${json.saved || 0} posts added to your Social Calendar.`,
        });
        await fetchNodes();
        return;
      }

      const liveNodeIds = campaign.nodeIds.filter(nid => {
        const row = nodeRows.find(r => r.node_id === nid);
        return row?.status === "live" && !row?.marketing_activated_at;
      });

      if (liveNodeIds.length === 0) {
        toast({ title: "No content ready", description: "Publish your content in Brand Products first.", variant: "destructive" });
        setActivatingCampaign(null);
        return;
      }

      const result = await callMarketingHubState<{ success: boolean; error?: string }>(
        "activate_node",
        { node_ids: liveNodeIds },
      );

      if (!result.success) {
        toast({ title: "Activation failed", description: result.error || "Please refresh and try again.", variant: "destructive" });
      } else {
        toast({ title: "🎉 Campaign activated!", description: campaign.successMessage });
      }
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
      // For BP-03, "pause" means clearing the calendar's ready/draft posts.
      if (campaign.id === "social-media") {
        await supabase
          .from("social_posts" as any)
          .delete()
          .eq("author_id", authorProfileId)
          .eq("node_id", "BP-03")
          .in("status", ["draft", "ready"]);
        toast({ title: "Campaign paused", description: "Social Calendar cleared. Re-activate anytime to refill it." });
        await fetchNodes();
        return;
      }

      await callMarketingHubState("pause_node", { node_ids: campaign.nodeIds });
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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

          {/* Cross-tab nudges — quick jumps so each tab is discoverable */}
          {(crossCounts.sequences > 0 || crossCounts.socialQueued > 0 || crossCounts.contacts > 0 || crossCounts.domainPending) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {crossCounts.sequences > 0 && (
                <button
                  onClick={() => handleTabChange("sequences")}
                  className="text-left rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                >
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sequences</p>
                  <p className="text-sm font-medium mt-0.5">{crossCounts.sequences} email flow{crossCounts.sequences === 1 ? "" : "s"}</p>
                  <p className="text-[11px] text-primary mt-1 inline-flex items-center">View <ArrowRight className="h-3 w-3 ml-0.5" /></p>
                </button>
              )}
              {crossCounts.socialQueued > 0 && (
                <button
                  onClick={() => handleTabChange("social-calendar")}
                  className="text-left rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                >
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Social Calendar</p>
                  <p className="text-sm font-medium mt-0.5">{crossCounts.socialQueued} post{crossCounts.socialQueued === 1 ? "" : "s"} queued</p>
                  <p className="text-[11px] text-primary mt-1 inline-flex items-center">Open <ArrowRight className="h-3 w-3 ml-0.5" /></p>
                </button>
              )}
              {crossCounts.contacts > 0 && (
                <button
                  onClick={() => handleTabChange("contacts")}
                  className="text-left rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                >
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Contacts</p>
                  <p className="text-sm font-medium mt-0.5">{crossCounts.contacts} lead{crossCounts.contacts === 1 ? "" : "s"} captured</p>
                  <p className="text-[11px] text-primary mt-1 inline-flex items-center">View <ArrowRight className="h-3 w-3 ml-0.5" /></p>
                </button>
              )}
              {crossCounts.domainPending && (
                <button
                  onClick={() => handleTabChange("settings")}
                  className="text-left rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 hover:border-amber-500/60 transition-colors"
                >
                  <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Sender Domain</p>
                  <p className="text-sm font-medium mt-0.5">Verification pending</p>
                  <p className="text-[11px] text-amber-700 mt-1 inline-flex items-center">Settings <ArrowRight className="h-3 w-3 ml-0.5" /></p>
                </button>
              )}
            </div>
          )}

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
                  onClick={() => navigate("/node-builder/BP-04")}
                >
                  Start with Your Website <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Archetype filter pills — view campaigns grouped by funnel archetype */}
          <div className="flex flex-wrap gap-2">
            {ARCHETYPE_TABS.map((t) => {
              const active = archetypeFilter === t.key;
              const count = t.key === "ALL"
                ? CAMPAIGNS.length
                : CAMPAIGNS.filter(c => getCampaignArchetype(c) === t.key).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setArchetypeFilter(t.key)}
                  className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all ${
                    active
                      ? "bg-secondary text-secondary-foreground border-secondary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-secondary/40 hover:text-foreground"
                  }`}
                >
                  <span className={`text-[12px] font-bold ${active ? "" : "text-foreground"}`}>
                    {t.label} <span className="opacity-70 font-normal">({count})</span>
                  </span>
                  <span className="text-[10px] opacity-80">{t.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Campaign list */}
          <div className="space-y-3">
            {CAMPAIGNS
              .filter(c => archetypeFilter === "ALL" || getCampaignArchetype(c) === archetypeFilter)
              .map((campaign) => {
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
                    totalLeads={campaign.nodeIds.reduce((sum, nid) => sum + (leadCounts[nid] || 0), 0)}
                    onActivate={() => handleActivate(campaign)}
                    onPause={() => handlePause(campaign)}
                  />
                );
              })}
            {CAMPAIGNS.filter(c => archetypeFilter === "ALL" || getCampaignArchetype(c) === archetypeFilter).length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No campaigns in this archetype yet.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          <SequencesTab />
        </TabsContent>

        <TabsContent value="social-calendar" className="mt-6">
          <SocialCalendarTab authorId={authorProfileId} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsTab authorId={user?.id ?? null} />
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

  // Activation date — guard against rendering raw UUID/garbage if column holds non-date data.
  const parseDate = (v: string | null | undefined) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const activatedDate = parseDate(firstNodeRow?.marketing_activated_at) || parseDate(firstNodeRow?.activated_at);
  const activatedAt = activatedDate
    ? activatedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => navigate(`/node-builder/${campaign.nodeIds[0]}`)}
              >
                <Hammer className="h-3 w-3 mr-1" /> Build {campaign.label}
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
        {status === "active" && (
          <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>
              {activatedAt ? `Activated ${activatedAt}` : "Activated"} ·{" "}
              {totalLeads > 0
                ? `${totalLeads} lead${totalLeads === 1 ? "" : "s"} from this campaign`
                : "No leads from this campaign yet"}
            </span>
          </div>
        )}

        {/* Not built — single line guidance */}
        {status === "not_built" && (
          <p className="text-xs text-muted-foreground mt-2">
            Build this first in{" "}
            <button
              onClick={() => navigate(`/node-builder/${campaign.nodeIds[0]}`)}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              the {campaign.label} builder
            </button>
          </p>
        )}
      </div>
    </div>
  );
});

CampaignRow.displayName = "CampaignRow";
