import { useEffect, useState } from "react";
import { Star, UserPlus, ArrowRight, Loader2 } from "lucide-react";

interface StageSummary {
  stage: string;
  count: number;
  top3: { id: string; full_name: string; abby_score: number }[];
}

interface Props {
  crmFetch: (action: string, extra?: Record<string, any>) => Promise<any>;
  onContactClick: (contact: any) => void;
  onViewStage: (stage: string) => void;
}

const STAGES = [
  { key: "new_lead", label: "New Lead", color: "#3B82F6" },
  { key: "engaged", label: "Engaged", color: "#14B8A6" },
  { key: "warm", label: "Warm", color: "#F59E0B" },
  { key: "hot", label: "Hot", color: "#EF4444" },
  { key: "customer", label: "Customer", color: "#10B981" },
  { key: "vip", label: "VIP", color: "#D4AF37" },
  { key: "cold", label: "Cold", color: "#6B7280" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function PipelineView({ crmFetch, onContactClick, onViewStage }: Props) {
  const [summaries, setSummaries] = useState<StageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    crmFetch("pipeline-summary")
      .then((d) => setSummaries(d.summary || []))
      .catch(() => setSummaries([]))
      .finally(() => setLoading(false));
  }, [crmFetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  const summaryMap = summaries.reduce((acc, s) => {
    acc[s.stage] = s;
    return acc;
  }, {} as Record<string, StageSummary>);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {STAGES.map((stage) => {
        const data = summaryMap[stage.key] || { stage: stage.key, count: 0, top3: [] };

        return (
          <div
            key={stage.key}
            className="rounded-xl bg-white border shadow-sm flex flex-col overflow-hidden"
            style={{ borderTop: `3px solid ${stage.color}` }}
          >
            <div className="px-3 pt-4 pb-2 text-center">
              <p className="text-3xl font-bold leading-none" style={{ color: stage.color }}>
                {data.count}
              </p>
              <p className="text-[12px] font-semibold text-[#1E3A5F] mt-1 uppercase tracking-wide">
                {stage.label}
              </p>
            </div>

            <div className="flex-1 px-2 pb-2 space-y-1">
              {data.count === 0 ? (
                <div className="text-center py-4 px-2">
                  <UserPlus className="h-4 w-4 mx-auto mb-1 opacity-30" style={{ color: stage.color }} />
                  <p className="text-[11px] text-gray-400 leading-tight">
                    No {stage.label.toLowerCase()} leads yet
                  </p>
                </div>
              ) : (
                data.top3.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onContactClick(c)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: stage.color }}
                    >
                      {getInitials(c.full_name)}
                    </div>
                    <span className="text-[12px] font-medium text-[#1E3A5F] truncate flex-1">
                      {c.full_name}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star className="h-2.5 w-2.5 text-[#D4AF37] fill-[#D4AF37]" />
                      <span className="text-[10px] font-semibold text-[#1E3A5F]">{c.abby_score}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {data.count > 0 && (
              <button
                onClick={() => onViewStage(stage.key)}
                className="flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold border-t border-gray-100 transition-colors hover:bg-gray-50"
                style={{ color: stage.color }}
              >
                View all {data.count} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
