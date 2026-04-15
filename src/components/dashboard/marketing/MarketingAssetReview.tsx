import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, Edit3, RefreshCw, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface MarketingAsset {
  id: string;
  asset_type: string;
  content: any;
  status: string;
}

interface Props {
  assets: MarketingAsset[];
  bookId: string;
  authorId: string;
  onRefresh: () => void;
  onAllApproved: () => void;
}

const ASSET_LABELS: Record<string, { label: string; description: string }> = {
  landing_page: { label: "Landing Page Copy", description: "Headlines, benefits, and CTA for your opt-in page" },
  lead_magnet_outline: { label: "Lead Magnet Outline", description: "Free resource outline derived from your book" },
  social_calendar: { label: "30-Day Social Calendar", description: "Daily social media posts across platforms" },
  blog_post: { label: "Blog Post Drafts", description: "3 SEO-optimised articles from your book's themes" },
  amazon_aplus: { label: "Amazon A+ Content", description: "Enhanced brand content for your Amazon listing" },
  ad_copy: { label: "Ad Copy Variations", description: "Facebook & Google ad copy ready to run" },
  review_kit: { label: "Review Outreach Kit", description: "Press release, reviewer pitch, and interview prep" },
};

export default function MarketingAssetReview({ assets, bookId, authorId, onRefresh, onAllApproved }: Props) {
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const approvedCount = assets.filter(a => a.status === "approved" || a.status === "live").length;
  const allApproved = approvedCount >= assets.length && assets.length > 0;

  const handleApprove = async (asset: MarketingAsset) => {
    const { error } = await supabase
      .from("marketing_assets")
      .update({ status: "approved" })
      .eq("id", asset.id);

    if (error) {
      toast({ title: "Failed to approve", variant: "destructive" });
      return;
    }
    toast({ title: `${ASSET_LABELS[asset.asset_type]?.label || asset.asset_type} approved ✓` });
    onRefresh();

    // Check if all are now approved
    const newApprovedCount = approvedCount + 1;
    if (newApprovedCount >= assets.length) {
      onAllApproved();
    }
  };

  const handleSaveEdit = async (asset: MarketingAsset) => {
    setSaving(true);
    try {
      const parsed = JSON.parse(editContent);
      await supabase
        .from("marketing_assets")
        .update({ content: parsed })
        .eq("id", asset.id);
      toast({ title: "Changes saved" });
      setEditing(null);
      onRefresh();
    } catch {
      toast({ title: "Invalid JSON", description: "Content must be valid JSON", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (assetType: string) => {
    setRegenerating(assetType);
    try {
      const { error } = await supabase.functions.invoke("abby-generate-marketing-assets", {
        body: { book_id: bookId, author_id: authorId },
      });
      if (error) throw error;
      toast({ title: "Assets regenerated", description: "ABBY has created fresh content" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(null);
    }
  };

  const renderContentPreview = (asset: MarketingAsset) => {
    const content = asset.content;
    if (!content || typeof content !== "object") return <p className="text-sm text-muted-foreground">No content</p>;

    // Landing page
    if (asset.asset_type === "landing_page") {
      return (
        <div className="space-y-3">
          {content.headline && <h3 className="text-lg font-bold">{content.headline}</h3>}
          {content.subheadline && <p className="text-sm text-muted-foreground">{content.subheadline}</p>}
          {content.hero_description && <p className="text-sm">{content.hero_description}</p>}
          {content.benefits?.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {content.benefits.map((b: string, i: number) => <li key={i} className="text-sm">{b}</li>)}
            </ul>
          )}
          {content.cta_text && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">{content.cta_text}</Badge>
            </div>
          )}
        </div>
      );
    }

    // Social calendar
    if (asset.asset_type === "social_calendar" && content.posts) {
      const posts = content.posts.slice(0, 5);
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{content.posts.length} posts generated — showing first 5:</p>
          {posts.map((p: any, i: number) => (
            <div key={i} className="p-2 rounded bg-muted/50 text-xs">
              <span className="font-semibold">Day {p.day} · {p.platform}</span>
              <p className="mt-1">{p.content?.slice(0, 150)}{p.content?.length > 150 ? "..." : ""}</p>
            </div>
          ))}
        </div>
      );
    }

    // Blog posts
    if (asset.asset_type === "blog_post" && content.posts) {
      return (
        <div className="space-y-2">
          {content.posts.map((p: any, i: number) => (
            <div key={i} className="p-2 rounded bg-muted/50">
              <p className="font-semibold text-sm">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.meta_description}</p>
            </div>
          ))}
        </div>
      );
    }

    // Generic fallback — show key-value pairs
    return (
      <div className="space-y-1">
        {Object.entries(content).slice(0, 6).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
            <span className="text-muted-foreground">
              {typeof value === "string" ? value.slice(0, 200) : JSON.stringify(value).slice(0, 200)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
        <div className="flex-1">
          <p className="text-sm font-medium">{approvedCount} of {assets.length} assets approved</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${assets.length > 0 ? (approvedCount / assets.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        {allApproved && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" /> All Approved
          </Badge>
        )}
      </div>

      {/* Asset cards */}
      {assets.map((asset) => {
        const meta = ASSET_LABELS[asset.asset_type] || { label: asset.asset_type, description: "" };
        const isExpanded = expandedAsset === asset.id;
        const isEditing = editing === asset.id;
        const isApproved = asset.status === "approved" || asset.status === "live";

        return (
          <Card key={asset.id} className={`p-4 transition-all ${isApproved ? "border-emerald-500/20" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{meta.label}</p>
                  {isApproved && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" /> Approved
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isApproved && (
                  <Button size="sm" variant="default" className="text-xs h-7" onClick={() => handleApprove(asset)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                  </Button>
                )}
                <Button
                  size="sm" variant="ghost" className="text-xs h-7"
                  onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-3 border-t border-border">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={12}
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(asset)} disabled={saving} className="text-xs">
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {renderContentPreview(asset)}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => {
                          setEditing(asset.id);
                          setEditContent(JSON.stringify(asset.content, null, 2));
                        }}
                      >
                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm" variant="outline" className="text-xs h-7"
                        disabled={regenerating === asset.asset_type}
                        onClick={() => handleRegenerate(asset.asset_type)}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${regenerating === asset.asset_type ? "animate-spin" : ""}`} />
                        Regenerate
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
