import { useState } from "react";
import { publishNodeToSite, StripeRequiredError } from "@/lib/publish-node";

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
    try {
      let libraryAsset: Record<string, unknown> | null = null;
      if (opts.buildLibraryAsset) {
        libraryAsset = await opts.buildLibraryAsset();
      }
      const { micrositeUrl } = await publishNodeToSite(
        opts.authorId,
        opts.nodeId,
        opts.authorSlug,
        opts.activeBookId,
        libraryAsset,
      );
      return { micrositeUrl, libraryAsset };
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
