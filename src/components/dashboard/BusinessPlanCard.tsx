import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, Crown, Sparkles, Users, Rocket, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printExportHtml } from "@/lib/print-export";

interface PlanProduct {
  node: string;
  title: string;
  pricing: string;
  monthly_revenue_low: string;
  monthly_revenue_high: string;
  reasoning: string;
}

interface PlanPackage {
  label: string;
  tagline: string;
  timeline: string;
  products: PlanProduct[];
  monthly_revenue_low: string;
  monthly_revenue_high: string;
  includes_consultation?: boolean;
  consultation_note?: string;
}

export interface AbbyPlan {
  summary: string;
  target_audience: string;
  core_framework: string;
  book_title: string;
  author_name: string;
  packages: {
    starter: PlanPackage;
    pro: PlanPackage;
    enterprise: PlanPackage;
  };
  subscriber_count: string;
  annual_projection_low: string;
  annual_projection_high: string;
  roi_breakeven: string;
  abbys_promise: string;
}

const tierConfig = [
  { key: "brand" as const, emoji: "🟢", color: "border-green-500/30 bg-green-500/5", badge: "bg-green-500/15 text-green-700" },
  { key: "build" as const, emoji: "🔵", color: "border-blue-500/30 bg-blue-500/5", badge: "bg-blue-500/15 text-blue-700" },
  { key: "yield" as const, emoji: "🟣", color: "border-violet-500/30 bg-violet-500/5", badge: "bg-violet-500/15 text-violet-700" },
];

function generatePlanHTML(plan: AbbyPlan): string {
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const pkgs = [plan.packages.starter, plan.packages.pro, plan.packages.enterprise];
  const tierEmojis = ["🟢", "🔵", "🟣"];

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: 'Calibri', 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 28px; color: #B8860B; border-bottom: 3px solid #B8860B; padding-bottom: 12px; margin-bottom: 8px; }
  h2 { font-size: 20px; color: #333; margin-top: 32px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
  h3 { font-size: 16px; color: #555; margin-top: 20px; }
  .subtitle { font-size: 14px; color: #666; margin-bottom: 24px; }
  .meta { font-size: 13px; color: #888; margin-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
  th { background: #f5f0e6; font-weight: 600; color: #333; }
  .highlight { background: #fdf6e3; padding: 16px; border-left: 4px solid #B8860B; margin: 16px 0; font-size: 13px; }
  .promise { background: #f0f7ff; padding: 16px; border-left: 4px solid #4a90d9; margin: 20px 0; font-style: italic; font-size: 13px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #e0e0e0; font-size: 11px; color: #999; text-align: center; }
  .enterprise-note { background: #f3e8ff; padding: 12px 16px; border-radius: 6px; margin-top: 8px; font-size: 13px; color: #6b21a8; }
</style></head><body>

<h1>📋 Your ABBY Business Plan</h1>
<p class="subtitle">Prepared by Abby — Your AI Business Consultant at Authors Bureau</p>
<p class="meta"><strong>Author:</strong> ${plan.author_name}</p>
<p class="meta"><strong>Book:</strong> ${plan.book_title}</p>
<p class="meta"><strong>Core Framework:</strong> ${plan.core_framework}</p>
<p class="meta"><strong>Target Audience:</strong> ${plan.target_audience}</p>
<p class="meta"><strong>Date:</strong> ${now}</p>

<div class="highlight">
  <strong>Executive Summary:</strong> ${plan.summary}
</div>

${pkgs.map((pkg, i) => `
<h2>${tierEmojis[i]} ${pkg.label} — ${pkg.tagline}</h2>
<h3>Timeline: ${pkg.timeline}</h3>
<table>
  <tr><th>Product</th><th>Pricing</th><th>Monthly Revenue (Est.)</th><th>Rationale</th></tr>
  ${pkg.products.map(p => `
  <tr>
    <td><strong>${p.title}</strong></td>
    <td>${p.pricing}</td>
    <td>${p.monthly_revenue_low} – ${p.monthly_revenue_high}</td>
    <td>${p.reasoning}</td>
  </tr>`).join("")}
</table>
<p><strong>Package Revenue Estimate:</strong> ${pkg.monthly_revenue_low} – ${pkg.monthly_revenue_high}/month</p>
${pkg.includes_consultation ? `<div class="enterprise-note">✨ <strong>Includes:</strong> ${pkg.consultation_note}</div>` : ""}
`).join("")}

<h2>📊 12-Month Revenue Projection</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Annual Projection (Conservative)</td><td>${plan.annual_projection_low}</td></tr>
  <tr><td>Annual Projection (Optimistic)</td><td>${plan.annual_projection_high}</td></tr>
  <tr><td>Current Subscribers</td><td>${plan.subscriber_count}</td></tr>
  <tr><td>ROI Breakeven</td><td>${plan.roi_breakeven}</td></tr>
</table>

<div class="promise">
  <strong>💛 Abby's Promise:</strong><br/>
  ${plan.abbys_promise}
</div>

<div class="footer">
  <p>Generated by Authors Bureau — AI Marketing Studio</p>
  <p>The ABBY Framework: Analyze · Brand · Build · Yield</p>
  <p>www.authorsbureau.com</p>
</div>

</body></html>`;
}

export default function BusinessPlanCard({ plan }: { plan: AbbyPlan }) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html = generatePlanHTML(plan);
      printExportHtml(html, `ABBY Business Plan - ${plan.book_title}`);
      toast({ title: "Downloaded!", description: "Your ABBY Business Plan has been saved as a Word document." });
    } catch (err) {
      console.error("Download failed:", err);
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="mt-4 border-secondary/40 bg-gradient-to-br from-secondary/5 to-background overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <FileText className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm">Your ABBY Business Plan</h3>
            <p className="text-[11px] text-muted-foreground">{plan.book_title} — {plan.core_framework}</p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground leading-relaxed">{plan.summary}</p>

        {/* Tier Cards */}
        <div className="space-y-3">
          {tierConfig.map(({ key, emoji, color, badge }) => {
            const pkg = plan.packages[key];
            if (!pkg || !pkg.products?.length) return null;
            return (
              <div key={key} className={`rounded-lg border p-3 ${color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{emoji}</span>
                  <span className="text-sm font-semibold">{pkg.label}</span>
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${badge}`}>{pkg.timeline}</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic mb-2">{pkg.tagline}</p>
                <div className="space-y-1">
                  {pkg.products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{p.title}</span>
                      <span className="text-muted-foreground">{p.pricing}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground">Est. monthly revenue</span>
                  <span className="text-xs font-semibold">{pkg.monthly_revenue_low} – {pkg.monthly_revenue_high}</span>
                </div>
                {pkg.includes_consultation && (
                  <div className="mt-2 flex items-start gap-2 rounded-md bg-violet-500/10 p-2">
                    <Users className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-violet-700 font-medium">{pkg.consultation_note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Projections */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Annual Projection</p>
            <p className="text-sm font-bold mt-1">{plan.annual_projection_low} – {plan.annual_projection_high}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROI Breakeven</p>
            <p className="text-sm font-bold mt-1">{plan.roi_breakeven}</p>
          </div>
        </div>

        {/* Abby's Promise */}
        {plan.abbys_promise && (
          <div className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3">
            <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">{plan.abbys_promise}</p>
          </div>
        )}

        {/* Download */}
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full gap-2"
          variant="outline"
        >
          {downloading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating Word doc…</>
          ) : (
            <><Download className="h-4 w-4" /> Download Business Plan (.docx)</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
