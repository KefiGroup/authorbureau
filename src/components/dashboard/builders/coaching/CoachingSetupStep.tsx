import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Video, Phone, MapPin, Layers } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { CoachingConfig, PackageStructure, SessionDuration, DeliveryMode } from "./types";
import { STRUCTURE_LABELS, DURATION_LABELS, DELIVERY_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  plan: any;
}

export default function CoachingSetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: Props) {
  const config: CoachingConfig = stepData.coachingConfig || {
    packageName: plan?.coaching?.name || `${bookTitle} Coaching`,
    focusArea: plan?.coaching?.focus || "",
    structure: "12-week" as PackageStructure,
    sessionDuration: "60" as SessionDuration,
    price: plan?.coaching?.price || 2497,
    deliveryMode: "video" as DeliveryMode,
  };

  const update = (patch: Partial<CoachingConfig>) => {
    onMarkEdited("packages");
    setStepData(prev => ({ ...prev, coachingConfig: { ...config, ...patch } }));
  };

  const deliveryIcons: Record<string, React.ReactNode> = {
    video: <Video className="h-4 w-4" />,
    phone: <Phone className="h-4 w-4" />,
    "in-person": <MapPin className="h-4 w-4" />,
    hybrid: <Layers className="h-4 w-4" />,
  };

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Your book's transformation maps perfectly to a 12-week coaching program. I recommend packaging it at <strong>$1,997–$2,997</strong> — that's the sweet spot for author-coaches in your genre.
        </p>
      </AbbyRecommendationCard>

      {/* Package Name & Focus */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Package Name</Label>
          <Input value={config.packageName} onChange={e => update({ packageName: e.target.value })} placeholder="e.g. Transformation Accelerator" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Coaching Focus Area</Label>
          <Input value={config.focusArea} onChange={e => update({ focusArea: e.target.value })} placeholder="Derived from your book's core transformation" />
        </div>
      </div>

      {/* Package Structure */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Package Structure</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(STRUCTURE_LABELS) as [PackageStructure, typeof STRUCTURE_LABELS[PackageStructure]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => update({ structure: key })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                config.structure === key
                  ? "border-secondary bg-secondary/5 shadow-sm"
                  : "border-border hover:border-secondary/40"
              }`}
            >
              <p className="text-sm font-semibold mb-0.5">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{meta.sessions} session{meta.sessions > 1 ? "s" : ""}</p>
              <Badge variant="outline" className="mt-2 text-[10px]">{meta.priceRange}</Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Session Duration */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Session Duration</Label>
        <div className="flex gap-2 flex-wrap">
          {(Object.entries(DURATION_LABELS) as [SessionDuration, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => update({ sessionDuration: key })}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                config.sessionDuration === key
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border text-muted-foreground hover:border-secondary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Package Price (USD)</Label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-muted-foreground">$</span>
          <Input
            type="number"
            value={config.price}
            onChange={e => update({ price: parseInt(e.target.value) || 0 })}
            className="max-w-[180px]"
          />
          {config.structure !== "single" && (
            <span className="text-xs text-muted-foreground">
              (${Math.round(config.price / STRUCTURE_LABELS[config.structure].sessions)}/session)
            </span>
          )}
        </div>
      </div>

      {/* Delivery Mode */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Delivery Method</Label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(DELIVERY_LABELS) as DeliveryMode[]).map(key => (
            <button
              key={key}
              onClick={() => update({ deliveryMode: key })}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                config.deliveryMode === key
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border text-muted-foreground hover:border-secondary/40"
              }`}
            >
              {deliveryIcons[key]}
              {DELIVERY_LABELS[key].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
