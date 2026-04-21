import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadBuilderPackage } from "@/lib/builder-pdf";
import { toast } from "sonner";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  nodeName: string;
  bookTitle: string;
  authorName?: string;
  /**
   * Custom guidance shown beneath the download button.
   * Defaults to the platform-agnostic Teachable/Kajabi/Thinkific copy.
   */
  guidance?: string;
}

const DEFAULT_GUIDANCE =
  "Your package is ready. Download it and upload it to Teachable, Kajabi, Thinkific, or any platform of your choice to start earning revenue from your expertise.";

export default function BANodeDownloadCard({
  content,
  nodeName,
  bookTitle,
  authorName,
  guidance,
}: Props) {
  const handleDownload = () => {
    try {
      downloadBuilderPackage({ content, nodeName, bookTitle, authorName });
    } catch (e) {
      console.error("[download-package] failed", e);
      toast.error("Could not generate the PDF. Please try again.");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <Button onClick={handleDownload} size="lg" className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download {nodeName} Package
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        {guidance || DEFAULT_GUIDANCE}
      </p>
    </div>
  );
}
