import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, BarChart3, Users, ArrowRight, Download, FileText } from "lucide-react";
import AbbyCoachingTip from "../social-media/AbbyCoachingTip";
import type { PodcastEpisode, PodcastConfig } from "./types";

interface Props {
  episodes: PodcastEpisode[];
  config: PodcastConfig;
  onNext: () => void;
  onBack: () => void;
}

export default function MonetizationKitStep({ episodes, config, onNext, onBack }: Props) {
  const totalDuration = useMemo(() => episodes.reduce((s, ep) => s + ep.duration_minutes, 0), [episodes]);
  const totalAdSlots = useMemo(() => episodes.reduce((s, ep) => s + ep.ad_markers.length, 0), [episodes]);

  const rateCard = {
    preRoll: { cpm: 18, description: "15-30 second ad at episode start" },
    midRoll: { cpm: 35, description: "60 second ad at natural content break" },
    postRoll: { cpm: 12, description: "15 second ad at episode end" },
  };

  // Estimate revenue at different audience sizes
  const revenueEstimates = [500, 1000, 5000, 10000].map(downloads => ({
    downloads,
    preRoll: Math.round((downloads / 1000) * rateCard.preRoll.cpm * episodes.length),
    midRoll: Math.round((downloads / 1000) * rateCard.midRoll.cpm * episodes.length),
    postRoll: Math.round((downloads / 1000) * rateCard.postRoll.cpm * episodes.length),
    total: Math.round((downloads / 1000) * (rateCard.preRoll.cpm + rateCard.midRoll.cpm + rateCard.postRoll.cpm) * episodes.length),
  }));

  const exportMediaKit = () => {
    const kit = `PODCAST SPONSORSHIP MEDIA KIT
${"=".repeat(50)}

SHOW: ${config.podcastTitle}
AUTHOR: Based on "${config.bookTitle}"
EPISODES: ${episodes.length} per season
TOTAL DURATION: ${totalDuration} minutes
AD SLOTS: ${totalAdSlots} across all episodes

AUDIENCE PROFILE
- Target: ${config.targetAudience || "Book readers and professionals"}
- Genre: Non-fiction / Personal Development
- Demographics: [Add your listener demographics here]
- Geographic: [Add your top listener countries]

SPONSORSHIP PACKAGES
─────────────────────

PRE-ROLL (15-30 seconds)
CPM Rate: $${rateCard.preRoll.cpm}
${rateCard.preRoll.description}

MID-ROLL (60 seconds, host-read)
CPM Rate: $${rateCard.midRoll.cpm}
${rateCard.midRoll.description}

POST-ROLL (15 seconds)
CPM Rate: $${rateCard.postRoll.cpm}
${rateCard.postRoll.description}

FULL SEASON PACKAGE (${episodes.length} episodes, all slots)
Contact for custom pricing — includes social media mentions and show notes link.

REVENUE PROJECTIONS
─────────────────────
${revenueEstimates.map(r => `${r.downloads.toLocaleString()} downloads/ep: $${r.total.toLocaleString()}/season`).join("\n")}

AD BREAK MARKERS PER EPISODE
─────────────────────
${episodes.map(ep => `Ep ${ep.episode_number}: ${ep.title}\n  ${ep.ad_markers.map(m => `  [${m.timestamp}] ${m.type.toUpperCase()}`).join("\n") || "  No markers"}`).join("\n\n")}

CONTACT
─────────────────────
[Add your email and booking link here]
`;

    const blob = new Blob([kit], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-kit-${config.podcastTitle.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AbbyCoachingTip
        title="Abby's Podcast Monetization Playbook"
        expandedByDefault
        tips={[
          "💰 CPM Rates 2026: Pre-roll $15-25, Mid-roll $25-50 (host-read), Post-roll $10-20. Your niche expertise commands premium rates.",
          "📊 You need ~500 downloads/episode to attract sponsors. Start with affiliate deals while building audience.",
          "🎯 The REAL money is in the funnel: Podcast → Book Sale → Course → Coaching. Each episode should advance listeners through this journey.",
          "📧 Every episode's show notes should include a lead magnet link. This is your #1 email list growth channel.",
          "🤝 Reach out to brands mentioned in your book — they're natural sponsor matches with high conversion rates.",
        ]}
      />

      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
          <DollarSign className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Monetization Kit</h2>
        <p className="text-sm text-muted-foreground">
          {episodes.length} episodes • {totalDuration} total minutes • {totalAdSlots} ad slots
        </p>
      </div>

      {/* Rate Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-secondary" />
            Sponsorship Rate Card (2026 Industry Rates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(rateCard).map(([key, val]) => (
              <div key={key} className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">{key.replace("Roll", "-Roll")}</p>
                <p className="text-3xl font-bold mt-1">${val.cpm}</p>
                <p className="text-[10px] text-muted-foreground mt-1">CPM (cost per 1,000 downloads)</p>
                <p className="text-xs text-muted-foreground mt-2">{val.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Projections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            Revenue Projections (Per Season)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Downloads/Episode</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Pre-Roll</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mid-Roll</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Post-Roll</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-foreground font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {revenueEstimates.map(r => (
                  <tr key={r.downloads} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{r.downloads.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">${r.preRoll.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">${r.midRoll.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">${r.postRoll.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-green-600">${r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            * Based on 2026 industry average CPM rates × {episodes.length} episodes with all ad slots filled
          </p>
        </CardContent>
      </Card>

      {/* Ad Markers Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ad Break Markers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {episodes.map(ep => (
              <div key={ep.id} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                <Badge variant="outline" className="text-[10px] shrink-0">Ep {ep.episode_number}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ep.title}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ep.ad_markers.length > 0 ? ep.ad_markers.map((m, i) => (
                      <Badge key={i} className={`text-[9px] ${m.type === "mid_roll" ? "bg-amber-500/10 text-amber-700" : m.type === "pre_roll" ? "bg-blue-500/10 text-blue-700" : "bg-green-500/10 text-green-700"}`}>
                        [{m.timestamp}] {m.type.replace("_", "-")}
                      </Badge>
                    )) : <span className="text-[10px] text-muted-foreground">No ad markers</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Button variant="outline" onClick={exportMediaKit} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download Sponsorship Media Kit (.txt)
      </Button>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} className="bg-primary px-8">
          Export & Distribute <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
