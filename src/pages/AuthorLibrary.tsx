import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Library, Loader2, FileText, FileType, FileDown, Presentation, Image as ImageIcon, FileSpreadsheet, RefreshCw } from "lucide-react";
import { invokeWithTimeout } from "@/lib/invoke-with-timeout";
import { NODE_NAMES, NO_MICROSITE_NODES } from "@/lib/node-slug-map";
import { getAvailableAssets, describeAssetSize, type NodeAsset } from "@/lib/nodeAssetRegistry";
import AssetRow from "@/components/library/AssetRow";
import { useNavigate } from "react-router-dom";

interface NodeRow {
  id: string;
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: string;
  content_json: any;
  microsite_url: string | null;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  pen_name: string | null;
  author_slug: string | null;
}

const TYPE_ICON: Record<string, typeof FileText> = {
  pptx: Presentation,
  pdf: FileDown,
  docx: FileType,
  csv: FileSpreadsheet,
  text: FileText,
  image: ImageIcon,
  audio: FileText,
};

export default function AuthorLibrary() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await invokeWithTimeout<{ nodes: NodeRow[]; profile: ProfileSummary | null }>(
      "get-author-library", {}
    );
    if (error) setError(error.message);
    else if (data) {
      setNodes(data.nodes || []);
      setProfile(data.profile);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Compute flattened asset list once
  const flatAssets = nodes.flatMap(n => {
    const assets = getAvailableAssets(n.node_id, n.content_json);
    return assets.map(a => ({ node: n, asset: a }));
  });

  const byFormat: Record<string, typeof flatAssets> = {
    "Slide decks": flatAssets.filter(a => a.asset.type === "pptx"),
    "PDFs": flatAssets.filter(a => a.asset.type === "pdf"),
    "Written copy": flatAssets.filter(a => a.asset.type === "text" || a.asset.type === "docx"),
    "Spreadsheets": flatAssets.filter(a => a.asset.type === "csv"),
    "Media": flatAssets.filter(a => a.asset.type === "image" || a.asset.type === "audio"),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button>
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Library className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Your library is empty</h2>
        <p className="text-muted-foreground text-sm">
          Build any node in Brand Products, Build Authority, or Yield Revenue and your downloadable
          slides, PDFs, and copy will appear here.
        </p>
        <Button onClick={() => navigate("/dashboard?section=my-books")}>Go to My Book Hub</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Library className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">My Library</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Every asset you've ever generated — slide decks, workbooks, scripts, social packs.
            Re-download in any format, swap themes, or push to your channels.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <Tabs defaultValue="by-node">
        <TabsList>
          <TabsTrigger value="by-node">By node</TabsTrigger>
          <TabsTrigger value="by-format">By format</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        {/* ── By Node ── */}
        <TabsContent value="by-node" className="space-y-4">
          {nodes.map(n => {
            const assets = getAvailableAssets(n.node_id, n.content_json);
            if (!assets.length) return null;
            return (
              <Card key={n.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {n.personalised_name || NODE_NAMES[n.node_id] || n.node_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {n.node_id} · {assets.length} asset{assets.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant={n.status === "live" ? "default" : "secondary"}>{n.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {assets.map(a => (
                    <AssetRow
                      key={`${n.id}-${a.key}`}
                      node={n}
                      asset={a}
                      sizeHint={describeAssetSize(a, n.content_json)}
                      authorSlug={profile?.author_slug ?? null}
                      penName={profile?.pen_name ?? null}
                      icon={TYPE_ICON[a.type] || FileText}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── By Format ── */}
        <TabsContent value="by-format" className="space-y-4">
          {Object.entries(byFormat).map(([label, items]) => {
            if (!items.length) return null;
            return (
              <Card key={label}>
                <CardHeader>
                  <CardTitle className="text-base font-bold">{label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map(({ node, asset }) => (
                    <AssetRow
                      key={`${node.id}-${asset.key}`}
                      node={node}
                      asset={asset}
                      sizeHint={describeAssetSize(asset, node.content_json)}
                      authorSlug={profile?.author_slug ?? null}
                      penName={profile?.pen_name ?? null}
                      icon={TYPE_ICON[asset.type] || FileText}
                      showNodeName
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Recent ── */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {flatAssets.slice(0, 30).map(({ node, asset }) => (
                <AssetRow
                  key={`${node.id}-${asset.key}`}
                  node={node}
                  asset={asset}
                  sizeHint={describeAssetSize(asset, node.content_json)}
                  authorSlug={profile?.author_slug ?? null}
                  penName={profile?.pen_name ?? null}
                  icon={TYPE_ICON[asset.type] || FileText}
                  showNodeName
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
