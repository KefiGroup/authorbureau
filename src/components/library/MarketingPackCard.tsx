import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy, Sparkles, Loader2 } from "lucide-react";
import { ASSET_PACK_BY_NODE, ASSET_TYPE_LABEL, parseAssetType, type PackAssetType } from "@/lib/assetPackRegistry";
import { invokeWithTimeout } from "@/lib/invoke-with-timeout";
import { toast } from "sonner";

interface MarketingAssetRow {
  id: string;
  book_id: string | null;
  asset_type: string;
  content: any;
  status: string;
  updated_at: string;
}

interface Props {
  nodeId: string;
  nodeName: string;
  authorId: string;
  bookId: string | null;
  assets: MarketingAssetRow[];
  onRegenerated?: () => void;
}

export default function MarketingPackCard({ nodeId, nodeName, authorId, bookId, assets, onRegenerated }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const spec = ASSET_PACK_BY_NODE[nodeId];

  // Bucket assets by type
  const buckets: Record<PackAssetType, MarketingAssetRow | undefined> = {
    sales_copy: undefined,
    social_pack: undefined,
    email_announcement: undefined,
    bonus: undefined,
  };
  for (const a of assets) {
    const { type } = parseAssetType(a.asset_type);
    if (type in buckets) buckets[type as PackAssetType] = a;
  }

  const generatedAt = assets[0]?.content?.generated_at
    ? new Date(assets[0].content.generated_at).toLocaleDateString()
    : null;

  const regenerate = async () => {
    setBusy(true);
    const { error } = await invokeWithTimeout("generate-asset-pack", {
      author_id: authorId,
      node_id: nodeId,
      book_id: bookId,
      source: "manual_regenerate",
    }, 60_000);
    setBusy(false);
    if (error) {
      toast.error("Couldn't regenerate the pack");
    } else {
      toast.success("Pack regenerated");
      onRegenerated?.();
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base font-bold">{nodeName}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nodeId} · {assets.length}/4 assets {generatedAt && `· generated ${generatedAt}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={regenerate} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Regenerate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          {/* Sales copy */}
          {buckets.sales_copy && (
            <AssetSection
              label={ASSET_TYPE_LABEL.sales_copy}
              onCopy={() => copy(buckets.sales_copy!.content?.markdown || "")}
              body={buckets.sales_copy.content?.markdown || ""}
            />
          )}

          {/* Social pack */}
          {buckets.social_pack && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">{ASSET_TYPE_LABEL.social_pack}</h4>
              </div>
              <div className="space-y-2">
                {(buckets.social_pack.content?.posts || []).map((p: any, i: number) => (
                  <div key={i} className="rounded-md border border-border p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px]">{p.platform}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => copy(p.body || "")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs whitespace-pre-wrap">{p.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email announcement */}
          {buckets.email_announcement && (
            <AssetSection
              label={ASSET_TYPE_LABEL.email_announcement}
              onCopy={() => {
                const e = buckets.email_announcement!.content?.email || {};
                copy(`Subject: ${e.subject}\n\n${e.body_markdown}`);
              }}
              body={[
                buckets.email_announcement.content?.email?.subject &&
                  `**Subject:** ${buckets.email_announcement.content.email.subject}`,
                buckets.email_announcement.content?.email?.preview &&
                  `**Preview:** ${buckets.email_announcement.content.email.preview}`,
                buckets.email_announcement.content?.email?.body_markdown,
              ].filter(Boolean).join("\n\n")}
            />
          )}

          {/* Bonus */}
          {buckets.bonus && (
            <AssetSection
              label={`${spec?.bonus_label || "Bonus Asset"}`}
              onCopy={() => copy(buckets.bonus!.content?.bonus?.body_markdown || "")}
              body={buckets.bonus.content?.bonus?.body_markdown || ""}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

function AssetSection({ label, body, onCopy }: { label: string; body: string; onCopy: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="h-3 w-3 mr-1" /> Copy
        </Button>
      </div>
      <div className="rounded-md border border-border p-3 bg-muted/30 max-h-64 overflow-y-auto">
        <pre className="text-xs whitespace-pre-wrap font-sans">{body}</pre>
      </div>
    </div>
  );
}
