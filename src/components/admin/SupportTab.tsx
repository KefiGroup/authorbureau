import { useState, useEffect, useCallback } from "react";
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
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { adminDataFetch } from "@/lib/admin-data-fetch";

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
    try {
      const data = await adminDataFetch("list-bugs");
      setBugs(data.bugs || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      const data = await adminDataFetch("list-feedback");
      setFeedbackList(data.feedback || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const data = await adminDataFetch("list-chats");
      setChatSessions(data.chats || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBugs(), fetchFeedback(), fetchChats()]);
    setLoading(false);
  }, [fetchBugs, fetchFeedback, fetchChats]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateBugStatus = async (id: string, status: string) => {
    try {
      await adminDataFetch("update-bug", { id, status, admin_notes: adminNotes || undefined });
      toast({ title: "Bug report updated" });
      fetchBugs();
      setSelectedBug(null);
    } catch (err) {
      toast({ title: err.message || "Update failed", variant: "destructive" });
    }
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    try {
      await adminDataFetch("update-feedback", { id, status, admin_notes: adminNotes || undefined });
      toast({ title: "Feedback updated" });
      fetchFeedback();
      setSelectedFeedback(null);
    } catch (err) {
      toast({ title: err.message || "Update failed", variant: "destructive" });
    }
  };

  const filteredBugs = bugs.filter(b =>
    (bugStatusFilter === "all" || b.status === bugStatusFilter) &&
    (bugPriorityFilter === "all" || b.priority === bugPriorityFilter)
  );

  const filteredFeedback = feedbackList.filter(f =>
    feedbackTypeFilter === "all" || f.type === feedbackTypeFilter
  );

  const hasBugData = bugs.length > 0;
  const hasFeedbackData = feedbackList.length > 0;

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

        <TabsContent value="bugs">
          {hasBugData && (
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
          )}
          {!hasBugData ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <Bug className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No bug reports yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Bug reports submitted via the Abby Help Assistant will appear here.</p>
            </div>
          ) : (
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
                {filteredBugs.length === 0 && hasBugData && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No bug reports match the current filters</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="feedback">
          {hasFeedbackData && (
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
          )}
          {!hasFeedbackData ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No feedback yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Feedback submitted by authors will appear here for review.</p>
            </div>
          ) : (
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
                {filteredFeedback.length === 0 && hasFeedbackData && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No feedback matches the current filter</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="chats">
          {chatSessions.length > 0 && (
            <div className="mb-3">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search chats..." value={chatSearch} onChange={e => setChatSearch(e.target.value)} className="pl-8" />
              </div>
            </div>
          )}
          {chatSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <MessagesSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No chat sessions yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Conversations with the Abby Help Assistant are automatically saved here.</p>
            </div>
          ) : (
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
              </TableBody>
            </Table>
          )}
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
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chat Session</DialogTitle></DialogHeader>
          {selectedChat && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Page: {selectedChat.page_url || "Unknown"} • {format(new Date(selectedChat.created_at), "MMM d, yyyy HH:mm")}
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(Array.isArray(selectedChat.messages) ? selectedChat.messages : []).map((msg: any, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 text-sm ${
                      msg.role === "user"
                        ? "bg-secondary/10 text-foreground ml-8"
                        : "bg-muted text-muted-foreground mr-8"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1 capitalize">{msg.role || "system"}</p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
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
