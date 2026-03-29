import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MessageSquare, RefreshCw, Mail, Clock, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { adminDataFetch } from "@/lib/admin-data-fetch";

interface ContactMessage {
  id: string;
  author_id: string;
  author_name?: string;
  sender_name: string;
  sender_email: string;
  message: string;
  source: string;
  source_detail: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ["open", "pending", "closed"] as const;
type Status = typeof STATUS_OPTIONS[number];

const statusConfig: Record<Status, { label: string; icon: typeof Mail; color: string }> = {
  open: { label: "Open", icon: Mail, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  closed: { label: "Closed", icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};


export default function AdminMessagesTab() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDataFetch("list-messages");
      setMessages(data.messages || []);
    } catch (error) {
      toast({ title: "Failed to load messages", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const filtered = useMemo(() => {
    let list = messages;
    if (statusFilter !== "all") list = list.filter(m => m.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.sender_name.toLowerCase().includes(q) ||
        m.sender_email.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q) ||
        (m.author_name?.toLowerCase().includes(q) ?? false)
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
    try {
      await adminDataFetch("update-message", { id, status: newStatus });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      toast({ title: `Message marked as ${newStatus}` });
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
    setUpdatingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Messages — Platform-wide</h2>
          <p className="text-muted-foreground text-sm mt-1">All contact messages from visitors across all authors</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, author..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setStatusFilter("all")} className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === "all" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
            All ({messages.length})
          </button>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
              {statusConfig[s].label} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-secondary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">{search || statusFilter !== "all" ? "No messages match filters" : "No messages yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} message{filtered.length !== 1 ? "s" : ""}</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">From</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">To (Author)</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(msg => {
                  const cfg = statusConfig[msg.status as Status] || statusConfig.open;
                  const isExpanded = expandedId === msg.id;
                  return (
                    <React.Fragment key={msg.id}>
                      <tr className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : msg.id)}>
                        <td className="px-4 py-3 font-medium">{msg.sender_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{msg.sender_email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{msg.author_name || msg.author_id.slice(0, 8)}</td>
                        <td className="px-4 py-3"><Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(msg.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${msg.id}-detail`} className="border-t border-border bg-muted/20">
                          <td colSpan={6} className="px-4 py-3 space-y-2">
                            <div className="bg-card rounded-lg p-3 border border-border">
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Source: {msg.source}</span>
                              <div className="flex gap-1.5">
                                {STATUS_OPTIONS.filter(s => s !== msg.status).map(s => {
                                  const sc = statusConfig[s];
                                  return (
                                    <Button key={s} size="sm" variant="outline" disabled={updatingId === msg.id} onClick={(e) => { e.stopPropagation(); updateStatus(msg.id, s); }} className="text-xs h-7">
                                      {updatingId === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <sc.icon className="h-3 w-3 mr-1" />}
                                      {sc.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
