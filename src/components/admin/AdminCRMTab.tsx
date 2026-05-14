import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Users, RefreshCw, Trash2 } from "lucide-react";
import { adminDataFetch } from "@/lib/admin-data-fetch";

interface CRMContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string;
  author_id: string;
  created_at: string;
  tags: string[];
}


export default function AdminCRMTab() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDataFetch("list-crm-contacts");
      setContacts(data.contacts || []);
      setSelected(new Set());
    } catch (error) {
      toast({ title: "Failed to load CRM contacts", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach(c => c.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (tagFilter !== "all") {
      list = list.filter(c => c.tags?.includes(tagFilter));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.company?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [contacts, search, tagFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach(c => next.delete(c.id));
      } else {
        filtered.forEach(c => next.add(c.id));
      }
      return next;
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const res = await adminDataFetch("delete-crm-contacts", { contact_ids: ids });
      toast({ title: `Deleted ${res.deleted ?? ids.length} contact${ids.length !== 1 ? "s" : ""}` });
      setConfirmOpen(false);
      await fetchContacts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    }
    setDeleting(false);
  };

  const sourceColors: Record<string, string> = {
    manual: "bg-muted text-muted-foreground",
    newsletter: "bg-blue-100 text-blue-700",
    microsite: "bg-green-100 text-green-700",
    import: "bg-purple-100 text-purple-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">CRM — All Contacts</h2>
          <p className="text-muted-foreground text-sm mt-1">Platform-wide contact management across all authors</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete {selected.size} selected
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchContacts} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setTagFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                tagFilter === "all" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              All ({contacts.length})
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tagFilter === tag ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">
            {search || tagFilter !== "all" ? "No contacts match the current filters" : "No CRM contacts yet"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Contacts are added by authors through their CRM or auto-captured from newsletter signups.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleAllFiltered}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Company</th>
                  <th className="text-left px-4 py-2 font-medium">Source</th>
                  <th className="text-left px-4 py-2 font-medium">Tags</th>
                  <th className="text-left px-4 py-2 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr key={contact.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(contact.id)}
                        onCheckedChange={() => toggleOne(contact.id)}
                        aria-label={`Select ${contact.full_name}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{contact.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.company || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${sourceColors[contact.source] || ""}`}>
                        {contact.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {contact.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} contact{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected CRM contacts along with their tags and activity log entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
