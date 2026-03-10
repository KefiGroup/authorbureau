/**
 * Zero-dependency document export using window.print().
 * Replaces html-docx-js-typescript per security policy (jsPDF LFI vulnerability).
 */
export function printExportHtml(html: string, title: string = "Document") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Please allow pop-ups to download documents.");
  }
  printWindow.document.write(html);
  printWindow.document.title = title;
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}
