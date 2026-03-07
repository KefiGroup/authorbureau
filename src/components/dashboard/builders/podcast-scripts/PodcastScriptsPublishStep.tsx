import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Download, FileText, Eye, Mic, TrendingUp, Check, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import type { EpisodeCard, EpisodeScript, GuestGuide, PodcastScriptsConfig } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

export default function PodcastScriptsPublishStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const { toast } = useToast();
  const episodes: EpisodeCard[] = stepData.episodeRoadmap || [];
  const scripts: Record<string, EpisodeScript> = stepData.episodeScripts || {};
  const guides: Record<string, GuestGuide> = stepData.guestGuides || {};
  const config: PodcastScriptsConfig = stepData.podcastConfig || {};
  const [publishing, setPublishing] = useState(false);
  const [previewEp, setPreviewEp] = useState(0);

  const scriptsGenerated = Object.keys(scripts).length;
  const guidesGenerated = Object.keys(guides).length;
  const totalWordCount = Object.values(scripts).reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const totalMinutes = Object.values(scripts).reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

  const exportScriptsText = () => {
    let output = `# ${config.podcastName || bookTitle + " Podcast"}\n\n`;
    episodes.forEach(ep => {
      const script = scripts[ep.id];
      output += `## Episode ${ep.episodeNumber}: ${ep.title}\n\n`;
      if (script) {
        script.sections.forEach(s => {
          output += `### [${s.timeMarker}] ${s.label}\n${s.scriptText}\n\n`;
          if (s.speakerNotes) output += `> Speaker notes: ${s.speakerNotes}\n\n`;
        });
        output += `---\n### Show Notes\n${script.showNotes}\n\n`;
      } else {
        output += `(Script not yet generated)\n\n`;
      }
    });
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(config.podcastName || "podcast").replace(/\s+/g, "-")}-scripts.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Scripts exported!" });
  };

  const exportShowNotes = () => {
    let output = "";
    episodes.forEach(ep => {
      const script = scripts[ep.id];
      output += `Episode ${ep.episodeNumber}: ${ep.title}\n`;
      output += `${"=".repeat(50)}\n`;
      output += script?.showNotes || "(Not generated)";
      output += "\n\n";
    });
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(config.podcastName || "podcast").replace(/\s+/g, "-")}-show-notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Show notes exported!" });
  };

  const handlePublish = async () => {
    setPublishing(true);
    setTimeout(() => {
      setStepData(prev => ({ ...prev, publishedAt: new Date().toISOString() }));
      onMarkEdited("publish");
      setPublishing(false);
      toast({ title: "Podcast scripts published!", description: "Your scripts are saved and ready for production." });
    }, 2000);
  };

  const selectedEp = episodes[previewEp];
  const selectedScript = selectedEp ? scripts[selectedEp.id] : null;

  return (
    <div className="space-y-6">
      {/* Abby projection */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Growth Projection</p>
            <p className="text-sm text-muted-foreground">
              A consistent podcast builds authority faster than any other channel. After 20 episodes, most authors see a 200-400% increase in website traffic and a significant boost in book sales.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Episodes", value: episodes.length, icon: Mic },
          { label: "Scripts", value: `${scriptsGenerated}/${episodes.length}`, icon: FileText },
          { label: "Total Words", value: totalWordCount.toLocaleString(), icon: FileText },
          { label: "Total Runtime", value: `~${totalMinutes} min`, icon: Mic },
        ].map(stat => (
          <Card key={stat.label} className="p-3 text-center">
            <stat.icon className="h-4 w-4 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Preview tabs */}
      <Tabs defaultValue="scripts">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="scripts" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" /> Scripts
          </TabsTrigger>
          <TabsTrigger value="show-notes" className="text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" /> Show Notes
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs">
            <Mic className="h-3.5 w-3.5 mr-1" /> Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="mt-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {episodes.map((ep, i) => (
              <button
                key={ep.id}
                onClick={() => setPreviewEp(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === previewEp ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Ep {ep.episodeNumber}
              </button>
            ))}
          </div>
          {selectedScript ? (
            <Card className="p-4 max-h-[400px] overflow-y-auto">
              {selectedScript.sections.map(s => (
                <div key={s.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px] font-mono">{s.timeMarker}</Badge>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.scriptText}</p>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">Script not yet generated for this episode.</Card>
          )}
        </TabsContent>

        <TabsContent value="show-notes" className="mt-4">
          {selectedScript?.showNotes ? (
            <Card className="p-4 max-h-[400px] overflow-y-auto">
              <MarkdownRenderer content={selectedScript.showNotes} />
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">No show notes available.</Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-2">
            {episodes.map(ep => (
              <Card key={ep.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold flex items-center justify-center">
                    {ep.episodeNumber}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{ep.title}</p>
                    <p className="text-[10px] text-muted-foreground">{ep.keyTopic}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {scripts[ep.id] && <Badge className="bg-accent/10 text-accent text-[9px]">Script ✓</Badge>}
                  {guides[ep.id] && <Badge className="bg-violet-500/10 text-violet-600 text-[9px]">Guide ✓</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Export & Publish */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" onClick={exportScriptsText}>
          <Download className="h-4 w-4 mr-2" /> Export Scripts (MD)
        </Button>
        <Button variant="outline" onClick={exportShowNotes}>
          <Download className="h-4 w-4 mr-2" /> Export Show Notes
        </Button>
        <div className="flex-1" />
        {stepData.publishedAt ? (
          <Button disabled className="rounded-full">
            <Check className="h-4 w-4 mr-2" /> Published
          </Button>
        ) : (
          <Button onClick={handlePublish} disabled={publishing || scriptsGenerated === 0} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {publishing ? "Publishing..." : "Publish Scripts"}
          </Button>
        )}
      </div>
    </div>
  );
}
