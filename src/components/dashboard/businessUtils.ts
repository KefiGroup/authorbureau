/**
 * Utility functions and constants for BuildMyBusiness component.
 */

export interface AnalysisData {
  bookTitle: string;
  revenueStreamsCount?: number;
  revenueLow?: string;
  revenueHigh?: string;
  recommendedTier?: "starter" | "pro" | "enterprise";
  products?: Array<{ name: string; price: number; type: string }>;
}

export const NAV_CONFIG: Record<string, { label: string; icon: string; tab: string }> = {
  build: { label: "B · Brand Products", icon: "🏗️", tab: "revenue-streams" },
  bridge: { label: "B · Build Authority", icon: "🌉", tab: "marketing-channels" },
  yield: { label: "Y · Yield Revenue", icon: "💰", tab: "authority-builders" },
  profile: { label: "Author Profile", icon: "👤", tab: "profile" },
  "lead-magnet-studio": { label: "Lead Magnet Studio", icon: "🧲", tab: "lead-magnet" },
  "email-marketing-studio": { label: "Email Marketing Studio", icon: "📧", tab: "email-marketing" },
  "workbook-studio": { label: "Workbook Studio", icon: "📓", tab: "workbooks" },
  "social-media-studio": { label: "Social Media Studio", icon: "📱", tab: "social-media" },
  "coaching-studio": { label: "Coaching Studio", icon: "🎯", tab: "coaching" },
  "course-studio": { label: "Course Studio", icon: "🎓", tab: "courses" },
  "audiobook-studio": { label: "Audiobook Studio", icon: "🎧", tab: "audiobook-studio" },
  "podcast-studio": { label: "Podcast Studio", icon: "🎙️", tab: "podcast" },
  "webinar-studio": { label: "Webinar Studio", icon: "📹", tab: "webinars" },
  "speaking-studio": { label: "Speaking Studio", icon: "🎤", tab: "speaking" },
  "home-study-studio": { label: "Home Study Studio", icon: "📚", tab: "home-study" },
  "membership-studio": { label: "Membership Studio", icon: "💳", tab: "memberships" },
  "group-coaching-studio": { label: "Group Coaching Studio", icon: "👥", tab: "group-coaching" },
  "book-sales-studio": { label: "Book Sales Studio", icon: "📖", tab: "book-sales" },
  "special-editions-studio": { label: "Special Editions Studio", icon: "✨", tab: "special-editions" },
  "website-studio": { label: "Website Studio", icon: "🌐", tab: "microsite-manager" },
};

export function parseBuildRequests(content: string): Array<Record<string, string>> {
  const regex = /===BUILD_REQUEST===([\s\S]*?)===END_BUILD_REQUEST===/g;
  const requests: Array<Record<string, string>> = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const block = match[1];
    const req: Record<string, string> = {};
    block.split("\n").forEach(line => {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        if (key && value) req[key] = value;
      }
    });
    if (req.product_type) requests.push(req);
  }
  return requests;
}

export function parseNavMarkers(content: string): string[] {
  const regex = /===NAV:([\w-]+)===/g;
  const markers: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (NAV_CONFIG[match[1]] && !markers.includes(match[1])) markers.push(match[1]);
  }
  return markers;
}

export function parseAnalysisData(content: string, bookTitle: string): AnalysisData {
  const data: AnalysisData = { bookTitle };

  const productLines = content.match(/\d+\.\s+\*\*[^*]+\*\*/g);
  if (productLines) data.revenueStreamsCount = productLines.length;

  const revenueRanges = content.match(/\$([0-9,]+)\s*[-–—]\s*\$([0-9,]+)(?=\s*(?:Future|Recommended|Not Applicable|$))/gm);
  if (revenueRanges && revenueRanges.length >= 3) {
    let totalLow = 0;
    let totalHigh = 0;
    for (const range of revenueRanges) {
      const m = range.match(/\$([0-9,]+)\s*[-–—]\s*\$([0-9,]+)/);
      if (m) {
        totalLow += parseInt(m[1].replace(/,/g, ""), 10) || 0;
        totalHigh += parseInt(m[2].replace(/,/g, ""), 10) || 0;
      }
    }
    if (totalHigh > 0) {
      data.revenueLow = `$${totalLow.toLocaleString()}`;
      data.revenueHigh = `$${totalHigh.toLocaleString()}`;
    }
  }

  if (!data.revenueLow) {
    const summaryMatches = [...content.matchAll(/(?:conservative|realistic|optimistic)\s+\$([0-9,]+)\s*[-–—]\s*\$([0-9,]+)/gi)];
    if (summaryMatches.length > 0) {
      const pick = summaryMatches.length >= 2 ? summaryMatches[1] : summaryMatches[0];
      data.revenueLow = `$${pick[1]}`;
      data.revenueHigh = `$${pick[2]}`;
    }
  }

  if (!data.revenueLow) {
    const allRanges = [...content.matchAll(/\$([0-9,]+)\s*[-–—]\s*\$([0-9,]+)\s*\/?\s*(?:mo|month)/gi)];
    for (const m of allRanges) {
      const high = parseInt(m[2].replace(/,/g, ""), 10);
      if (high >= 100) {
        data.revenueLow = `$${m[1]}`;
        data.revenueHigh = `$${m[2]}`;
        break;
      }
    }
  }

  const normalized = content.toLowerCase();
  if (normalized.includes("recommend") && normalized.includes("starter")) data.recommendedTier = "starter";
  else if (normalized.includes("recommend") && normalized.includes("enterprise")) data.recommendedTier = "enterprise";
  else if (normalized.includes("recommend") && normalized.includes("pro")) data.recommendedTier = "pro";
  else data.recommendedTier = "starter";

  const products: Array<{ name: string; price: number; type: string }> = [];
  const pricePatterns = [
    /\$(\d+(?:\.\d+)?)\s+(workbook|course|coaching|home.?study|audiobook|webinar|ebook|guide)/gi,
    /(workbook|course|coaching|home.?study|audiobook|webinar|ebook|guide)\s+(?:at\s+)?\$(\d+(?:\.\d+)?)/gi,
  ];
  for (const pattern of pricePatterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      const price = pattern === pricePatterns[0] ? parseFloat(m[1]) : parseFloat(m[2]);
      const name = pattern === pricePatterns[0] ? m[2] : m[1];
      if (price > 0 && !products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        products.push({ name, price, type: name.toLowerCase() });
      }
    }
  }
  if (products.length > 0) data.products = products;

  return data;
}

export function getProductLink(selectedBookId: string, productType: string): { label: string; path: string } | null {
  if (productType === "workbook") return { label: "Open Workbook Studio", path: `/dashboard?section=workbooks&bookId=${selectedBookId}` };
  const base = `/dashboard/book/${selectedBookId}`;
  const map: Record<string, { label: string; tab: string }> = {
    course: { label: "View Course", tab: "automate" },
    social: { label: "View Social Content", tab: "automate" },
    webinar: { label: "View Webinar", tab: "automate" },
    speaker: { label: "View Speaking Profile", tab: "broadcast" },
    email: { label: "View Email Flows", tab: "automate" },
  };
  const entry = map[productType];
  if (!entry) return null;
  return { label: entry.label, path: `${base}?tab=${entry.tab}` };
}
