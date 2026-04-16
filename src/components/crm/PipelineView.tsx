import { useState } from "react";
import { Star, Mail, Calendar, UserPlus } from "lucide-react";

interface CRMContact {
  id: string;
  full_name: string;
  email: string | null;
  stage: string;
  abby_score: number;
  source: string;
  last_activity_at: string | null;
  tags: string[];
}

interface Props {
  contacts: CRMContact[];
  onContactClick: (contact: CRMContact) => void;
  onStageChange: (contactId: string, newStage: string) => void;
}

const STAGES = [
  { key: "new_lead", label: "New Lead", color: "#3B82F6", dot: "bg-[#3B82F6]" },
  { key: "engaged", label: "Engaged", color: "#14B8A6", dot: "bg-[#14B8A6]" },
  { key: "warm", label: "Warm", color: "#F59E0B", dot: "bg-[#F59E0B]" },
  { key: "hot", label: "Hot", color: "#EF4444", dot: "bg-[#EF4444]" },
  { key: "customer", label: "Customer", color: "#10B981", dot: "bg-[#10B981]" },
  { key: "vip", label: "VIP", color: "#D4AF37", dot: "bg-[#D4AF37]" },
  { key: "cold", label: "Cold", color: "#6B7280", dot: "bg-[#6B7280]" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function PipelineView({ contacts, onContactClick, onStageChange }: Props) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const contactsByStage = STAGES.reduce((acc, s) => {
    acc[s.key] = contacts.filter((c) => c.stage === s.key);
    return acc;
  }, {} as Record<string, CRMContact[]>);

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData("contactId", contactId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData("contactId");
    if (contactId) onStageChange(contactId, stageKey);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 420 }}>
      {STAGES.map((stage) => {
        const count = contactsByStage[stage.key].length;
        return (
          <div
            key={stage.key}
            className={`flex-shrink-0 w-[240px] rounded-xl bg-white border flex flex-col transition-all ${
              dragOverStage === stage.key ? "ring-2 ring-[#D4AF37] shadow-md" : "shadow-sm"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            {/* Column header with top border */}
            <div
              className="px-3 py-2.5 rounded-t-xl bg-white"
              style={{ borderTop: `3px solid ${stage.color}` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                  <span className="text-[13px] font-bold text-[#1E3A5F]">{stage.label}</span>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: stage.color }}
                >
                  {count}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div
              className="flex-1 p-2 space-y-2 overflow-y-auto"
              style={{
                maxHeight: "calc(100vh - 380px)",
                backgroundColor: `${stage.color}08`,
              }}
            >
              {count === 0 ? (
                <div className="text-center py-8 px-3">
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${stage.color}20` }}
                  >
                    <UserPlus className="h-4 w-4" style={{ color: stage.color }} />
                  </div>
                  <p className="text-[13px] text-gray-500 leading-snug">
                    No {stage.label.toLowerCase()} leads yet
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    ABBY will alert you when someone moves here.
                  </p>
                </div>
              ) : (
                contactsByStage[stage.key].map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    onClick={() => onContactClick(c)}
                    className="rounded-lg bg-white shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all cursor-pointer p-3"
                    style={{ borderLeft: `3px solid ${stage.color}` }}
                  >
                    {/* Name row with avatar */}
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: stage.color }}
                      >
                        {getInitials(c.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1E3A5F] truncate">{c.full_name}</p>
                        {c.email && (
                          <p className="text-[12px] text-gray-400 truncate">{c.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Source + Score */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {c.source?.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-[#D4AF37] fill-[#D4AF37]" />
                        <span className="text-[11px] font-semibold text-[#1E3A5F]">{c.abby_score}</span>
                      </div>
                    </div>

                    {/* Date */}
                    {c.last_activity_at && (
                      <p className="text-[11px] text-gray-400 mt-1.5 text-right">
                        {new Date(c.last_activity_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
