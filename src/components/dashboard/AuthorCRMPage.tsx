import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Search, Users, UserPlus, X, ChevronRight, TrendingUp,
  Mail, Phone, Building2, MessageSquare, Trash2, Download, ArrowRight,
  Calendar, Tag, Plus, Upload,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ContactForm from "./crm/ContactForm";
import { getActiveToken } from "@/lib/get-active-token";

interface CRMContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  tags: string[];
}

interface Activity {
  id: string;
  type: string;
  content: string | null;
  created_at: string;
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
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
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [selected, setSelected] = useState<CRMContact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await crmFetch("list");
      setContacts(data.contacts || []);
    } catch (error) {
      toast({ title: "Failed to load contacts", variant: "destructive" });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const allSources = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => { if (c.source) s.add(c.source); });
    return Array.from(s).sort();
  }, [contacts]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return contacts.filter((c) => {
      const d = new Date(c.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [contacts]);

  const topSource = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach((c) => { counts[c.source] = (counts[c.source] || 0) + 1; });
    let best = "—";
    let max = 0;
    Object.entries(counts).forEach(([k, v]) => { if (v > max) { max = v; best = k; } });
    return best.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }, [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (sourceFilter !== "all") list = list.filter((c) => c.source === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.company?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [contacts, sourceFilter, search]);

  const handleAddContact = async (data: any) => {
    if (!user) return;
    setFormLoading(true);
    try {
      await crmFetch("add", {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        notes: data.notes || null,
        tags: data.tags || "",
      });
      toast({ title: "Contact added" });
      setShowForm(false);
      fetchContacts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await crmFetch("delete", { contact_id: id });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: "Contact deleted" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleSelect = async (contact: CRMContact) => {
    setSelected(contact);
    setActivitiesLoading(true);
    try {
      const data = await crmFetch("list-activities", { contact_id: contact.id });
      setActivities(data.activities || []);
    } catch {
      setActivities([]);
    }
    setActivitiesLoading(false);
  };

  const handleAddNote = async () => {
    if (!user || !selected || !newNote.trim()) return;
    try {
      await crmFetch("add-note", { contact_id: selected.id, content: newNote.trim() });
      setNewNote("");
      handleSelect(selected);
    } catch {}
  };

  const handleAddTag = async () => {
    if (!user || !selected || !newTag.trim()) return;
    try {
      await crmFetch("add-tag", { contact_id: selected.id, tag: newTag.trim() });
      setNewTag("");
      fetchContacts();
      setSelected({ ...selected, tags: [...selected.tags, newTag.trim()] });
    } catch {}
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Company", "Source", "Date Added", "Tags"];
    const rows = filtered.map((c) => [
      c.full_name,
      c.email || "",
      c.phone || "",
      c.company || "",
      c.source,
      new Date(c.created_at).toLocaleDateString(),
      c.tags.join("; "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast({ title: "CSV is empty or has no data rows", variant: "destructive" });
        setImporting(false);
        return;
      }

      const headerLine = lines[0];
      const hdrs = headerLine.split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
      const nameIdx = hdrs.findIndex((h) => h.includes("name"));
      const emailIdx = hdrs.findIndex((h) => h.includes("email"));
      const phoneIdx = hdrs.findIndex((h) => h.includes("phone"));
      const companyIdx = hdrs.findIndex((h) => h.includes("company") || h.includes("org"));

      if (nameIdx === -1 && emailIdx === -1) {
        toast({ title: "CSV must have a 'Name' or 'Email' column", variant: "destructive" });
        setImporting(false);
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.replace(/"/g, "").trim());
        return {
          full_name: (nameIdx >= 0 ? cols[nameIdx] : cols[emailIdx]) || "Unknown",
          email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          company: companyIdx >= 0 ? cols[companyIdx] || null : null,
        };
      }).filter((r) => r.full_name && r.full_name !== "Unknown");

      if (rows.length === 0) {
        toast({ title: "No valid rows found in CSV", variant: "destructive" });
        setImporting(false);
        return;
      }

      const data = await crmFetch("import-csv", { rows });
      toast({ title: `Imported ${data.imported} contacts from CSV` });
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
        <h2 className="font-heading text-2xl font-bold">My Contacts</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          Your contact list will grow as readers engage with your website, download your resources,
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
          <Button
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            onClick={() => onNavigate?.("revenue-streams")}
          >
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">My Contacts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Everyone who has engaged with your books, products, and website — all in one place.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            Import CSV
          </Button>
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? <X className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
            {showForm ? "Cancel" : "Add Contact"}
          </Button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Contacts", value: contacts.length, icon: Users, color: "text-primary" },
          { label: "This Month", value: thisMonthCount, icon: TrendingUp, color: "text-accent" },
          { label: "Top Source", value: topSource, icon: Calendar, color: "text-muted-foreground", isText: true },
          { label: "Conversion Rate", value: "0%", icon: UserPlus, color: "text-muted-foreground", isText: true },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-xl font-heading font-bold ${stat.color}`}>
              {stat.isText ? stat.value : stat.value}
            </p>
          </Card>
        ))}
      </div>

      {showForm && (
        <ContactForm onSubmit={handleAddContact} onCancel={() => setShowForm(false)} loading={formLoading} />
      )}

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {allSources.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-heading text-lg font-semibold mb-2">
                {search || sourceFilter !== "all" ? "No matches" : "No contacts yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search ? `No contacts match "${search}"` : "Contacts will appear here as people engage with your products."}
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelect(c)}
                className={`rounded-xl border bg-card p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selected?.id === c.id ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-semibold truncate">{c.full_name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {c.phone}
                        </span>
                      )}
                      {c.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> {c.company}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {c.source.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card className="p-5 space-y-5 sticky top-6">
              <div>
                <h3 className="font-heading font-bold text-lg">{selected.full_name}</h3>
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                    <Mail className="h-3.5 w-3.5" /> {selected.email}
                  </a>
                )}
                {selected.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3.5 w-3.5" /> {selected.phone}
                  </p>
                )}
                {selected.company && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" /> {selected.company}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selected.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag} onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..." className="text-xs h-8"
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleAddTag}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              {/* Add note */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Add Note</h4>
                <Textarea
                  value={newNote} onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type a note..." rows={2} className="text-sm"
                />
                <Button size="sm" className="mt-2" onClick={handleAddNote} disabled={!newNote.trim()}>
                  Save Note
                </Button>
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Activity Timeline</h4>
                {activitiesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {activities.map((a) => (
                      <div key={a.id} className="flex gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-foreground">{a.content || a.type}</p>
                          <p className="text-muted-foreground/60">
                            {new Date(a.created_at).toLocaleDateString()} · {a.type}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                {selected.email && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${selected.email}`}>
                      <Mail className="h-3.5 w-3.5 mr-1" /> Send Email
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <ChevronRight className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
