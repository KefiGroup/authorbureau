import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Target, BarChart3, Users, TrendingUp } from "lucide-react";

interface Props {
  crmFetch: (action: string, extra?: Record<string, any>) => Promise<any>;
  onContactClick?: (name: string) => void;
}

interface Intelligence {
  actionList: { name: string; reason: string }[];
  funnelHealth: { summary: string; stages: Record<string, number> };
  segmentInsights: { segment: string; count: number; nextAction: string }[];
  predictedConversions: { name: string; likelihood: string; reason: string }[];
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", engaged: "Engaged", warm: "Warm",
  hot: "Hot", customer: "Customer", vip: "VIP", cold: "Cold",
};

export default function AbbyIntelligenceView({ crmFetch, onContactClick }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Intelligence | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await crmFetch("abby-intelligence");
        setData(res.intelligence);
      } catch (e: any) {
        setError(e.message || "Failed to load insights");
      }
      setLoading(false);
    };
    load();
  }, [crmFetch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
        <p className="text-sm text-muted-foreground">ABBY is analysing your contacts...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-destructive">{error || "No data available"}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ABBY Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Star className="h-5 w-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">ABBY Intelligence</h3>
          <p className="text-[11px] text-muted-foreground">AI-powered insights for your pipeline</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Action List */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Today's Action List</h4>
          </div>
          {data.actionList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No actions right now. Great job!</p>
          ) : (
            <div className="space-y-2">
              {data.actionList.slice(0, 5).map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onContactClick?.(data.actionList[0]?.name || "")}>
            Take Action
          </Button>
        </Card>

        {/* Funnel Health */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h4 className="text-sm font-semibold">Funnel Health Score</h4>
          </div>
          <p className="text-xs text-muted-foreground">{data.funnelHealth.summary}</p>
          <div className="space-y-1.5">
            {Object.entries(data.funnelHealth.stages || {}).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{STAGE_LABELS[stage] || stage}</span>
                <Badge variant="secondary" className="text-[10px]">{count as number}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Segment Insights */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-500" />
            <h4 className="text-sm font-semibold">Segment Insights</h4>
          </div>
          {data.segmentInsights.length === 0 ? (
            <p className="text-xs text-muted-foreground">Not enough data for segments yet.</p>
          ) : (
            <div className="space-y-2">
              {data.segmentInsights.map((seg, i) => (
                <div key={i} className="border-l-2 border-teal-500 pl-2">
                  <p className="text-xs font-medium">{seg.segment} ({seg.count})</p>
                  <p className="text-[10px] text-muted-foreground">{seg.nextAction}</p>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full text-xs">Take Action</Button>
        </Card>

        {/* Predicted Conversions */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h4 className="text-sm font-semibold">Predicted Conversions</h4>
          </div>
          {data.predictedConversions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No predictions yet — add more contacts to enable forecasting.</p>
          ) : (
            <div className="space-y-2">
              {data.predictedConversions.map((pc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{pc.name} <span className="text-muted-foreground">({pc.likelihood})</span></p>
                    <p className="text-[10px] text-muted-foreground">{pc.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full text-xs">Take Action</Button>
        </Card>
      </div>
    </div>
  );
}
