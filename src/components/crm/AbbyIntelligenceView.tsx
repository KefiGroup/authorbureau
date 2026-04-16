import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

function GoldShimmer() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-4 rounded-full" style={{ background: "linear-gradient(90deg, #D4AF3720, #D4AF3740, #D4AF3720)", width: `${60 + i * 10}%` }} />
      ))}
    </div>
  );
}

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
      <div className="space-y-6">
        {/* ABBY Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-md">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#1E3A5F] font-heading">ABBY Intelligence</h3>
            <p className="text-[13px] text-gray-500">Your AI business advisor — analysing...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md border-l-4 border-[#D4AF37] p-5">
              <GoldShimmer />
            </div>
          ))}
        </div>
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

  const cards = [
    {
      icon: Target, iconColor: "text-[#D4AF37]", title: "Today's Action List",
      subtitle: "ABBY's top contacts to reach out to",
      content: data.actionList.length === 0 ? (
        <p className="text-sm text-gray-400">No actions right now. Great job!</p>
      ) : (
        <div className="space-y-2.5">
          {data.actionList.slice(0, 5).map((item, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="text-[11px] font-bold text-[#1E3A5F] bg-[#D4AF37]/15 rounded-full w-6 h-6 flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1E3A5F]">{item.name}</p>
                <p className="text-[12px] text-gray-500 italic">"{item.reason}"</p>
              </div>
            </div>
          ))}
        </div>
      ),
      action: () => onContactClick?.(data.actionList[0]?.name || ""),
    },
    {
      icon: BarChart3, iconColor: "text-[#D4AF37]", title: "Funnel Health Score",
      subtitle: "How your pipeline is performing",
      content: (
        <>
          <p className="text-sm text-gray-600 mb-3">{data.funnelHealth.summary}</p>
          <div className="space-y-1.5">
            {Object.entries(data.funnelHealth.stages || {}).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{STAGE_LABELS[stage] || stage}</span>
                <span className="font-semibold text-[#1E3A5F]">{count as number}</span>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      icon: Users, iconColor: "text-[#D4AF37]", title: "Segment Insights",
      subtitle: "Groups by behaviour with next actions",
      content: data.segmentInsights.length === 0 ? (
        <p className="text-sm text-gray-400">Not enough data for segments yet.</p>
      ) : (
        <div className="space-y-2.5">
          {data.segmentInsights.map((seg, i) => (
            <div key={i} className="border-l-2 border-[#14B8A6] pl-3">
              <p className="text-sm font-medium text-[#1E3A5F]">{seg.segment} ({seg.count})</p>
              <p className="text-[12px] text-gray-500">{seg.nextAction}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: TrendingUp, iconColor: "text-[#D4AF37]", title: "Predicted Conversions",
      subtitle: "Contacts most likely to buy in 7 days",
      content: data.predictedConversions.length === 0 ? (
        <p className="text-sm text-gray-400">No predictions yet — add more contacts to enable forecasting.</p>
      ) : (
        <div className="space-y-2.5">
          {data.predictedConversions.map((pc, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1E3A5F]">{pc.name} <span className="text-gray-400 font-normal">({pc.likelihood})</span></p>
                <p className="text-[12px] text-gray-500">{pc.reason}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ABBY Avatar Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-md">
          <Star className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1E3A5F] font-heading">ABBY Intelligence</h3>
          <p className="text-[13px] text-gray-500">Your AI business advisor — updated just now</p>
        </div>
      </div>

      {/* 2×2 Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl shadow-md border-l-4 border-[#D4AF37] p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                <h4 className="text-[15px] font-bold text-[#1E3A5F]">{card.title}</h4>
              </div>
              <p className="text-[12px] text-gray-400 mb-3">{card.subtitle}</p>
              <div className="flex-1">{card.content}</div>
              <Button
                className="w-full mt-4 bg-[#D4AF37] text-[#1E3A5F] hover:bg-[#D4AF37]/90 font-semibold"
                size="sm"
                onClick={card.action}
              >
                Take Action →
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
