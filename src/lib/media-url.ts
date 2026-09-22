import { supabase } from "@/integrations/supabase/client";

/**
 * Paid media (audiobook chapters, course videos) now lives in private buckets.
 * Stored rows still carry the old public-format URLs, so convert them to a
 * short-lived signed URL at play time. Access is enforced by storage RLS:
 * the free sample chapter is open, everything else needs ownership or purchase.
 */
const PRIVATE_BUCKETS = ["audiobook-audio", "course-videos"];

const cache = new Map<string, { url: string; expires: number }>();

function parsePublicUrl(url: string): { bucket: string; path: string } | null {
  for (const bucket of PRIVATE_BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const i = url.indexOf(marker);
    if (i >= 0) {
      return { bucket, path: decodeURIComponent(url.slice(i + marker.length).split("?")[0]) };
    }
  }
  return null;
}

/** Returns a playable URL for a stored media URL, signing it when needed. */
export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url) return url;
  const parsed = parsePublicUrl(url);
  if (!parsed) return url;

  const key = `${parsed.bucket}/${parsed.path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600);

  if (error || !data?.signedUrl) return url;
  cache.set(key, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
