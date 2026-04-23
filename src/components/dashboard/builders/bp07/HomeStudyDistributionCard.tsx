import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink, FileDown, GraduationCap as PortalIcon, Copy, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { downloadBuilderPackage } from "@/lib/builder-pdf";

interface Channels {
  readers_bureau: boolean;
  thinkific: boolean;
  email_pdf: boolean;
}

interface Props {
  channels: Channels;
  content: any;
  authorSlug: string;
  variant?: "preview" | "success";
}

export default function HomeStudyDistributionCard({ channels, content, authorSlug, variant = "success" }: Props) {
  const navigate = useNavigate();
  const thinkificUrl: string | undefined = content?.thinkific_url;
  const thinkificLive = content?.thinkific_status === "live";

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h3 className="font-bold">{variant === "success" ? "Your distribution channels are live" : "What this means for buyers"}</h3>
        </div>

        {/* Readers Bureau — always on */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
          <div className="flex items-center gap-2">
            <PortalIcon className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Readers Bureau portal</p>
            <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">Active</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Buyers automatically receive a private learner link by email after purchase. No setup needed — you can inspect a sample in <button type="button" className="underline text-primary" onClick={() => navigate("/marketing-hub?tab=emails")}>Marketing Hub → Email logs</button>.
          </p>
        </div>

        {/* Thinkific — manual upload workflow */}
        {channels.thinkific && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Thinkific (manual upload)</p>
              <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Self-serve</span>
            </div>

            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-semibold text-amber-900">
                    Authors Bureau doesn't connect to Thinkific directly. We give you a packaged export — you upload it to Thinkific yourself.
                  </p>
                  <ol className="text-xs text-amber-900 space-y-1 list-decimal pl-4">
                    <li>Download your Home Study Course package below (PDF with all 21 days, exercises, sales copy).</li>
                    <li>Log in to Thinkific and create a new course.</li>
                    <li>Paste each day's content as a lesson, or upload the PDF as a downloadable resource.</li>
                    <li>Add your Thinkific course URL back here so buyers receive it in their confirmation email.</li>
                  </ol>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadBuilderPackage({ content, nodeName: "Home Study Course", bookTitle: content?.programme_title || "Home Study Course", authorName: "" })}>
                      <Download className="h-3 w-3 mr-1" /> Download package
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open("https://www.thinkific.com/", "_blank", "noopener")}>
                      Open Thinkific →
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {thinkificUrl && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground shrink-0">Your Thinkific URL:</span>
                <a href={thinkificUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all flex-1">
                  {thinkificUrl}
                </a>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(thinkificUrl)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            {thinkificLive && (
              <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-700 px-1.5 py-0.5 rounded inline-block">Live on Thinkific</span>
            )}
          </div>
        )}
        {channels.email_pdf && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Printable PDF bundle</p>
              <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Auto</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Buyers receive a download link in their confirmation email pointing to{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">/{authorSlug}/home-study-bundle/{`{purchaseId}`}</code>. No upload needed — the PDF is generated from your published lessons.
            </p>
          </div>
        )}

        {!channels.thinkific && !channels.email_pdf && variant === "preview" && (
          <p className="text-xs text-muted-foreground italic">
            Tick Thinkific or PDF bundle above to add additional delivery channels for your buyers.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
