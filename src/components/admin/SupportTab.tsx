import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Bug, MessageSquare, MessagesSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

type BugReport = {
  id: string;
  user_id: string | null;
  page_url: string;
  description: string;
  screenshot_url: string | null;
  priority: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

type FeedbackItem = {
  id: string;
  user_id: string | null;
  type: string;
  description: string;
  importance: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

type ChatSession = {
  id: string;
  user_id: string | null;
  messages: any[];
  page_url: string | null;
  created_at: string;
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
  reviewed: "bg-purple-100 text-purple-700 border-purple-200",
  planned: "bg-indigo-100 text-indigo-700 border-indigo-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

const typeColors: Record<string, string> = {
  feature_request: "bg-blue-100 text-blue-700 border-blue-200",
  improvement: "bg-emerald-100 text-emerald-700 border-emerald-200",
  general: "bg-amber-100 text-amber-700 border-amber-200",
};

const importanceColors: Record<string, string> = {
  must_have: "bg-red-100 text-red-700 border-red-200",
  nice_to_have: "bg-amber-100 text-amber-700 border-amber-200",
  just_a_thought: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function SupportTab() {
  const { toast } = useToast();

  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const [bugStatusFilter, setBugStatusFilter] = useState("all");
  const [bugPriorityFilter, setBugPriorityFilter] = useState("all");
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState("all");
  const [chatSearch, setChatSearch] = useState("");

  const fetchBugs = useCallback(async () => {
    const { data, error } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false });
    if (!error && data) setBugs(data as BugReport[]);
  }, []);

  const fetchFeedback = useCallback(async () => {
    const { data, error } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    if (!error && data) setFeedbackList(data as FeedbackItem[]);
  }, []);

  const fetchChats = useCallback(async () => {
    const { data, error } = await supabase.from("chat_sessions").select("*").order("created_at", { ascending: false });
    if (!error && data) setChatSessions(data as ChatSession[]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBugs(), fetchFeedback(), fetchChats()]);
    setLoading(false);
  }, [fetchBugs, fetchFeedback, fetchChats]);

  useEffect(() => { refresh(); }, []);

  const updateBugStatus = async (id: string, status: string) => {
    await supabase.from("bug_reports").update({
      status,
      admin_notes: adminNotes || undefined,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    }).eq("id", id);
    toast({ title: "Bug report updated" });
    fetchBugs();
    setSelectedBug(null);
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    await supabase.from("feedback").update({
      status,
      admin_notes: adminNotes || undefined,
    }).eq("id", id);
    toast({ title: "Feedback updated" });
    fetchFeedback();
    setSelectedFeedback(null);
  };

  const filteredBugs = bugs.filter(b =>
    (bugStatusFilter === "all" || b.status === bugStatusFilter) &&
    (bugPriorityFilter === "all" || b.priority === bugPriorityFilter)
  );

  const filteredFeedback = feedbackList.filter(f =>
    feedbackTypeFilter === "all" || f.type === feedbackTypeFilter
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Support</h2>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="bugs">
        <TabsList>
          <TabsTrigger value="bugs" className="gap-1.5"><Bug className="h-4 w-4" /> Bug Reports ({bugs.length})</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Feedback ({feedbackList.length})</TabsTrigger>
          <TabsTrigger value="chats" className="gap-1.5"><MessagesSquare className="h-4 w-4" /> Chat Logs ({chatSessions.length})</TabsTrigger>
        </TabsList>

        {/* Bug Reports */}
        <TabsContent value="bugs">
          <div className="flex gap-2 mb-3">
            <Select value={bugStatusFilter} onValueChange={setBugStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bugPriorityFilter} onValueChange={setBugPriorityFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBugs.map(bug => (
                <TableRow key={bug.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedBug(bug); setAdminNotes(bug.admin_notes || ""); }}>
                  <TableCell className="text-sm">{bug.page_url}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{bug.description}</TableCell>
                  <TableCell><Badge variant="outline" className={priorityColors[bug.priority]}>{bug.priority}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[bug.status]}>{bug.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(bug.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
              {filteredBugs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No bug reports found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Feedback */}
        <TabsContent value="feedback">
          <div className="flex gap-2 mb-3">
            <Select value={feedbackTypeFilter} onValueChange={setFeedbackTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Importance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.map(fb => (
                <TableRow key={fb.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedFeedback(fb); setAdminNotes(fb.admin_notes || ""); }}>
                  <TableCell><Badge variant="outline" className={typeColors[fb.type]}>{fb.type.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{fb.description}</TableCell>
                  <TableCell><Badge variant="outline" className={importanceColors[fb.importance]}>{fb.importance.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[fb.status]}>{fb.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(fb.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
              {filteredFeedback.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No feedback found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Chat Logs */}
        <TabsContent value="chats">
          <div className="mb-3">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search chats..." value={chatSearch} onChange={e => setChatSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chatSessions
                .filter(c => !chatSearch || JSON.stringify(c.messages).toLowerCase().includes(chatSearch.toLowerCase()))
                .map(chat => (
                  <TableRow key={chat.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedChat(chat)}>
                    <TableCell className="text-sm">{chat.page_url || "—"}</TableCell>
                    <TableCell className="text-sm">{Array.isArray(chat.messages) ? chat.messages.length : 0} messages</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(chat.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                  </TableRow>
                ))}
              {chatSessions.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No chat sessions found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Bug Detail Dialog */}
      <Dialog open={!!selectedBug} onOpenChange={() => setSelectedBug(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bug Report</DialogTitle></DialogHeader>
          {selectedBug && (
            <div className="space-y-3">
              <div><span className="text-sm font-medium">Page:</span> <span className="text-sm">{selectedBug.page_url}</span></div>
              <div><span className="text-sm font-medium">Priority:</span> <Badge variant="outline" className={priorityColors[selectedBug.priority]}>{selectedBug.priority}</Badge></div>
              <div><span className="text-sm font-medium">Description:</span><p className="text-sm mt-1 whitespace-pre-wrap">{selectedBug.description}</p></div>
              {selectedBug.screenshot_url && (
                <div><span className="text-sm font-medium">Screenshot:</span><img src={selectedBug.screenshot_url} className="mt-1 rounded border max-h-48" /></div>
              )}
              <div>
                <span className="text-sm font-medium">Admin Notes:</span>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="mt-1" rows={3} placeholder="Add notes..." />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateBugStatus(selectedBug.id, "in_progress")}>Mark In Progress</Button>
                <Button size="sm" onClick={() => updateBugStatus(selectedBug.id, "resolved")} className="bg-green-600 hover:bg-green-700 text-white">Mark Resolved</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Feedback</DialogTitle></DialogHeader>
          {selectedFeedback && (
            <div className="space-y-3">
              <div><span className="text-sm font-medium">Type:</span> <Badge variant="outline" className={typeColors[selectedFeedback.type]}>{selectedFeedback.type.replace("_", " ")}</Badge></div>
              <div><span className="text-sm font-medium">Importance:</span> <Badge variant="outline" className={importanceColors[selectedFeedback.importance]}>{selectedFeedback.importance.replace(/_/g, " ")}</Badge></div>
              <div><span className="text-sm font-medium">Description:</span><p className="text-sm mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p></div>
              <div>
                <span className="text-sm font-medium">Admin Notes:</span>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="mt-1" rows={3} placeholder="Add notes..." />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateFeedbackStatus(selectedFeedback.id, "reviewed")}>Mark Reviewed</Button>
                <Button size="sm" variant="outline" onClick={() => updateFeedbackStatus(selectedFeedback.id, "planned")}>Mark Planned</Button>
                <Button size="sm" onClick={() => updateFeedbackStatus(selectedFeedback.id, "completed")} className="bg-green-600 hover:bg-green-700 text-white">Completed</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Session Dialog */}
      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chat Session</DialogTitle></DialogHeader>
          {selectedChat && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Page: {selectedChat.page_url || "—"} • {format(new Date(selectedChat.created_at), "MMM d, yyyy HH:mm")}</p>
              <div className="space-y-2 mt-3">
                {(Array.isArray(selectedChat.messages) ? selectedChat.messages : []).map((msg: any, i: number) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
