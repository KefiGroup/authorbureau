import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hash, Link2, RotateCw, Sparkles, ExternalLink } from "lucide-react";
import type { SocialMediaPost } from "./types";
import { PLATFORM_CONFIG } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

export default function HashtagCTAStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const posts: SocialMediaPost[] = stepData["generate"]?.posts || [];
  const ctaStrategy: string[] = stepData["hashtags"]?.ctaRotation || [
    "Link to workbook",
    "Link to course",
    "Link to webinar",
    "Link to author profile",
  ];
  const bioLinks: Record<string, string> = stepData["hashtags"]?.bioLinks || {};

  // Aggregate hashtags by platform
  const hashtagsByPlatform: Record<string, Map<string, number>> = {};
  posts.forEach(p => {
    if (!hashtagsByPlatform[p.platform]) hashtagsByPlatform[p.platform] = new Map();
    p.hashtags.forEach(h => {
      const map = hashtagsByPlatform[p.platform];
      map.set(h, (map.get(h) || 0) + 1);
    });
  });

  const updateBioLink = (platform: string, url: string) => {
    setStepData(prev => ({
      ...prev,
      hashtags: { ...prev.hashtags, bioLinks: { ...bioLinks, [platform]: url } },
    }));
    onMarkEdited("hashtags");
  };

  const updateCtaRotation = (newRotation: string[]) => {
    setStepData(prev => ({
      ...prev,
      hashtags: { ...prev.hashtags, ctaRotation: newRotation },
    }));
    onMarkEdited("hashtags");
  };

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <Hash className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">No Posts Yet</h3>
        <p className="text-sm text-muted-foreground">Generate your content calendar first.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hashtag Strategy */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold">Hashtag Strategy by Platform</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">
            <Sparkles className="h-2.5 w-2.5 mr-1" /> AI Optimized
          </Badge>
        </div>

        <div className="space-y-4">
          {Object.entries(hashtagsByPlatform).map(([platform, tagMap]) => {
            const sorted = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
            return (
              <div key={platform}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full ${PLATFORM_CONFIG[platform]?.color || "bg-muted"} flex items-center justify-center text-white text-[8px] font-bold`}>
                    {(PLATFORM_CONFIG[platform]?.label || "?")[0]}
                  </div>
                  <span className="text-xs font-medium">{PLATFORM_CONFIG[platform]?.label}</span>
                  <span className="text-[10px] text-muted-foreground">({sorted.length} unique tags)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sorted.map(([tag, count]) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      #{tag} <span className="ml-1 opacity-50">×{count}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* CTA Rotation Strategy */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <RotateCw className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold">CTA Rotation Strategy</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Posts will cycle through these CTAs to drive traffic to different products evenly.
        </p>
        <div className="space-y-2">
          {ctaStrategy.map((cta, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary shrink-0">
                {idx + 1}
              </div>
              <Input
                value={cta}
                onChange={e => {
                  const updated = [...ctaStrategy];
                  updated[idx] = e.target.value;
                  updateCtaRotation(updated);
                }}
                className="text-sm h-8"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Bio Link Suggestions */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold">Bio Link per Platform</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Set the primary link in your bio for each platform. Use a link-in-bio tool for Instagram.
        </p>
        <div className="space-y-3">
          {(stepData["setup"]?.config?.platforms || ["linkedin", "instagram"]).map((platform: string) => (
            <div key={platform} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full ${PLATFORM_CONFIG[platform]?.color || "bg-muted"} flex items-center justify-center text-white text-[8px] font-bold shrink-0`}>
                {(PLATFORM_CONFIG[platform]?.label || "?")[0]}
              </div>
              <Label className="text-xs w-20 shrink-0">{PLATFORM_CONFIG[platform]?.label}</Label>
              <Input
                value={bioLinks[platform] || ""}
                onChange={e => updateBioLink(platform, e.target.value)}
                placeholder="https://yoursite.com/link"
                className="text-sm h-8 flex-1"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Summary stats */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Hashtag coverage:</strong>{" "}
          {posts.filter(p => p.hashtags.length > 0).length} of {posts.length} posts have hashtags •{" "}
          {ctaStrategy.length} CTA types in rotation
        </p>
      </Card>
    </div>
  );
}
