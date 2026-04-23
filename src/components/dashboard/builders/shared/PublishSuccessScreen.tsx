import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink, Link2, ArrowRight, Sparkles, Library } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NODE_NAMES, getMicrositeUrl, NO_MICROSITE_NODES } from "@/lib/node-slug-map";

/** Maps node IDs to marketing hub campaign highlight IDs */
const NODE_TO_CAMPAIGN: Record<string, string> = {
  "BP-01": "email-marketing",
  "BP-02": "lead-magnets",
  "BP-03": "social-media",
  "BP-04": "website-microsite",
  "BP-05": "webinars",
  "BP-06": "digital-products",
  "BP-07": "digital-products",
  "BP-08": "digital-products",
  "BP-09": "digital-products",
  "BA-10": "build-authority",
  "BA-11": "build-authority",
  "BA-12": "build-authority",
  "BA-13": "build-authority",
  "BA-14": "build-authority",
  "BA-15": "build-authority",
  "BA-16": "build-authority",
  "BA-17": "build-authority",
  "BA-18": "build-authority",
  "YR-19": "yield-revenue",
  "YR-20": "yield-revenue",
  "YR-21": "yield-revenue",
  "YR-22": "yield-revenue",
  "YR-23": "yield-revenue",
  "YR-24": "yield-revenue",
  "YR-25": "yield-revenue",
  "YR-26": "yield-revenue",
  "YR-27": "yield-revenue",
  "YR-28": "yield-revenue",
};

/** Hub section to navigate back to */
const NODE_TO_HUB: Record<string, { label: string; path: string }> = {
  BP: { label: "Brand Products", path: "/brand-products" },
  BA: { label: "Build Authority", path: "/build-authority" },
  YR: { label: "Yield Revenue", path: "/yield-revenue" },
};

interface Props {
  nodeId: string;
  authorName: string;
  penNameSlug: string;
  /** Override ABBY message for no-microsite nodes */
  abbyMessage?: string;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast({ title: "Copied!", description: text });
}

export default function PublishSuccessScreen({ nodeId, authorName, penNameSlug, abbyMessage }: Props) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const nodeName = NODE_NAMES[nodeId] || nodeId;
  const hasPublicPage = !NO_MICROSITE_NODES.has(nodeId);
  const micrositeUrl = hasPublicPage ? getMicrositeUrl(penNameSlug, nodeId) : null;
  const campaignId = NODE_TO_CAMPAIGN[nodeId] || "email-marketing";
  const prefix = nodeId.substring(0, 2);
  const hub = NODE_TO_HUB[prefix] || NODE_TO_HUB.BP;

  const handleCopy = () => {
    if (micrositeUrl) {
      copyToClipboard(micrositeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const defaultAbbyMessage = hasPublicPage
    ? `Now let me activate your marketing campaign so I can automatically promote your ${nodeName} to every new reader who finds you.`
    : `Your ${nodeName.toLowerCase()} is now running automatically. Every new contact will receive your welcome sequence.`;

  return (
    <div className="space-y-6">
      {/* Green checkmark celebration */}
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4 animate-in zoom-in duration-500">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Your {nodeName} is now live! 🎉</h2>
        <p className="text-sm text-muted-foreground">Congratulations, {authorName}!</p>
      </div>

      {/* Shareable URL card — only for nodes with microsites */}
      {micrositeUrl && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Your live link</h3>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <span className="text-sm text-foreground font-mono truncate flex-1">{micrositeUrl}</span>
            <Button size="sm" variant="ghost" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={micrositeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Card>
      )}

      {/* ABBY says card */}
      <Card className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Abby says</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">{abbyMessage || defaultAbbyMessage}</p>
          </div>
        </div>
      </Card>

      {/* Primary CTA */}
      {hasPublicPage ? (
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate(`/dashboard?section=marketing-hub&highlight=${campaignId}`)}
        >
          Activate My Marketing Campaign <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate("/dashboard?section=marketing-hub")}
        >
          View My Marketing Hub <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      {/* Secondary links */}
      <div className="flex flex-col items-center gap-1">
        <Button variant="link" className="text-sm" onClick={() => navigate("/dashboard?section=library")}>
          <Library className="h-4 w-4 mr-1.5" />Open in My Library
        </Button>
        <Button variant="link" className="text-sm text-muted-foreground" onClick={() => navigate(hub.path)}>
          Go back to {hub.label}
        </Button>
      </div>
    </div>
  );
}
