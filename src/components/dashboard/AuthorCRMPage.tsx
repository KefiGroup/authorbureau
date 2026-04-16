import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Users, UserPlus, X, TrendingUp, Upload, Download, ArrowRight,
  Layers, List, Star,
} from "lucide-react";
import ContactForm from "./crm/ContactForm";
import PipelineView from "@/components/crm/PipelineView";
import ContactListView from "@/components/crm/ContactListView";
import AbbyIntelligenceView from "@/components/crm/AbbyIntelligenceView";
import ContactDetailPanel from "@/components/crm/ContactDetailPanel";
import { getActiveToken } from "@/lib/get-active-token";

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
  const token = await getActiveToken();
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

export default function AuthorCRMPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await crmFetch("list");
      setContacts(data.contacts || []);
    } catch {
      toast({ title: "Failed to load contacts", variant: "destructive" });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Stats
  const stats = useMemo(() => {
    const total = contacts.length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeThisWeek = contacts.filter((c) =>
      c.last_activity_at && new Date(c.last_activity_at) > weekAgo
    ).length;
    const customers = contacts.filter((c) => c.stage === "customer" || c.stage === "vip").length;
    const conversionRate = total > 0 ? Math.round((customers / total) * 100) : 0;
    return { total, activeThisWeek, conversionRate };
  }, [contacts]);

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
      fetchContacts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setFormLoading(false);
  };

  const handleContactClick = (contact: CRMContact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  const handleStageChange = async (contactId: string, newStage: string) => {
    try {
      await crmFetch("update-stage", { contact_id: contactId, stage: newStage });
      fetchContacts();
    } catch {
      toast({ title: "Failed to update stage", variant: "destructive" });
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await crmFetch("bulk-delete", { contact_ids: ids });
      toast({ title: `Deleted ${ids.length} contacts` });
      fetchContacts();
    } catch {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    }
  };

  const handleBulkMoveStage = async (ids: string[], stage: string) => {
    try {
      await crmFetch("bulk-move-stage", { contact_ids: ids, stage });
      toast({ title: `Moved ${ids.length} contacts` });
      fetchContacts();
    } catch {
      toast({ title: "Bulk move failed", variant: "destructive" });
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Company", "Source", "Stage", "ABBY Score", "Tags"];
    const rows = contacts.map((c) => [
      c.full_name, c.email || "", c.phone || "", c.company || "",
      c.source, c.stage, String(c.abby_score), c.tags.join("; "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "crm-contacts.csv"; a.click();
    URL.revokeObjectURL(url);
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
      fetchContacts();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contacts.length === 0 && !showForm) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
          <Users className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="font-heading text-2xl font-bold">My CRM</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          Your CRM will grow as readers engage with your website, download your resources,
          sign up for your courses, and attend your events. Build your first product to start collecting contacts.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-1.5" /> Add Contact Manually
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            Import CSV
          </Button>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => onNavigate?.("revenue-streams")}>
            Build Your First Product <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">My CRM</h2>
          <p className="text-sm text-muted-foreground mt-1">Sales Funnel & Contacts — powered by ABBY</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            Import
          </Button>
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? <X className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
            {showForm ? "Cancel" : "Add Contact"}
          </Button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">Total Contacts</span>
          </div>
          <p className="text-xl font-heading font-bold text-primary">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-[11px] text-muted-foreground">Active This Week</span>
          </div>
          <p className="text-xl font-heading font-bold text-accent">{stats.activeThisWeek}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-[11px] text-muted-foreground">Conversion Rate</span>
          </div>
          <p className="text-xl font-heading font-bold">{stats.conversionRate}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Pipeline Value</span>
          </div>
          <p className="text-xl font-heading font-bold text-muted-foreground">—</p>
        </Card>
      </div>

      {showForm && (
        <ContactForm onSubmit={handleAddContact} onCancel={() => setShowForm(false)} loading={formLoading} />
      )}

      {/* Tabbed Views */}
      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <List className="h-3.5 w-3.5" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-1.5">
            <Star className="h-3.5 w-3.5" /> ABBY Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineView
            contacts={contacts}
            onContactClick={handleContactClick}
            onStageChange={handleStageChange}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactListView
            contacts={contacts}
            onContactClick={handleContactClick}
            onBulkDelete={handleBulkDelete}
            onBulkMoveStage={handleBulkMoveStage}
          />
        </TabsContent>

        <TabsContent value="intelligence">
          <AbbyIntelligenceView crmFetch={crmFetch} />
        </TabsContent>
      </Tabs>

      {/* Contact Detail Panel */}
      <ContactDetailPanel
        contact={selectedContact}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        crmFetch={crmFetch}
        onRefresh={() => {
          fetchContacts();
          if (selectedContact) {
            // Refresh selected contact data
            const updated = contacts.find((c) => c.id === selectedContact.id);
            if (updated) setSelectedContact(updated);
          }
        }}
      />
    </div>
  );
}
