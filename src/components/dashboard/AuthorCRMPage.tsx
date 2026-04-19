import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Users, UserPlus, X, TrendingUp, Upload, Download, ArrowRight,
  Layers, List, Star, Target, DollarSign,
} from "lucide-react";
import ContactForm from "./crm/ContactForm";
import PipelineView from "@/components/crm/PipelineView";
import ContactListView from "@/components/crm/ContactListView";
import AbbyIntelligenceView from "@/components/crm/AbbyIntelligenceView";
import ContactDetailPanel from "@/components/crm/ContactDetailPanel";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { supabase } from "@/integrations/supabase/client";

interface CRMContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string;
  stage: string;
  abby_score: number;
  last_activity_at: string | null;
  created_at: string;
  tags: string[];
}

interface Props {
  onNavigate?: (section: string) => void;
}

const CRM_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/author-crm-data`;

async function crmFetch(action: string, extra: Record<string, any> = {}) {
  const { data: sessionData } = await sharedSupabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(CRM_FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const STAT_CARDS = [
  { key: "total", label: "TOTAL CONTACTS", icon: Users, borderColor: "border-l-[#3B82F6]", iconColor: "text-[#3B82F6]" },
  { key: "active", label: "ACTIVE THIS WEEK", icon: TrendingUp, borderColor: "border-l-[#14B8A6]", iconColor: "text-[#14B8A6]" },
  { key: "conversion", label: "CONVERSION RATE", icon: Target, borderColor: "border-l-[#D4AF37]", iconColor: "text-[#D4AF37]" },
  { key: "pipeline", label: "PIPELINE VALUE", icon: DollarSign, borderColor: "border-l-[#10B981]", iconColor: "text-[#10B981]" },
];

export default function AuthorCRMPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statsData, setStatsData] = useState<{ total: number; activeThisWeek: number; conversionRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [contactsStageFilter, setContactsStageFilter] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [recentLeads, setRecentLeads] = useState<Array<{ id: string; email: string; name: string | null; created_at: string; abby_score: number | null; quiz_stage: string | null }>>([]);

  // Lightweight initial load: just get first page to check if empty + stats.
  // The edge function now also returns `recentLeads` from the leads table (server-side
  // identity resolution), so we no longer need a client-side fallback query.
  const fetchInitial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await crmFetch("list", { page: 1, pageSize: 1 });
      const total = data.totalCount || 0;
      setStatsData({ total, activeThisWeek: 0, conversionRate: 0 });
      setRecentLeads(Array.isArray(data.recentLeads) ? data.recentLeads : []);
    } catch (e) {
      console.warn("[CRM] initial load failed:", e);
      setStatsData({ total: 0, activeThisWeek: 0, conversionRate: 0 });
      setRecentLeads([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Deep-link: open contact detail when ?contactId= is present (e.g. from Marketing Hub)
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkContactId = searchParams.get("contactId");
  useEffect(() => {
    if (!deepLinkContactId || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("crm_contacts")
        .select("id, full_name, email, phone, company, notes, source, stage, abby_score, last_activity_at, created_at")
        .eq("id", deepLinkContactId)
        .maybeSingle();
      if (cancelled || !data) return;
      setSelectedContact({ ...(data as any), tags: [] });
      setDetailOpen(true);
      // strip the param so reopening the page doesn't keep re-triggering
      const sp = new URLSearchParams(searchParams);
      sp.delete("contactId");
      setSearchParams(sp, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [deepLinkContactId, user]);

  const abbyMessage = useMemo(() => {
    const n = statsData?.total || 0;
    if (n === 0) return "Add your first contact and ABBY will start building your funnel.";
    if (n < 10) return `You have ${n} contact${n > 1 ? "s" : ""}. ABBY is watching your pipeline.`;
    return "Great momentum! ABBY has insights ready for you in the Intelligence tab.";
  }, [statsData?.total]);

  const statValues: Record<string, string> = {
    total: String(statsData?.total || 0),
    active: String(statsData?.activeThisWeek || 0),
    conversion: `${statsData?.conversionRate || 0}%`,
    pipeline: "—",
  };

  const handleAddContact = async (data: any) => {
    setFormLoading(true);
    try {
      await crmFetch("add", {
        full_name: data.full_name, email: data.email || null,
        phone: data.phone || null, company: data.company || null,
        notes: data.notes || null, tags: data.tags || "",
      });
      toast({ title: "Contact added" });
      setShowForm(false);
      fetchInitial();
      triggerRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setFormLoading(false);
  };

  const handleContactClick = (contact: any) => {
    setSelectedContact(contact as CRMContact);
    setDetailOpen(true);
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await crmFetch("bulk-delete", { contact_ids: ids });
      toast({ title: `Deleted ${ids.length} contacts` });
      fetchInitial();
      triggerRefresh();
    } catch {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    }
  };

  const handleBulkMoveStage = async (ids: string[], stage: string) => {
    try {
      await crmFetch("bulk-move-stage", { contact_ids: ids, stage });
      toast({ title: `Moved ${ids.length} contacts` });
      fetchInitial();
      triggerRefresh();
    } catch {
      toast({ title: "Bulk move failed", variant: "destructive" });
    }
  };

  const exportCSV = async () => {
    try {
      // Fetch all contacts for export (up to 500)
      const data = await crmFetch("list", { page: 1, pageSize: 500 });
      const contacts = data.contacts || [];
      const headers = ["Name", "Email", "Phone", "Company", "Source", "Stage", "ABBY Score", "Tags"];
      const rows = contacts.map((c: any) => [
        c.full_name, c.email || "", c.phone || "", c.company || "",
        c.source, c.stage, String(c.abby_score), (c.tags || []).join("; "),
      ]);
      const csv = [headers, ...rows].map((r) => r.map((v: string) => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "crm-contacts.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast({ title: "CSV is empty", variant: "destructive" }); setImporting(false); return; }
      const hdrs = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
      const nameIdx = hdrs.findIndex((h) => h.includes("name"));
      const emailIdx = hdrs.findIndex((h) => h.includes("email"));
      const phoneIdx = hdrs.findIndex((h) => h.includes("phone"));
      const companyIdx = hdrs.findIndex((h) => h.includes("company") || h.includes("org"));
      if (nameIdx === -1 && emailIdx === -1) { toast({ title: "CSV must have a Name or Email column", variant: "destructive" }); setImporting(false); return; }
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.replace(/"/g, "").trim());
        return {
          full_name: (nameIdx >= 0 ? cols[nameIdx] : cols[emailIdx]) || "Unknown",
          email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          company: companyIdx >= 0 ? cols[companyIdx] || null : null,
        };
      }).filter((r) => r.full_name && r.full_name !== "Unknown");
      if (rows.length === 0) { toast({ title: "No valid rows", variant: "destructive" }); setImporting(false); return; }
      const data = await crmFetch("import-csv", { rows });
      toast({ title: `Imported ${data.imported} contacts` });
      fetchInitial();
      triggerRefresh();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if ((statsData?.total || 0) === 0 && !showForm) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-[#1E3A5F] px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="h-6 w-6 text-[#D4AF37]" />
            <h2 className="text-2xl font-bold text-white font-heading">My CRM</h2>
          </div>
          <p className="text-[#D4AF37] text-sm mb-1">Sales Funnel & Contacts — powered by ABBY</p>
          <p className="text-white/70 text-[13px] italic">{abbyMessage}</p>
        </div>

        {recentLeads.length > 0 && (
          <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-base font-bold text-[#1E3A5F]">
                Recent quiz leads ({recentLeads.length})
              </h3>
              <span className="text-[11px] text-gray-500">From your funnel captures</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {recentLeads.map((l) => (
                <li key={l.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1E3A5F] truncate">{l.name || l.email}</p>
                    <p className="text-[12px] text-gray-500 truncate">{l.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 shrink-0 ml-4">
                    {l.quiz_stage && <span className="px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#1E3A5F]">{l.quiz_stage}</span>}
                    {typeof l.abby_score === "number" && <span>score {l.abby_score}</span>}
                    <span>{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-400 mt-3 italic">
              These leads were captured by your funnels. They will appear in your full CRM shortly.
            </p>
          </div>
        )}

        <div className="max-w-xl mx-auto text-center space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your CRM will grow as readers engage with your website, download your resources,
            sign up for your courses, and attend your events.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-1.5" /> Add Contact Manually
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Import CSV
            </Button>
            <Button
              className="bg-[#D4AF37] text-[#1E3A5F] hover:bg-[#D4AF37]/90 font-semibold"
              onClick={() => onNavigate?.("revenue-streams")}
            >
              Build Your First Product <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
      </div>
    );
  }

  const TABS = [
    { key: "pipeline", label: "Pipeline", icon: Layers },
    { key: "contacts", label: "Contacts", icon: List },
    { key: "intelligence", label: "ABBY Intelligence", icon: Star },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Navy Banner Header */}
      <div className="rounded-xl bg-[#1E3A5F] px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-[#D4AF37]" />
            <div>
              <h2 className="text-xl font-bold text-white font-heading">My CRM</h2>
              <p className="text-[#D4AF37] text-[13px]">Sales Funnel & Contacts — powered by ABBY</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-[#D4AF37] hover:text-[#1E3A5F] hover:border-[#D4AF37] bg-transparent"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-[#D4AF37] hover:text-[#1E3A5F] hover:border-[#D4AF37] bg-transparent"
              onClick={exportCSV}
            >
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
            <Button
              size="sm"
              className="bg-[#D4AF37] text-[#1E3A5F] hover:bg-[#D4AF37]/90 font-semibold"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? <X className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
              {showForm ? "Cancel" : "Add Contact"}
            </Button>
          </div>
        </div>
        <p className="text-white/70 text-[13px] italic mt-2">&quot;{abbyMessage}&quot;</p>
      </div>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className={`bg-white rounded-xl shadow-sm border-l-4 ${stat.borderColor} p-4`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                <span className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">{stat.label}</span>
              </div>
              <p className="text-[28px] font-bold text-[#1E3A5F] font-heading leading-none">
                {statValues[stat.key]}
              </p>
            </div>
          );
        })}
      </div>

      {showForm && (
        <ContactForm onSubmit={handleAddContact} onCancel={() => setShowForm(false)} loading={formLoading} />
      )}

      {/* Pill Tab Bar */}
      <div className="border-b border-gray-200 pb-0">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const isAbby = tab.key === "intelligence";
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); if (tab.key !== "contacts") setContactsStageFilter(undefined); }}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-all
                  ${isActive
                    ? "bg-[#D4AF37] text-[#1E3A5F] font-bold shadow-sm"
                    : "bg-white text-gray-500 hover:text-[#D4AF37]"
                  }
                  ${isAbby && !isActive ? "animate-pulse-subtle" : ""}
                `}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#1E3A5F]" : isAbby ? "text-[#D4AF37]" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "pipeline" && (
        <PipelineView
          key={refreshKey}
          crmFetch={crmFetch}
          onContactClick={handleContactClick}
          onViewStage={(stage) => {
            setContactsStageFilter(stage);
            setActiveTab("contacts");
          }}
        />
      )}
      {activeTab === "contacts" && (
        <ContactListView
          key={`contacts-${refreshKey}`}
          crmFetch={crmFetch}
          onContactClick={handleContactClick}
          onBulkDelete={handleBulkDelete}
          onBulkMoveStage={handleBulkMoveStage}
          initialStageFilter={contactsStageFilter}
        />
      )}
      {activeTab === "intelligence" && (
        <AbbyIntelligenceView crmFetch={crmFetch} />
      )}

      {/* Contact Detail Panel */}
      <ContactDetailPanel
        contact={selectedContact}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        crmFetch={crmFetch}
        onRefresh={() => {
          fetchInitial();
          triggerRefresh();
        }}
      />
    </div>
  );
}
