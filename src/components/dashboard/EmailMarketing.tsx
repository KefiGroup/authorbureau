import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import {
  Mail, Send, Eye, Loader2, Trash2, Edit3, Users,
  FileText, Clock, CheckCircle2, Search, Zap,
  Settings, Copy, RefreshCw, BookOpen, Sparkles,
  ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface EmailFlow {
  id: string;
  title: string;
  description: string | null;
  flow_type: string;
  book_id: string | null;
  ai_generated: boolean;
  status: string;
  created_at: string;
  steps?: EmailFlowStep[];
}

interface EmailFlowStep {
  id: string;
  flow_id: string;
  step_number: number;
  subject: string;
  preview_text: string | null;
  body_markdown: string;
  trigger_delay_days: number;
  status: string;
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

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const sourceLabels: Record<string, string> = {
  newsletter: "Newsletter",
  manual: "Manual",
  reading_club: "Reading Club",
  service_inquiry: "Service Inquiry",
  import: "Imported",
};

export default function EmailMarketing({ activeTab, onTabChange }: Props) {
  const currentTab = activeTab === "subscribers" ? "subscribers" : "flows";

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-secondary" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">Email Automation</h2>
          <p className="text-sm text-muted-foreground">
            AI-generated nurture flows from your books — review, toggle, and let automation do the work
          </p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={(v) => {
        if (v === "flows") onTabChange("email-marketing");
        else if (v === "subscribers") onTabChange("subscribers");
      }}>
        <TabsList>
          <TabsTrigger value="flows" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Nurture Flows
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Subscribers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows">
          <FlowsTab />
        </TabsContent>
        <TabsContent value="subscribers">
          <SubscribersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Flows Tab ──────────────────────────────── */
function FlowsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flows, setFlows] = useState<EmailFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<EmailFlowStep | null>(null);

  const fetchFlows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("email_flows")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      // Fetch steps for each flow
      const flowsWithSteps: EmailFlow[] = [];
      for (const flow of data as any[]) {
        const { data: steps } = await supabase
          .from("email_flow_steps")
          .select("*")
          .eq("flow_id", flow.id)
          .order("step_number", { ascending: true });
        flowsWithSteps.push({ ...flow, steps: (steps as any[]) || [] });
      }
      setFlows(flowsWithSteps);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const toggleFlowStatus = async (flowId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("email_flows")
      .update({ status: newStatus } as any)
      .eq("id", flowId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFlows(prev => prev.map(f => f.id === flowId ? { ...f, status: newStatus } : f));
      toast({ title: newStatus === "active" ? "Flow activated ✓" : "Flow paused" });
    }
  };

  const deleteFlow = async (flowId: string) => {
    // Delete steps first, then flow
    await supabase.from("email_flow_steps").delete().eq("flow_id", flowId);
    await supabase.from("email_flow_enrollments").delete().eq("flow_id", flowId);
    const { error } = await supabase.from("email_flows").delete().eq("id", flowId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFlows(prev => prev.filter(f => f.id !== flowId));
      toast({ title: "Flow deleted" });
    }
  };

  const updateStep = async (step: EmailFlowStep) => {
    const { error } = await supabase
      .from("email_flow_steps")
      .update({
        subject: step.subject,
        preview_text: step.preview_text,
        body_markdown: step.body_markdown,
        trigger_delay_days: step.trigger_delay_days,
      } as any)
      .eq("id", step.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email updated ✓" });
      setEditingStep(null);
      fetchFlows();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading flows…
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed mt-4">
        <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h3 className="font-heading font-semibold mb-2">No email flows yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Email nurture flows are <strong>automatically generated</strong> when you run "Build My Author Business" on a book. 
          The AI creates a complete email sequence from your book content.
        </p>
        <div className="flex items-center gap-2 text-sm text-secondary font-medium">
          <ArrowRight className="h-4 w-4" />
          Go to Build My Author Business → Select a book → Generate
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">
        {flows.length} nurture flow{flows.length !== 1 ? "s" : ""} — AI-generated from your books
      </p>

      {flows.map((flow) => {
        const isExpanded = expandedFlow === flow.id;
        const isActive = flow.status === "active";
        const stepCount = flow.steps?.length || 0;

        return (
          <Card key={flow.id} className="overflow-hidden">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedFlow(isExpanded ? null : flow.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-muted"}`}>
                  <Zap className={`h-5 w-5 ${isActive ? "text-emerald-600" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading font-semibold text-sm truncate">{flow.title}</h4>
                    {flow.ai_generated && (
                      <Badge variant="outline" className="text-[10px] shrink-0 bg-secondary/10 text-secondary border-secondary/30">
                        AI Generated
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {flow.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stepCount} email{stepCount !== 1 ? "s" : ""} in sequence • {flow.flow_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Paused"}</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleFlowStatus(flow.id, flow.status)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteFlow(flow.id)}
                  className="text-destructive hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>

            {isExpanded && flow.steps && flow.steps.length > 0 && (
              <div className="border-t border-border">
                {flow.steps.map((step, idx) => (
                  <div key={step.id} className="border-b border-border last:border-b-0">
                    {editingStep?.id === step.id ? (
                      <StepEditor
                        step={editingStep}
                        onChange={setEditingStep}
                        onSave={() => updateStep(editingStep)}
                        onCancel={() => setEditingStep(null)}
                      />
                    ) : (
                      <div className="px-6 py-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary/10 text-secondary text-xs font-bold shrink-0">
                                {step.step_number}
                              </span>
                              <h5 className="font-medium text-sm truncate">{step.subject}</h5>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {step.trigger_delay_days === 0 ? "Immediate" : `Day ${step.trigger_delay_days}`}
                              </span>
                            </div>
                            {step.preview_text && (
                              <p className="text-xs text-muted-foreground ml-8 line-clamp-1">{step.preview_text}</p>
                            )}
                            <div className="ml-8 mt-2 text-xs text-muted-foreground/80 line-clamp-2">
                              {step.body_markdown.slice(0, 150)}…
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingStep({ ...step })}
                            className="shrink-0"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ─── Step Editor ────────────────────────────── */
function StepEditor({
  step,
  onChange,
  onSave,
  onCancel,
}: {
  step: EmailFlowStep;
  onChange: (s: EmailFlowStep) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-6 py-4 bg-muted/20 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium mb-1 block">Subject Line</label>
          <Input
            value={step.subject}
            onChange={(e) => onChange({ ...step, subject: e.target.value })}
            className="text-sm"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium mb-1 block">Preview Text</label>
            <Input
              value={step.preview_text || ""}
              onChange={(e) => onChange({ ...step, preview_text: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="w-24">
            <label className="text-xs font-medium mb-1 block">Delay (days)</label>
            <Input
              type="number"
              min={0}
              value={step.trigger_delay_days}
              onChange={(e) => onChange({ ...step, trigger_delay_days: parseInt(e.target.value) || 0 })}
              className="text-sm"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Email Body (Markdown)</label>
        <Textarea
          value={step.body_markdown}
          onChange={(e) => onChange({ ...step, body_markdown: e.target.value })}
          rows={8}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave}>Save Changes</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
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
  const [syncing, setSyncing] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("author_subscribers")
      .select("*")
      .eq("author_id", user.id)
      .order("subscribed_at", { ascending: false });
    if (!error && data) setSubscribers(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const handleRemove = async (id: string) => {
    const { error } = await supabase
      .from("author_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (!error) {
      setSubscribers((prev) => prev.map((s) => s.id === id ? { ...s, status: "unsubscribed" } : s));
      toast({ title: "Subscriber unsubscribed" });
    }
  };

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
        toast({ title: "Subscribers synced", description: `${result.imported || 0} new subscribers imported.` });
        fetchSubscribers();
      } else {
        toast({ title: "Sync failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync error", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscribers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline" className="shrink-0">
            {activeCount} active
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h3 className="font-heading font-semibold mb-2">No subscribers yet</h3>
          <p className="text-sm text-muted-foreground">
            Subscribers are captured from book microsites, Reading Club signups, and service inquiries.
          </p>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Name</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Source</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Joined</th>
                <th className="px-4 py-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((sub) => (
                <tr key={sub.id} className="border-t border-border hover:bg-muted/10">
                  <td className="px-4 py-2.5 font-mono text-xs">{sub.email}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">{sub.name || "—"}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <Badge variant="outline" className="text-[10px]">
                      {sourceLabels[sub.source] || sub.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">
                    {new Date(sub.subscribed_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {sub.status === "active" ? (
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(sub.id)} className="text-xs">
                        Unsubscribe
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {sub.status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
