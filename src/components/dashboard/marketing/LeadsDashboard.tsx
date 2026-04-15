import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, Mail, MousePointerClick, TrendingUp, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  status: string;
  nurture_stage: string;
  captured_at: string;
  last_activity_at: string | null;
}

interface Props {
  authorId: string;
  bookId?: string;
}

const STAGE_COLORS: Record<string, string> = {
  welcome: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  engaged: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  dormant: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  customer: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export default function LeadsDashboard({ authorId, bookId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailStats, setEmailStats] = useState({ sent: 0, opened: 0, clicked: 0 });

  useEffect(() => {
    fetchLeads();
  }, [authorId, bookId]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("leads")
        .select("id, email, name, status, nurture_stage, captured_at, last_activity_at")
        .eq("author_id", authorId)
        .order("captured_at", { ascending: false })
        .limit(100);

      if (bookId) query = query.eq("book_id", bookId);

      const { data } = await query;
      setLeads((data as Lead[]) || []);

      // Fetch email stats
      const { data: emails } = await supabase
        .from("generated_emails")
        .select("status")
        .eq("author_id", authorId);

      if (emails) {
        setEmailStats({
          sent: emails.filter(e => e.status === "sent").length,
          opened: 0, // Will be derived from nurture_events
          clicked: 0,
        });
      }

      // Get event counts
      if (data && data.length > 0) {
        const leadIds = data.map((l: any) => l.id);
        const { data: events } = await supabase
          .from("nurture_events")
          .select("event_type")
          .in("lead_id", leadIds.slice(0, 100));

        if (events) {
          setEmailStats(prev => ({
            ...prev,
            opened: events.filter(e => e.event_type === "email_opened").length,
            clicked: events.filter(e => e.event_type === "email_clicked").length,
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stageCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.nurture_stage] = (acc[l.nurture_stage] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </div>
          <p className="text-2xl font-bold mt-1">{leads.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Emails Sent</p>
          </div>
          <p className="text-2xl font-bold mt-1">{emailStats.sent}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Opens</p>
          </div>
          <p className="text-2xl font-bold mt-1">{emailStats.opened}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
          <p className="text-2xl font-bold mt-1">{emailStats.clicked}</p>
        </Card>
      </div>

      {/* Stage distribution */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <Badge key={stage} variant="outline" className={`text-xs ${STAGE_COLORS[stage] || ""}`}>
            {stage}: {count}
          </Badge>
        ))}
      </div>

      {/* Lead list */}
      {leads.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No leads captured yet</p>
          <p className="text-xs text-muted-foreground mt-1">Leads will appear here once people opt in through your landing page</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Captured</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-xs">{lead.name || lead.email}</p>
                    {lead.name && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={`text-[10px] ${STAGE_COLORS[lead.nurture_stage] || ""}`}>
                      {lead.nurture_stage}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(lead.captured_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                    {lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString() : "—"}
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
