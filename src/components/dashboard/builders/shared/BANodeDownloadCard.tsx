/**
 * Backward-compat shim — `BANodeDownloadCard` now delegates to
 * `ExportPackageCard`, which exposes Copy / TXT / DOCX / PDF in one card.
 *
 * Existing call sites continue to work without changes; new code should
 * import `ExportPackageCard` directly.
 */
import ExportPackageCard from "./ExportPackageCard";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  nodeName: string;
  bookTitle: string;
  authorName?: string;
  guidance?: string;
}

export default function BANodeDownloadCard(props: Props) {
  return <ExportPackageCard {...props} />;
}
