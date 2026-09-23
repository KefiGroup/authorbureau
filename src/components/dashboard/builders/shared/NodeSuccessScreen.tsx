import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Copy, Share2, ExternalLink, Download,
  Sparkles, ArrowRight, Globe, CreditCard, Link2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NODE_NAMES, getMicrositeUrl, NO_MICROSITE_NODES } from "@/lib/node-slug-map";
import { useBookSlug } from "@/hooks/useBookSlug";

export interface SuccessAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;        // opens in new tab
  variant?: "default" | "outline" | "secondary";
}

export interface PaymentLinkItem {
  label: string;
  url: string;
  price?: string;
}

interface Props {
  nodeId: string;
  authorName: string;
  penNameSlug: string;
  celebrationMessage: string;
  /** Custom URL — if not provided, auto-generated from node slug map */
  micrositeUrl?: string | null;
  /** Third-party platform URL (e.g. Thinkific, Transistor) */
  thirdPartyUrl?: string | null;
  thirdPartyLabel?: string;
  /** Stripe payment links */
  paymentLinks?: PaymentLinkItem[];
  /** Download/export buttons */
  downloads?: SuccessAction[];
  /** "What happens next" bullet points (max 3) */
  whatHappensNext?: string[];
  /** Pre-written social post for sharing */
  socialShareText?: string;
  /** Extra action buttons */
  actions?: SuccessAction[];
}

function copyToClipboard(text: string, label: string = "Link") {
  navigator.clipboard.writeText(text);
  toast({ title: `${label} copied!`, description: text });
}

export default function NodeSuccessScreen({
  nodeId,
  authorName,
  penNameSlug,
  celebrationMessage,
  micrositeUrl: customMicrositeUrl,
  thirdPartyUrl,
  thirdPartyLabel,
  paymentLinks,
  downloads,
  whatHappensNext,
  socialShareText,
  actions,
}: Props) {
  const nodeName = NODE_NAMES[nodeId] || nodeId;
  const hasPublicPage = !NO_MICROSITE_NODES.has(nodeId);
  // The live link must carry the book segment, otherwise it opens whichever
  // book happens to match the module first.
  const bookSlug = useBookSlug();
  const micrositeUrl = customMicrositeUrl ?? (hasPublicPage ? getMicrositeUrl(penNameSlug, nodeId, bookSlug) : null);

  const defaultSocialText = socialShareText ||
    `I just launched my ${nodeName.toLowerCase()} with @AuthorsBureau! Check it out: ${micrositeUrl || ""}`;

  return (
    <div className="space-y-6">
      {/* Celebration Header */}
      <Card className="p-6 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mb-1">
              Congratulations, {authorName}! 🎉
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
              {celebrationMessage}
            </p>
          </div>
        </div>
      </Card>

      {/* Live URL Card */}
      {micrositeUrl && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Your Live Page</h3>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              LIVE
            </Badge>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground font-mono truncate flex-1">
              {micrositeUrl}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => copyToClipboard(micrositeUrl, "URL")}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                copyToClipboard(defaultSocialText, "Social post");
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              asChild
            >
              <a href={micrositeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Card>
      )}

      {/* Third-party URL */}
      {thirdPartyUrl && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{thirdPartyLabel || "Platform Link"}</h3>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <span className="text-sm text-foreground font-mono truncate flex-1">
              {thirdPartyUrl}
            </span>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(thirdPartyUrl)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={thirdPartyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Card>
      )}

      {/* Payment Links */}
      {paymentLinks && paymentLinks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Payment Links</h3>
          </div>
          <div className="space-y-2">
            {paymentLinks.map((pl, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{pl.label}</span>
                  {pl.price && (
                    <span className="text-xs text-muted-foreground ml-2">{pl.price}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs"
                  onClick={() => copyToClipboard(pl.url, pl.label)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy Link
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Downloads */}
      {downloads && downloads.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Downloads & Exports</h3>
          <div className="flex flex-wrap gap-2">
            {downloads.map((dl, i) => (
              <Button
                key={i}
                variant={dl.variant || "outline"}
                size="sm"
                onClick={dl.onClick}
                asChild={!!dl.href}
              >
                {dl.href ? (
                  <a href={dl.href} target="_blank" rel="noopener noreferrer">
                    {dl.icon || <Download className="h-3.5 w-3.5 mr-1.5" />}
                    {dl.label}
                  </a>
                ) : (
                  <>
                    {dl.icon || <Download className="h-3.5 w-3.5 mr-1.5" />}
                    {dl.label}
                  </>
                )}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* What Happens Next */}
      {whatHappensNext && whatHappensNext.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">What Happens Next</h3>
          <div className="space-y-2">
            {whatHappensNext.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Share Your Node */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Share Your {nodeName}</h3>
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <p className="text-sm text-muted-foreground italic">{defaultSocialText}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => copyToClipboard(defaultSocialText, "Social post")}
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Post
        </Button>
      </Card>

      {/* Extra Actions */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant || "default"}
              onClick={action.onClick}
              asChild={!!action.href}
            >
              {action.href ? (
                <a href={action.href} target="_blank" rel="noopener noreferrer">
                  {action.icon}
                  {action.label}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </a>
              ) : (
                <>
                  {action.icon}
                  {action.label}
                </>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
