import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface HotLead {
  id: string;
  email: string;
  name: string | null;
  abby_score: number;
  nurture_stage: string;
  last_activity_at: string | null;
  captured_at: string;
}

interface Props {
  authorId: string;
}

export default function HotLeadsCard({ authorId }: Props) {
  const [leads, setLeads] = useState<HotLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leads")
        .select("id, email, name, abby_score, nurture_stage, last_activity_at, captured_at")
        .eq("author_id", authorId)
        .gte("abby_score", 20)
        .order("abby_score", { ascending: false })
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .limit(10);
      if (!cancelled) {
        setLeads((data as HotLead[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authorId]);

  return (
    <Card className="border-amber-500/40 bg-gradient-to-br from-amber-950/30 to-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-amber-400" />
          Hot Leads
          {!loading && (
            <Badge variant="secondary" className="ml-auto">
              {leads.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Readers with engagement score ≥ 20 — open or click your emails most
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hot leads yet. As readers open and click your nurture emails, they will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {leads.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">
                    {l.name || l.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {l.email}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className="bg-amber-500/20 text-amber-200 border border-amber-500/40">
                    {l.abby_score} pts
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1 capitalize">
                    {l.nurture_stage}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
