import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Plus, Send, Eye, Loader2, Trash2, Edit3, Users,
  FileText, Clock, CheckCircle2, AlertCircle, Search, BarChart3,
  Settings, Copy, RefreshCw,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Campaign {
  id: string;
  subject: string;
  preview_text: string | null;
  content_json: any;
  content_html: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string;
  source_detail: string | null;
  status: string;
  subscribed_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content_json: any;
  created_at: string;
}

interface EmailSettings {
  id: string;
  sender_name: string;
  reply_to_email: string | null;
  subdomain: string | null;
  domain_verified: boolean;
}

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-destructive/10 text-destructive",
};

const sourceLabels: Record<string, string> = {
  newsletter: "Newsletter",
  manual: "Manual",
  reading_club: "Reading Club",
  service_inquiry: "Service Inquiry",
  import: "Imported",
};

export default function EmailMarketing({ activeTab, onTabChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const currentTab = activeTab === "subscribers" ? "subscribers"
    : activeTab === "email-templates" ? "templates"
    : "campaigns";

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-secondary" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">Email Marketing</h2>
          <p className="text-sm text-muted-foreground">
            Create campaigns, manage subscribers, and grow your audience
          </p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={(v) => {
        if (v === "campaigns") onTabChange("email-marketing");
        else if (v === "subscribers") onTabChange("subscribers");
        else if (v === "templates") onTabChange("email-templates");
      }}>
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Subscribers
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="subscribers">
          <SubscribersTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Campaigns Tab ──────────────────────────────── */
function CampaignsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("email_campaigns" as any)
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setCampaigns(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("email_campaigns" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Campaign deleted" });
    }
  };

  if (composing || editingCampaign) {
    return (
      <CampaignComposer
        campaign={editingCampaign}
        onClose={() => { setComposing(false); setEditingCampaign(null); }}
        onSaved={() => { setComposing(false); setEditingCampaign(null); fetchCampaigns(); }}
      />
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => setComposing(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed">
          <Mail className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h3 className="font-heading font-semibold mb-2">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first email campaign to reach your subscribers.
          </p>
          <Button onClick={() => setComposing(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const canEdit = c.status === "draft";

            return (
              <Card
                key={c.id}
                className="hover:shadow-[var(--shadow-card-hover)] transition-shadow cursor-pointer"
                onClick={() => {
                  if (canEdit) {
                    setEditingCampaign(c);
                  } else {
                    toast({ title: "This campaign is already sent", description: "Only draft campaigns can be opened for editing." });
                  }
                }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-heading font-semibold text-sm truncate">
                        {c.subject || "Untitled Campaign"}
                      </h4>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[c.status] || ""}`}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      {c.status === "sent" && (
                        <>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {c.recipient_count} sent
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {c.open_count} opens
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => setEditingCampaign(c)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Campaign Composer ──────────────────────────── */
function CampaignComposer({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [previewText, setPreviewText] = useState(campaign?.preview_text || "");
  const [body, setBody] = useState(campaign?.content_json?.body || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (status: string = "draft") => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      author_id: user.id,
      subject,
      preview_text: previewText || null,
      content_json: { body },
      status: status === "send" ? "draft" : status,
    };

    let campaignId = campaign?.id;
    let error;
    if (campaign) {
      ({ error } = await supabase.from("email_campaigns" as any).update(payload).eq("id", campaign.id));
    } else {
      const { data, error: insertErr } = await supabase.from("email_campaigns" as any).insert(payload).select("id").single();
      error = insertErr;
      if (data) campaignId = (data as any).id;
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (status === "send" && campaignId) {
      // Call the send-campaign edge function
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ campaignId }),
          }
        );
        const result = await res.json();
        if (res.ok && result.success) {
          toast({ title: "Campaign sent! 🎉", description: `${result.sent} emails delivered.` });
        } else {
          toast({ title: "Send failed", description: result.error || "Something went wrong", variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "Send failed", description: err.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Draft saved" });
    }

    onSaved();
    setSaving(false);
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold">
          {campaign ? "Edit Campaign" : "New Campaign"}
        </h3>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Subject Line</label>
          <Input
            placeholder="Your email subject…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Preview Text</label>
          <Input
            placeholder="Short preview shown in inbox…"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email Body</label>
          <Textarea
            placeholder="Write your email content here… (Markdown supported)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Supports Markdown formatting — bold, links, lists, headings, etc.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={() => handleSave("draft")} disabled={saving} variant="outline" className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Save Draft
        </Button>
        <Button
          onClick={() => handleSave("send")}
          disabled={saving || !subject.trim() || !body.trim()}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Now
        </Button>
      </div>
    </div>
  );
}

/* ─── Subscribers Tab ────────────────────────────── */
function SubscribersTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchSubscribers = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("author_subscribers" as any)
      .select("*")
      .eq("author_id", user.id)
      .order("subscribed_at", { ascending: false });
    if (!error && data) setSubscribers(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, [user]);

  const handleAdd = async () => {
    if (!user || !newEmail.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("author_subscribers" as any).insert({
      author_id: user.id,
      email: newEmail.trim().toLowerCase(),
      name: newName.trim() || null,
      source: "manual",
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "This email is already subscribed." : error.message, variant: "destructive" });
    } else {
      toast({ title: "Subscriber added" });
      setAddOpen(false);
      setNewEmail("");
      setNewName("");
      fetchSubscribers();
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase
      .from("author_subscribers" as any)
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (!error) {
      setSubscribers((prev) => prev.map((s) => s.id === id ? { ...s, status: "unsubscribed" } : s));
      toast({ title: "Subscriber unsubscribed" });
    }
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-subscribers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast({ title: "Sync complete", description: `${result.synced} subscribers imported.` });
        fetchSubscribers();
      } else {
        toast({ title: "Sync failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search subscribers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Badge variant="secondary" className="shrink-0">
            {activeCount} active
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync Newsletter Signups
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Subscriber
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subscriber</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
              />
              <Input
                placeholder="Name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdd} disabled={adding || !newEmail.trim()} className="gap-1.5">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading subscribers…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h3 className="font-heading font-semibold mb-2">
            {search ? "No matching subscribers" : "No subscribers yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search ? "Try a different search term." : "Subscribers from your book pages and manual adds will appear here."}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{s.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{s.name || "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {sourceLabels[s.source] || s.source}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(s.subscribed_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {s.status === "active" && (
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(s.id)} className="text-destructive hover:text-destructive text-xs">
                          Unsubscribe
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Templates Tab ──────────────────────────────── */
function TemplatesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("email_templates" as any)
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [user]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("email_templates" as any).insert({
      author_id: user.id,
      name: newName.trim(),
      subject: newSubject.trim(),
      content_json: { body: newBody },
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template created" });
      setCreateOpen(false);
      setNewName("");
      setNewSubject("");
      setNewBody("");
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("email_templates" as any).delete().eq("id", id);
    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Template deleted" });
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Template Name</label>
                <Input
                  placeholder="e.g. Monthly Newsletter"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Default Subject</label>
                <Input
                  placeholder="e.g. {{month}} Update from {{author_name}}"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Body Template</label>
                <Textarea
                  placeholder="Write your template body… (Markdown supported)"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={saving || !newName.trim()} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading templates…
        </div>
      ) : templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h3 className="font-heading font-semibold mb-2">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create reusable email templates to speed up your campaigns.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-heading font-semibold text-sm">{t.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.subject || "No subject"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(t.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
