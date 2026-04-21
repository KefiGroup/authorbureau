import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, FileText, FileType, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildExportText,
  copyToClipboard,
  downloadAsTxt,
  downloadAsDocx,
  downloadAsPdf,
} from "@/lib/builder-export";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  nodeName: string;
  bookTitle: string;
  authorName?: string;
  /** Override the default guidance line shown beneath the buttons. */
  guidance?: string;
}

const DEFAULT_GUIDANCE =
  "Export the full package and upload it to Teachable, Kajabi, Thinkific, Notion — or any platform of your choice.";

export default function ExportPackageCard({
  content,
  nodeName,
  bookTitle,
  authorName,
  guidance,
}: Props) {
  const [busy, setBusy] = useState<null | "copy" | "txt" | "docx" | "pdf">(
    null,
  );

  const opts = { content, nodeName, bookTitle, authorName };

  const run = async (
    which: "copy" | "txt" | "docx" | "pdf",
    fn: () => void | Promise<void>,
  ) => {
    if (busy) return;
    setBusy(which);
    try {
      await fn();
    } catch (err) {
      console.error(`[ExportPackageCard] ${which} failed`, err);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  // Validate minimal content before enabling buttons
  const hasContent = !!content && typeof content === "object";

  return (
    <Card className="border-primary/20 bg-card">
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="text-base font-bold">Export {nodeName} Package</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose any format — all four contain the same complete package.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasContent || busy !== null}
            onClick={() =>
              run("copy", () => copyToClipboard(opts).then(() => undefined))
            }
            aria-label="Copy package to clipboard"
          >
            {busy === "copy" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-1.5" />
            )}
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasContent || busy !== null}
            onClick={() => run("txt", () => downloadAsTxt(opts))}
            aria-label="Download as TXT"
          >
            {busy === "txt" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" />
            )}
            TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasContent || busy !== null}
            onClick={() => run("docx", () => downloadAsDocx(opts))}
            aria-label="Download as Word document"
          >
            {busy === "docx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileType className="h-4 w-4 mr-1.5" />
            )}
            DOCX
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!hasContent || busy !== null}
            onClick={() => run("pdf", () => downloadAsPdf(opts))}
            aria-label="Download as PDF"
          >
            {busy === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-1.5" />
            )}
            PDF
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {guidance || DEFAULT_GUIDANCE}
        </p>

        {/* Belt-and-braces: surface a hint if the export looks empty */}
        {hasContent && buildExportText(opts).length < 200 && (
          <p className="text-xs text-amber-600">
            Heads up: the package looks short — your generated content may be
            incomplete. Re-generate if anything looks missing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
