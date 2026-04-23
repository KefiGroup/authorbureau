import JSZip from "jszip";

/**
 * Thinkific bulk-import package generator.
 *
 * Produces a ZIP containing:
 *  - thinkific-course-import.csv  (Bulk Import Lessons format)
 *  - course-description.txt       (paste into Course Landing Page)
 *  - lessons/Day-XX.html          (one file per day, optional manual paste)
 *  - README.txt                   (5-step instructions)
 */

interface Day {
  day?: number | string;
  reading?: string;
  exercise?: string;
  reflection?: string;
  action?: string;
}

interface Week {
  week?: number | string;
  title?: string;
  theme?: string;
  days?: Day[];
}

export interface ThinkificExportContent {
  programme_title?: string;
  programme_subtitle?: string;
  tagline?: string;
  transformation_promise?: string;
  who_its_for?: string;
  what_youll_get?: string[];
  duration?: string;
  format?: string;
  study_weeks?: Week[];
}

function escapeCsv(v: string): string {
  const s = (v ?? "").toString();
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeHtml(v: string): string {
  return (v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dayHtml(week: Week, day: Day): string {
  const parts: string[] = [];
  if (day.reading) parts.push(`<h3>Read</h3><p>${escapeHtml(day.reading)}</p>`);
  if (day.exercise) parts.push(`<h3>Exercise</h3><p>${escapeHtml(day.exercise)}</p>`);
  if (day.reflection) parts.push(`<h3>Reflect</h3><p><em>${escapeHtml(day.reflection)}</em></p>`);
  if (day.action) parts.push(`<h3>Action</h3><p>${escapeHtml(day.action)}</p>`);
  return parts.join("\n");
}

function safeFilename(name: string): string {
  return (name || "Thinkific-Bundle")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Thinkific-Bundle";
}

export async function downloadThinkificPackage(content: ThinkificExportContent): Promise<void> {
  const zip = new JSZip();
  const title = content.programme_title || "Home Study Course";

  // 1. CSV — Thinkific Bulk Import Lessons
  const header = ["Chapter Name", "Lesson Name", "Lesson Type", "Lesson Content", "Is Free Preview"];
  const rows: string[] = [header.map(escapeCsv).join(",")];

  let firstLesson = true;
  for (const week of content.study_weeks || []) {
    const chapter = `Week ${week.week ?? ""}${week.title ? ` — ${week.title}` : ""}`.trim();
    for (const day of week.days || []) {
      const lessonName = `Day ${day.day ?? ""}`;
      const lessonContent = dayHtml(week, day);
      const isFree = firstLesson ? "TRUE" : "FALSE";
      firstLesson = false;
      rows.push([chapter, lessonName, "Text", lessonContent, isFree].map(escapeCsv).join(","));
    }
  }
  zip.file("thinkific-course-import.csv", rows.join("\n"));

  // 2. Course description
  const descLines: string[] = [];
  descLines.push(title);
  if (content.programme_subtitle) descLines.push(content.programme_subtitle);
  descLines.push("");
  if (content.tagline) descLines.push(`"${content.tagline}"\n`);
  if (content.transformation_promise) {
    descLines.push("TRANSFORMATION PROMISE");
    descLines.push(content.transformation_promise);
    descLines.push("");
  }
  if (content.who_its_for) {
    descLines.push("WHO IT'S FOR");
    descLines.push(content.who_its_for);
    descLines.push("");
  }
  if (content.what_youll_get?.length) {
    descLines.push("WHAT YOU'LL GET");
    for (const item of content.what_youll_get) descLines.push(`• ${item}`);
    descLines.push("");
  }
  if (content.duration || content.format) {
    descLines.push(`Duration: ${content.duration ?? "—"}   Format: ${content.format ?? "—"}`);
  }
  zip.file("course-description.txt", descLines.join("\n"));

  // 3. Per-day HTML files
  const lessonsFolder = zip.folder("lessons");
  if (lessonsFolder) {
    for (const week of content.study_weeks || []) {
      for (const day of week.days || []) {
        const dayNum = String(day.day ?? "").padStart(2, "0");
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Day ${day.day ?? ""}</title></head>
<body>
<h1>Day ${day.day ?? ""}${week.title ? ` — ${escapeHtml(week.title)}` : ""}</h1>
${dayHtml(week, day)}
</body></html>`;
        lessonsFolder.file(`Day-${dayNum}.html`, html);
      }
    }
  }

  // 4. README
  zip.file(
    "README.txt",
    [
      `${title} — Thinkific Import Bundle`,
      "",
      "How to load this into Thinkific:",
      "1. Log in at thinkific.com and create a new course.",
      "2. In your course, go to Settings → Bulk Import Lessons and upload thinkific-course-import.csv.",
      "3. Paste course-description.txt into the Course Landing Page description.",
      "4. (Optional) Use the lessons/ folder to manually paste individual day HTML if you prefer.",
      "5. Publish your course in Thinkific, then copy the course URL back into Authors Bureau so buyers receive it.",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(title)}-Thinkific-Bundle.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
