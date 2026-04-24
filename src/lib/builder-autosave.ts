import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

/**
 * Shared auto-save / resume helper used by all BA-/YR- builders.
 *
 * Routes through the `save-author-node` edge function (verify_jwt = false,
 * in-code JWT decode + service-role write) because Cloud PostgREST rejects
 * shared-backend JWTs at the gateway. This is the platform-wide fix for the
 * 401 errors all 28 builder autosaves were hitting.
 *
 * Errors are logged and swallowed — autosave must never break the UI.
 */

export type BuilderStatus = "content_ready" | "live";

const SAVE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-author-node`;

export interface AutosaveOptions {
  authorId: string;
  nodeId: string;
  nodeName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  currentStep: number;
  bookId?: string | null;
}

export async function autosaveBuilderDraft({
  authorId,
  nodeId,
  nodeName,
  content,
  currentStep,
  bookId,
}: AutosaveOptions): Promise<void> {
  if (!authorId || !content) return;
  try {
    const token = await getActiveToken();
    if (!token) {
      console.warn(`[autosave ${nodeId}] no active token, skipping`);
      return;
    }
    const res = await fetchWithTimeout(
      SAVE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "save",
          authorId,
          nodeId,
          nodeName,
          content,
          currentStep,
          bookId: bookId ?? null,
        }),
      },
      20000,
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[autosave ${nodeId}] save failed:`, res.status, errBody.slice(0, 300));
    }
  } catch (err) {
    console.error(`[autosave ${nodeId}] exception:`, err);
  }
}

export interface LoadDraftResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any | null;
  status: string | null;
  currentStep: number;
  isLive: boolean;
  micrositeUrl: string | null;
}

export async function loadBuilderDraft(
  authorId: string,
  nodeId: string,
  bookId?: string | null,
): Promise<LoadDraftResult> {
  const empty: LoadDraftResult = { content: null, status: null, currentStep: 0, isLive: false, micrositeUrl: null };
  if (!authorId) return empty;
  try {
    const token = await getActiveToken();
    if (!token) return empty;
    const res = await fetchWithTimeout(
      SAVE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "load", authorId, nodeId, bookId: bookId ?? null }),
      },
      20000,
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[loadBuilderDraft ${nodeId}] load failed:`, res.status, errBody.slice(0, 300));
      return empty;
    }
    const data = (await res.json()) as LoadDraftResult;
    if (!data?.content) return empty;
    const content = data.isLive ? { ...data.content, activated: true } : data.content;
    return {
      content,
      status: data.status ?? null,
      currentStep: Number(data.currentStep ?? 0),
      isLive: !!data.isLive,
      micrositeUrl: data.micrositeUrl ?? null,
    };
  } catch (err) {
    console.error(`[loadBuilderDraft ${nodeId}] exception:`, err);
    return empty;
  }
}

export interface AudiobookChapterFile {
  index: number;
  name: string;
  publicUrl: string;
}

/**
 * Lists permanent audiobook chapter MP3 URLs for a given (authorId, bookId).
 * Used by BA-11 resume to re-attach storage URLs when content_json contains
 * stale `blob:` URLs from a previous session.
 */
export async function listAudiobookChapters(
  authorId: string,
  bookId: string,
): Promise<AudiobookChapterFile[]> {
  if (!authorId || !bookId) return [];
  try {
    const token = await getActiveToken();
    if (!token) return [];
    const res = await fetchWithTimeout(
      SAVE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "list-audio", authorId, bookId }),
      },
      20000,
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[listAudiobookChapters] failed:", res.status, errBody.slice(0, 300));
      return [];
    }
    const data = (await res.json()) as { chapters?: AudiobookChapterFile[] };
    return Array.isArray(data?.chapters) ? data.chapters : [];
  } catch (err) {
    console.error("[listAudiobookChapters] exception:", err);
    return [];
  }
}
