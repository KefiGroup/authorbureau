import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Flame, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Lead {
  id: string;
  email: string | null;
  full_name: string | null;
  abby_score: number;
  stage: string;
  source: string | null;
  last_activity_at: string | null;
}

interface ListRow {
  id: string;
  name: string;
  description: string | null;
  subscriber_count: number;
}

const stageColor: Record<string, string> = {
  new: "bg-muted text-muted-foreground border-border",
  new_lead: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  engaged: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  warm: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  hot: "bg-red-500/10 text-red-600 border-red-500/20",
  customer: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  vip: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  cold: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const stageLabel: Record<string, string> = {
  new_lead: "New Lead", engaged: "Engaged", warm: "Warm",
  hot: "Hot", customer: "Customer", vip: "VIP", cold: "Cold", new: "New",
};

export default function ContactsTab({ authorId }: { authorId: string | null }) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authorId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      const [leadsRes, listsRes] = await Promise.all([
        supabase
          .from("crm_contacts")
          .select("id, email, full_name, abby_score, stage, source, last_activity_at")
          .eq("author_id", authorId)
          .order("last_activity_at", { ascending: false, nullsFirst: false })
          .limit(25),
        supabase
          .from("email_lists")
          .select("id, name, description, subscriber_count")
          .eq("author_id", authorId)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (leadsRes.error) setErrorMsg(leadsRes.error.message);
      setLeads((leadsRes.data as Lead[]) || []);
      setLists((listsRes.data as ListRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authorId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Lists */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Email Lists</h3>
        {lists.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border bg-card">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No lists yet. Lists are created automatically when leads come in.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lists.map((l) => (
              <div key={l.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium">{l.name}</p>
                {l.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{l.description}</p>}
                <p className="text-xs text-muted-foreground mt-2">{l.subscriber_count} subscribers</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent leads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent Leads</h3>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => navigate("/my-contacts")}
          >
            Open full CRM <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {leads.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border bg-card">
            <p className="text-sm text-muted-foreground">
              {errorMsg
                ? `Couldn't load leads: ${errorMsg}`
                : "No leads captured yet. Activate a campaign to start collecting."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Contact</th>
                  <th className="text-left px-4 py-2 font-medium">Stage</th>
                  <th className="text-left px-4 py-2 font-medium">Score</th>
                  <th className="text-left px-4 py-2 font-medium">Source</th>
                  <th className="text-left px-4 py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-border hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => navigate(`/my-contacts?contactId=${l.id}`)}
                  >
                    <td className="px-4 py-2">
                      <p className="font-medium text-xs">{l.full_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{l.email || "—"}</p>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={`text-[10px] ${stageColor[l.stage] || stageColor.new}`}>
                        {l.stage === "hot" && <Flame className="h-2.5 w-2.5 mr-1" />}
                        {stageLabel[l.stage] || l.stage}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{l.abby_score}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{l.source || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {l.last_activity_at ? new Date(l.last_activity_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
