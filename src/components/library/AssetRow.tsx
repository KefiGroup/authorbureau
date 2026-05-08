import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, ExternalLink, Loader2, Link2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  buildExportText, copyToClipboard, downloadAsTxt, downloadAsDocx, downloadAsPdf,
} from "@/lib/builder-export";
import { invokeWithTimeout } from "@/lib/invoke-with-timeout";
import { getMicrositeUrl, NO_MICROSITE_NODES, NODE_NAMES } from "@/lib/node-slug-map";
import type { NodeAsset, ExportFormat } from "@/lib/nodeAssetRegistry";

interface NodeRow {
  id: string;
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: string;
  content_json: any;
  microsite_url: string | null;
  book_id?: string | null;
}

interface Props {
  node: NodeRow;
  asset: NodeAsset;
  sizeHint?: string;
  authorSlug: string | null;
  penName: string | null;
  icon: React.ComponentType<{ className?: string }>;
  showNodeName?: boolean;
}

/** Pluck a value from content_json by dot-path. "*" returns the whole blob. */
function pluckByKey(content: any, key: string): any {
  if (!content) return null;
  if (key === "*") return content;
  return key.split(".").reduce((acc, p) => (acc == null ? acc : acc[p]), content);
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  copy: "Copy text",
  txt: "Download .txt",
  docx: "Download .docx",
  pdf: "Download .pdf",
  pptx: "Download .pptx",
  csv: "Download .csv",
  script_docx: "Download speaker script (.docx)",
};

export default function AssetRow({
  node, asset, sizeHint, authorSlug, penName, icon: Icon, showNodeName,
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const nodeName = node.personalised_name || NODE_NAMES[node.node_id] || node.node_name;
  const bookTitle = nodeName;
  const subContent = pluckByKey(node.content_json, asset.key) ?? node.content_json;
  const opts = { content: subContent, nodeName: asset.label, bookTitle, authorName: penName ?? undefined };

  const publicUrl = !NO_MICROSITE_NODES.has(node.node_id) && authorSlug
    ? getMicrositeUrl(authorSlug, node.node_id)
    : null;

  const handleOpen = () => {
    navigate(`/node-builder/${node.node_id}`);
  };

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public link copied");
  };

  const run = async (fmt: ExportFormat) => {
    if (busy) return;
    setBusy(fmt);
    try {
      if (fmt === "copy") {
        await copyToClipboard(opts);
      } else if (fmt === "txt") {
        downloadAsTxt(opts);
      } else if (fmt === "docx") {
        await downloadAsDocx(opts);
      } else if (fmt === "pdf") {
        await downloadAsPdf(opts);
      } else if (fmt === "pptx") {
        // Universal pro-slides exporter — works for any node with slides
        const { data, error } = await invokeWithTimeout<{ filename: string; base64: string }>(
          "export-pro-slides",
          { node_id: node.node_id, asset_key: asset.key, theme: "editorial" },
          120000,
        );
        if (error) throw error;
        if (!data?.base64) throw new Error("No slides returned");
        const blob = base64ToBlob(data.base64, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        triggerDownload(blob, data.filename || `${asset.label}.pptx`);
      } else if (fmt === "script_docx") {
        const hasScript = !!node.content_json?.speaker_script?.slides?.length;
        if (!hasScript) {
          toast.info("Generating speaker script — this can take up to 60 seconds…");
        }
        const { data, error } = await invokeWithTimeout<{ filename: string; base64: string }>(
          "export-speaker-script",
          { node_id: node.node_id, book_id: node.book_id ?? null },
          180000,
        );
        if (error) throw error;
        if (!data?.base64) throw new Error("No script returned");
        const blob = base64ToBlob(data.base64, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        triggerDownload(blob, data.filename || `${asset.label}.docx`);
      } else if (fmt === "csv") {
        // basic CSV: rows of strings if subContent is array
        const csv = toCsv(subContent);
        const blob = new Blob([csv], { type: "text/csv" });
        triggerDownload(blob, `${asset.label.replace(/\s+/g, "_")}.csv`);
      }
    } catch (err: any) {
      console.error("AssetRow export error", err);
      toast.error(err?.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const primaryFormat = asset.formats[0];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-3 py-2 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{asset.label}</span>
            {sizeHint && <Badge variant="outline" className="text-[10px]">{sizeHint}</Badge>}
            <Badge variant="secondary" className="text-[10px] uppercase">{asset.type}</Badge>
          </div>
          {showNodeName && (
            <p className="text-[11px] text-muted-foreground truncate">{nodeName} · {node.node_id}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {publicUrl && (
          <Button variant="ghost" size="sm" onClick={handleCopyLink} aria-label="Copy public link">
            <Link2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleOpen}>
          <ExternalLink className="h-4 w-4 mr-1" />Open
        </Button>
        {asset.formats.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" disabled={busy !== null}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                {primaryFormat?.toUpperCase()}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {asset.formats.map(f => (
                <DropdownMenuItem key={f} onClick={() => run(f)}>
                  {FORMAT_LABELS[f]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ── helpers ──
function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function toCsv(value: any): string {
  if (Array.isArray(value)) {
    if (!value.length) return "";
    if (typeof value[0] === "string") return value.map(v => `"${String(v).replace(/"/g, '""')}"`).join("\n");
    if (typeof value[0] === "object") {
      const keys = Object.keys(value[0]);
      const head = keys.join(",");
      const rows = value.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","));
      return [head, ...rows].join("\n");
    }
  }
  return JSON.stringify(value, null, 2);
}
