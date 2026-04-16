import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Star, Mail, Calendar } from "lucide-react";

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
  { key: "new_lead", label: "New Lead", color: "border-l-blue-500", bg: "bg-blue-500/10" },
  { key: "engaged", label: "Engaged", color: "border-l-teal-500", bg: "bg-teal-500/10" },
  { key: "warm", label: "Warm", color: "border-l-amber-500", bg: "bg-amber-500/10" },
  { key: "hot", label: "Hot", color: "border-l-orange-500", bg: "bg-orange-500/10" },
  { key: "customer", label: "Customer", color: "border-l-green-500", bg: "bg-green-500/10" },
  { key: "vip", label: "VIP", color: "border-l-yellow-500", bg: "bg-yellow-500/10" },
  { key: "cold", label: "Cold", color: "border-l-gray-500", bg: "bg-gray-500/10" },
];

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
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {STAGES.map((stage) => (
        <div
          key={stage.key}
          className={`flex-shrink-0 w-[200px] rounded-xl border bg-card/50 flex flex-col ${
            dragOverStage === stage.key ? "ring-2 ring-primary" : ""
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
          onDragLeave={() => setDragOverStage(null)}
          onDrop={(e) => handleDrop(e, stage.key)}
        >
          {/* Column header */}
          <div className={`px-3 py-2.5 border-b ${stage.bg} rounded-t-xl`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{stage.label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {contactsByStage[stage.key].length}
              </Badge>
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
            {contactsByStage[stage.key].length === 0 ? (
              <div className="text-center py-6 px-2">
                <p className="text-[10px] text-muted-foreground italic">
                  No {stage.label.toLowerCase()} leads yet — ABBY will alert you when someone moves here.
                </p>
              </div>
            ) : (
              contactsByStage[stage.key].map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onClick={() => onContactClick(c)}
                  className={`rounded-lg border ${stage.color} border-l-4 bg-card p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`}
                >
                  <p className="text-xs font-semibold truncate">{c.full_name}</p>
                  {c.email && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="h-2.5 w-2.5 shrink-0" /> {c.email}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {c.source?.replace(/_/g, " ")}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-[10px] font-semibold">{c.abby_score}</span>
                    </div>
                  </div>
                  {c.last_activity_at && (
                    <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1 mt-1">
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(c.last_activity_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
