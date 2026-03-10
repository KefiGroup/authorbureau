import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Search, Users, UserPlus, X, ChevronRight,
} from "lucide-react";
import ContactForm from "./crm/ContactForm";
import ContactList from "./crm/ContactList";
import ActivityPanel from "./crm/ActivityPanel";

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

export default function CRMDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Selected contact
  const [selected, setSelected] = useState<CRMContact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch contacts — admin can see all via RLS
      const { data: contactRows, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch all tags for these contacts
      const contactIds = (contactRows || []).map((c) => c.id);
      let tagsMap: Record<string, string[]> = {};

      if (contactIds.length > 0) {
        const { data: tagRows } = await supabase
          .from("crm_contact_tags")
          .select("contact_id, tag")
          .in("contact_id", contactIds);

        (tagRows || []).forEach((t) => {
          if (!tagsMap[t.contact_id]) tagsMap[t.contact_id] = [];
          tagsMap[t.contact_id].push(t.tag);
        });
      }

      setContacts(
        (contactRows || []).map((c) => ({
          ...c,
          tags: tagsMap[c.id] || [],
        }))
      );
    } catch (err: any) {
      toast({ title: "Failed to load contacts", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // All unique tags for filter pills
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [contacts]);

  // Filtered contacts
  const filtered = useMemo(() => {
    let list = contacts;
    if (tagFilter !== "all") {
      list = list.filter((c) => c.tags.includes(tagFilter));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.company?.toLowerCase().includes(q) ?? false) ||
          (c.notes?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [contacts, tagFilter, search]);

  // Add contact
  const handleAddContact = async (data: any) => {
    if (!user) return;
    setFormLoading(true);
    try {
      const { data: newContact, error } = await supabase
        .from("crm_contacts")
        .insert({
          author_id: user.id,
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          notes: data.notes || null,
          source: "manual",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Add tags
      const tags = data.tags
        ?.split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);

      if (tags?.length && newContact) {
        await supabase.from("crm_contact_tags").insert(
          tags.map((tag: string) => ({
            author_id: user.id,
            contact_id: newContact.id,
            tag,
          }))
        );
      }

      toast({ title: "Contact added" });
      setShowForm(false);
      fetchContacts();
    } catch (err: any) {
      toast({ title: "Error adding contact", description: err.message, variant: "destructive" });
    }
    setFormLoading(false);
  };

  // Delete contact
  const handleDelete = async (id: string) => {
    try {
      // Delete tags and activity first
      await supabase.from("crm_contact_tags").delete().eq("contact_id", id);
      await supabase.from("crm_activity_log").delete().eq("contact_id", id);
      const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
      if (error) throw error;
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: "Contact deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  // Select contact & load activities
  const handleSelect = async (contact: CRMContact) => {
    setSelected(contact);
    setActivitiesLoading(true);
    const { data } = await supabase
      .from("crm_activity_log")
      .select("*")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setActivities((data as Activity[]) || []);
    setActivitiesLoading(false);
  };

  // Add activity
  const handleAddActivity = async (type: string, content: string) => {
    if (!user || !selected) return;
    await supabase.from("crm_activity_log").insert({
      author_id: user.id,
      contact_id: selected.id,
      type,
      content,
    });
    // Refresh
    handleSelect(selected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Contacts & CRM</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? <X className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
          {showForm ? "Cancel" : "Add Contact"}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <ContactForm
          onSubmit={handleAddContact}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
        />
      )}

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              tagFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag === tagFilter ? "all" : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                tagFilter === tag
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      {contacts.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company, or notes..."
            className="pl-9"
          />
        </div>
      )}

      {/* Main layout: contact list + activity panel */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-heading text-lg font-semibold mb-2">
                {search || tagFilter !== "all" ? "No matches" : "No contacts yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No contacts match "${search}"`
                  : "Contacts will appear here as people sign up or you add them manually."}
              </p>
            </div>
          ) : (
            <ContactList
              contacts={filtered}
              onDelete={handleDelete}
              onSelect={handleSelect}
              selectedId={selected?.id}
            />
          )}
        </div>

        {/* Activity panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <ActivityPanel
              contactName={selected.full_name}
              activities={activities}
              onAddActivity={handleAddActivity}
              loading={activitiesLoading}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center space-y-3">
              <ChevronRight className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Select a contact to view activity</p>
              <div className="text-xs text-muted-foreground/70 space-y-1">
                <p>{contacts.length} total contact{contacts.length !== 1 ? "s" : ""}</p>
                {contacts.filter(c => {
                  const weekAgo = Date.now() - 7 * 86400000;
                  return new Date(c.created_at).getTime() > weekAgo;
                }).length > 0 && (
                  <p className="text-secondary font-medium">
                    {contacts.filter(c => new Date(c.created_at).getTime() > Date.now() - 7 * 86400000).length} new this week
                  </p>
                )}
                {allTags.length > 0 && (
                  <p>{allTags.length} tag{allTags.length !== 1 ? "s" : ""} in use</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
