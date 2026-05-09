import { useState } from "react";
import { publishNodeToSite, StripeRequiredError } from "@/lib/publish-node";
import { getActiveToken } from "@/lib/get-active-token";

/** Fire-and-forget: ask the gate engine to re-evaluate after a successful publish. */
function fireGateEngine(authorId: string, bookId: string | null) {
  (async () => {
    try {
      const token = await getActiveToken();
      if (!token) return;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-gate-engine`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ author_id: authorId, book_id: bookId }),
      });
    } catch (e) {
      console.warn("[useBuilderPublish] gate engine fire failed:", e);
    }
  })();
}

/**
 * Canonical publish helper — modelled on the BP-06 reference.
 *
 * Wraps publishNodeToSite with:
 *  - optional pre-publish library asset upload
 *  - StripeRequiredError surfacing (so callers can open a Connect modal)
 *  - shared error / busy state
 */
export interface UseBuilderPublishOptions {
  authorId: string | null;
  nodeId: string;
  authorSlug: string;
  activeBookId: string | null;
  /** Optional async hook that builds + uploads a library asset before publish. */
  buildLibraryAsset?: () => Promise<Record<string, unknown> | null>;
  onStripeRequired?: () => void;
}

export interface PublishResult {
  micrositeUrl: string | null;
  libraryAsset: Record<string, unknown> | null;
}

export function useBuilderPublish(opts: UseBuilderPublishOptions) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function publish(): Promise<PublishResult | null> {
    if (!opts.authorId) return null;
    setIsPublishing(true);
    setPublishError(null);

    // Errors we should NOT silently retry (user-actionable or terminal).
    const isTerminal = (msg: string) =>
      /^(STRIPE_REQUIRED|MANUSCRIPT_MISSING|BOOK_NOT_FOUND|AI_AUTH|AI_CREDITS|AI_UNAVAILABLE|VALIDATION):/i.test(msg) ||
      /not authenticated|forbidden|403|401/i.test(msg);

    const attempt = async (): Promise<PublishResult> => {
      let libraryAsset: Record<string, unknown> | null = null;
      if (opts.buildLibraryAsset) {
        libraryAsset = await opts.buildLibraryAsset();
      }
      const { micrositeUrl } = await publishNodeToSite(
        opts.authorId!,
        opts.nodeId,
        opts.authorSlug,
        opts.activeBookId,
        libraryAsset,
      );
      return { micrositeUrl, libraryAsset };
    };

    try {
      try {
        const result = await attempt();
        fireGateEngine(opts.authorId!, opts.activeBookId);
        return result;
      } catch (firstErr) {
        if (firstErr instanceof StripeRequiredError) throw firstErr;
        const msg = (firstErr as Error)?.message || "";
        if (isTerminal(msg)) throw firstErr;
        // Silent single retry after a brief backoff for transient failures.
        await new Promise((r) => setTimeout(r, 800));
        const result = await attempt();
        fireGateEngine(opts.authorId!, opts.activeBookId);
        return result;
      }
    } catch (e: unknown) {
      if (e instanceof StripeRequiredError) {
        opts.onStripeRequired?.();
        return null;
      }
      const msg = (e as Error)?.message || "Publish failed";
      setPublishError(msg);
      throw e;
    } finally {
      setIsPublishing(false);
    }
  }

  return { publish, isPublishing, publishError, setPublishError };
}
