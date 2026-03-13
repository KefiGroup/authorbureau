import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, Search, MessageSquare, RefreshCw, Mail, Clock, CheckCircle2,
  ChevronDown, ChevronUp, X
} from "lucide-react";

interface ContactMessage {
  id: string;
  sender_name: string;
  sender_email: string;
  message: string;
  source: string;
  source_detail: string | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["open", "pending", "closed"] as const;
type Status = typeof STATUS_OPTIONS[number];

const statusConfig: Record<Status, { label: string; icon: typeof Mail; color: string }> = {
  open: { label: "Open", icon: Mail, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  closed: { label: "Closed", icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

export default function AuthorMessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load messages", variant: "destructive" });
    } else {
      setMessages((data as any[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const filtered = useMemo(() => {
    let list = messages;
    if (statusFilter !== "all") list = list.filter(m => m.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.sender_name.toLowerCase().includes(q) ||
        m.sender_email.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { open: 0, pending: 0, closed: 0 };
    messages.forEach(m => { if (m.status in c) c[m.status as Status]++; });
    return c;
  }, [messages]);

  const updateStatus = async (id: string, newStatus: Status) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("contact_messages")
      .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      toast({ title: `Message marked as ${newStatus}` });
    }
    setUpdatingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Messages</h2>
          <p className="text-muted-foreground text-sm mt-1">Messages from visitors on your public pages</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === "all" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            All ({messages.length})
          </button>
          {STATUS_OPTIONS.map(s => {
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {cfg.label} ({counts[s]})
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">
            {search || statusFilter !== "all" ? "No messages match filters" : "No messages yet"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            When visitors send you a message from your public page, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} message{filtered.length !== 1 ? "s" : ""}</p>
          <div className="space-y-2">
            {filtered.map(msg => {
              const cfg = statusConfig[msg.status as Status] || statusConfig.open;
              const Icon = cfg.icon;
              const isExpanded = expandedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{msg.sender_name}</span>
                        <span className="text-xs text-muted-foreground truncate">&lt;{msg.sender_email}&gt;</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Source: {msg.source}{msg.source_detail ? ` · ${msg.source_detail}` : ""}
                        </div>
                        <div className="flex gap-1.5">
                          {STATUS_OPTIONS.filter(s => s !== msg.status).map(s => {
                            const sc = statusConfig[s];
                            return (
                              <Button
                                key={s}
                                size="sm"
                                variant="outline"
                                disabled={updatingId === msg.id}
                                onClick={() => updateStatus(msg.id, s)}
                                className="text-xs h-7"
                              >
                                {updatingId === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <sc.icon className="h-3 w-3 mr-1" />}
                                {sc.label}
                              </Button>
                            );
                          })}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => window.open(`mailto:${msg.sender_email}?subject=Re: Your message on Authors Bureau`, "_blank")}
                          >
                            <Mail className="h-3 w-3 mr-1" /> Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
