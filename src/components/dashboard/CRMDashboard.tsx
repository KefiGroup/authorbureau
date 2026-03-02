import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Search } from "lucide-react";
import ContactForm from "./crm/ContactForm";
import ContactList from "./crm/ContactList";
import ActivityPanel from "./crm/ActivityPanel";

interface Contact {
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const { data: contactsData } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });

    if (!contactsData) {
      setContacts([]);
      setLoading(false);
      return;
    }

    // Fetch tags for all contacts
    const contactIds = contactsData.map((c: any) => c.id);
    const { data: tagsData } = await supabase
      .from("crm_contact_tags")
      .select("contact_id, tag")
      .in("contact_id", contactIds.length > 0 ? contactIds : ["__none__"]);

    const tagMap: Record<string, string[]> = {};
    (tagsData || []).forEach((t: any) => {
      if (!tagMap[t.contact_id]) tagMap[t.contact_id] = [];
      tagMap[t.contact_id].push(t.tag);
    });

    setContacts(
      contactsData.map((c: any) => ({
        ...c,
        tags: tagMap[c.id] || [],
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const fetchActivities = useCallback(async (contactId: string) => {
    setActivitiesLoading(true);
    const { data } = await supabase
      .from("crm_activity_log")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });
    setActivities((data as Activity[]) || []);
    setActivitiesLoading(false);
  }, []);

  useEffect(() => {
    if (selectedContact) fetchActivities(selectedContact.id);
    else setActivities([]);
  }, [selectedContact, fetchActivities]);

  const handleCreate = async (formData: any) => {
    if (!formData.full_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setCreating(true);

    const { data: inserted, error } = await supabase
      .from("crm_contacts")
      .insert({
        author_id: user!.id,
        full_name: formData.full_name.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        company: formData.company || null,
        notes: formData.notes || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    // Insert tags
    const tags = formData.tags
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    if (tags.length > 0 && inserted) {
      await supabase.from("crm_contact_tags").insert(
        tags.map((tag: string) => ({
          author_id: user!.id,
          contact_id: inserted.id,
          tag,
        }))
      );
    }

    toast({ title: "Contact added!" });
    setShowForm(false);
    setCreating(false);
    fetchContacts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("crm_contacts").delete().eq("id", id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
    toast({ title: "Contact removed" });
  };

  const handleAddActivity = async (type: string, content: string) => {
    if (!selectedContact) return;
    const { error } = await supabase.from("crm_activity_log").insert({
      author_id: user!.id,
      contact_id: selectedContact.id,
      type,
      content,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    fetchActivities(selectedContact.id);
  };

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.company?.toLowerCase().includes(q) ?? false) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Contacts & CRM</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your network — clients, leads, collaborators.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      </div>

      {showForm && (
        <ContactForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={creating} />
      )}

      {contacts.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No contacts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start building your network — add clients, readers, collaborators, and leads.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Contact
          </Button>
        </div>
      ) : (
        <>
          {contacts.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts by name, email, company, or tag..."
                className="pl-9"
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ContactList
                contacts={filtered}
                onDelete={handleDelete}
                onSelect={setSelectedContact}
                selectedId={selectedContact?.id}
              />
              {filtered.length === 0 && search && (
                <p className="text-sm text-muted-foreground text-center py-8">No contacts match "{search}"</p>
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedContact ? (
                <ActivityPanel
                  contactName={selectedContact.full_name}
                  activities={activities}
                  onAddActivity={handleAddActivity}
                  loading={activitiesLoading}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <p className="text-sm text-muted-foreground">Select a contact to view activity</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
