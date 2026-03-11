import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Lock } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { WebsiteConfig } from "./types";
import { SITE_TYPE_LABELS, TEMPLATE_OPTIONS, FONT_PAIRINGS, COLOR_SCHEMES } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  plan: any;
}

export default function WebsiteSetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: Props) {
  const config: WebsiteConfig = stepData["setup"]?.config || {
    siteType: "landing",
    subdomain: bookTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30),
    template: "expert-authority",
    colorScheme: "auto",
    fontPairing: "playfair-lato",
  };

  const updateConfig = (patch: Partial<WebsiteConfig>) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, config: { ...config, ...patch } } }));
    onMarkEdited("setup");
  };

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Your website is the hub that connects all your products. I recommend starting with a <strong>landing page that captures emails</strong>, then expanding to a full site as you add products.
        </p>
      </AbbyRecommendationCard>

      {/* Site Type */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Site Type</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(SITE_TYPE_LABELS).map(([key, info]) => (
            <button
              key={key}
              onClick={() => updateConfig({ siteType: key as WebsiteConfig["siteType"] })}
              className={`text-left rounded-lg border px-4 py-3 transition-all ${
                config.siteType === key
                  ? "border-secondary bg-secondary/5 ring-2 ring-secondary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-medium">{info.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{info.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Domain */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-2 block">Domain</Label>
        <div className="flex items-center gap-2">
          <Input
            value={config.subdomain}
            onChange={e => updateConfig({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            className="text-sm max-w-[200px]"
            placeholder="yourname"
          />
          <span className="text-sm text-muted-foreground">.authorsbureau.com</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Custom domain (e.g., yourname.com) available on Enterprise plan</p>
        </div>
      </Card>

      {/* Design Template */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Design Template</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATE_OPTIONS.map(t => (
            <button
              key={t.id}
              onClick={() => updateConfig({ template: t.id })}
              className={`text-left rounded-lg border p-4 transition-all ${
                config.template === t.id
                  ? "border-secondary bg-secondary/5 ring-2 ring-secondary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="h-12 rounded bg-muted/50 mb-3 flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-semibold">{t.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Color Scheme */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Color Scheme</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_SCHEMES.map(cs => (
            <button
              key={cs.id}
              onClick={() => updateConfig({ colorScheme: cs.id })}
              className={`rounded-lg border p-3 transition-all ${
                config.colorScheme === cs.id
                  ? "border-secondary ring-2 ring-secondary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex gap-1 mb-2">
                {cs.colors.map((c, i) => (
                  <div key={i} className="h-6 flex-1 rounded" style={{ backgroundColor: c }} />
                ))}
              </div>
              <p className="text-[10px] font-medium">{cs.name}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Font Pairing */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Font Pairing</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FONT_PAIRINGS.map(fp => (
            <button
              key={fp.id}
              onClick={() => updateConfig({ fontPairing: fp.id })}
              className={`text-left rounded-lg border p-3 transition-all ${
                config.fontPairing === fp.id
                  ? "border-secondary bg-secondary/5 ring-2 ring-secondary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-bold">{fp.display}</p>
              <p className="text-[10px] text-muted-foreground">{fp.body}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-semibold">Summary</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {SITE_TYPE_LABELS[config.siteType]?.label} • {config.subdomain}.authorsbureau.com • {TEMPLATE_OPTIONS.find(t => t.id === config.template)?.name} • {COLOR_SCHEMES.find(c => c.id === config.colorScheme)?.name}
        </p>
      </Card>
    </div>
  );
}
