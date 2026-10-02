import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

/** Convert inline **bold** / *italic* markdown into TextRuns. */
function runs(text: string): TextRun[] {
  const out: TextRun[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun(text.slice(last, m.index)));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun(text.slice(last)));
  return out;
}

export function buildBusinessPlanParagraphs(markdown: string): Paragraph[] {
  const paras: Paragraph[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.replace(/<[^>]+>/g, "").trimEnd();
    if (!line.trim() || /^-{3,}$/.test(line.trim()) || /^===.*===$/.test(line.trim())) continue;
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][h[1].length - 1];
      paras.push(new Paragraph({ heading: level, children: runs(h[2].replace(/\*\*/g, "")) }));
      continue;
    }
    const li = line.match(/^\s*(?:[-•*]|\d+\.)\s+(.+)$/);
    if (li) {
      paras.push(new Paragraph({ bullet: { level: 0 }, children: runs(li[1]) }));
      continue;
    }
    paras.push(new Paragraph({ children: runs(line.trim()), spacing: { after: 120 } }));
  }
  return paras;
}

export async function downloadBusinessPlanDocx(markdown: string, bookTitle: string): Promise<void> {
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(`ABBY Business Plan: ${bookTitle}`)] }),
        ...buildBusinessPlanParagraphs(markdown),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ABBY Business Plan - ${bookTitle}`.replace(/[\\/:*?"<>|]+/g, "").trim() + ".docx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
