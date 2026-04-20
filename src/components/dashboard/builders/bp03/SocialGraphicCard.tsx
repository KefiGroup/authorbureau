import { useEffect, useRef, useState } from "react";
import {
  PLATFORM_DIMENSIONS,
  PLATFORM_TAB_LABELS,
  renderSocialGraphic,
  type SocialPlatform,
} from "./socialGraphic";

interface Props {
  platform: SocialPlatform;
  authorName: string;
  authorPhotoUrl?: string | null;
  bookColor?: string | null;
  bookTitle?: string;
  pullQuote: string;
  className?: string;
}

/**
 * Renders a branded social graphic preview at the platform's correct aspect ratio.
 * Re-renders whenever inputs change.
 */
export default function SocialGraphicCard({
  platform,
  authorName,
  authorPhotoUrl,
  bookColor,
  bookTitle,
  pullQuote,
  className = "",
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    (async () => {
      try {
        const blob = await renderSocialGraphic({
          platform,
          authorName,
          authorPhotoUrl,
          bookColor,
          bookTitle,
          pullQuote,
        });
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
      } catch (e) {
        console.error("[SocialGraphicCard] render failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [platform, authorName, authorPhotoUrl, bookColor, bookTitle, pullQuote]);

  const dims = PLATFORM_DIMENSIONS[platform];

  return (
    <div
      className={`w-full overflow-hidden rounded-lg border border-border bg-muted/30 ${className}`}
      style={{ aspectRatio: dims.aspect }}
    >
      {url ? (
        <img
          ref={imgRef}
          src={url}
          alt={`${PLATFORM_TAB_LABELS[platform]} preview`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
          {loading ? "Rendering preview…" : "Preview unavailable"}
        </div>
      )}
    </div>
  );
}
