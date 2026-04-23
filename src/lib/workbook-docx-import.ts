import mammoth from "mammoth";
import { tryDecodeWorkbookData, type WorkbookContent } from "./workbook-docx";

/**
 * Parse an edited workbook .docx back into a WorkbookContent patch.
 *
 * Strategy:
 *   1. Prefer the embedded ABBY-WORKBOOK-DATA marker — exact round-trip,
 *      no parsing ambiguity. This is written by downloadWorkbookDocx.
 *   2. Fall back to a heuristic plain-text parse for files that lost the
 *      marker (e.g. user copy-pasted into a fresh document).
 */
export async function parseWorkbookDocx(file: File): Promise<Partial<WorkbookContent>> {
  const buffer = await file.arrayBuffer();
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: buffer });

  // 1. Marker round-trip
  const decoded = tryDecodeWorkbookData(text);
  if (decoded) return decoded;

  // 2. Heuristic fallback
  return heuristicParse(text);
}

function heuristicParse(text: string): Partial<WorkbookContent> {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const result: Partial<WorkbookContent> = { sections: [] };

  const firstNonEmpty = lines.find((l) => l.length > 0) || "";
  if (firstNonEmpty) result.workbook_title = firstNonEmpty;

  const grab = (label: RegExp): string | undefined => {
    const idx = lines.findIndex((l) => label.test(l));
    if (idx === -1) return undefined;
    for (let j = idx + 1; j < lines.length; j++) {
      if (lines[j]) return lines[j];
    }
    return undefined;
  };

  result.transformation_promise = grab(/^your transformation/i);
  result.who_its_for = grab(/^who this workbook is for/i);

  // Sections: split on "SECTION N"
  const sectionStarts: number[] = [];
  lines.forEach((l, i) => {
    if (/^section\s+\d+/i.test(l)) sectionStarts.push(i);
  });

  const sections: NonNullable<WorkbookContent["sections"]> = [];
  for (let s = 0; s < sectionStarts.length; s++) {
    const start = sectionStarts[s];
    const end = s + 1 < sectionStarts.length ? sectionStarts[s + 1] : lines.length;
    const block = lines.slice(start, end);
    const numMatch = block[0].match(/(\d+)/);
    const number = numMatch ? Number(numMatch[1]) : s + 1;
    // First non-empty line after "SECTION N" is the title.
    let title = "";
    let bodyStart = 1;
    for (let i = 1; i < block.length; i++) {
      if (block[i]) {
        title = block[i];
        bodyStart = i + 1;
        break;
      }
    }
    // Description: first paragraph before "Exercises".
    const exIdx = block.findIndex((l) => /^exercises$/i.test(l));
    const descLines = block.slice(bodyStart, exIdx === -1 ? block.length : exIdx).filter(Boolean);
    const description = descLines.join(" ").trim() || undefined;

    // Exercises: numbered "1. ..."  lines until "After this section" callout.
    const exercises: string[] = [];
    if (exIdx !== -1) {
      for (let i = exIdx + 1; i < block.length; i++) {
        if (/^after this section/i.test(block[i])) break;
        const m = block[i].match(/^\d+\.\s+(.+)$/);
        if (m) exercises.push(m[1].trim());
      }
    }
    const outcomeIdx = block.findIndex((l) => /^after this section/i.test(l));
    let outcome: string | undefined;
    if (outcomeIdx !== -1) {
      for (let i = outcomeIdx + 1; i < block.length; i++) {
        if (block[i]) {
          outcome = block[i];
          break;
        }
      }
    }
    sections.push({ number, title, description, exercises, outcome });
  }
  if (sections.length) result.sections = sections;

  return result;
}
