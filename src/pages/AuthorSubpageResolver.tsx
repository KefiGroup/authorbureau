import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SLUG_TO_NODE } from "@/lib/node-slug-map";
import { supabase } from "@/integrations/supabase/client";
import MicrositePage from "./MicrositePage";
import AuthorBookPage from "./AuthorBookPage";
import FunnelPage from "./FunnelPage";
import ThankYouPage from "./ThankYouPage";

/**
 * Smart resolver for /:authorSlug/:slug routes.
 * If the slug matches a known node slug → render MicrositePage.
 * For unknown slugs → try MicrositePage (dynamic slug lookup).
 * MicrositePage shows not-found for unrecognised slugs, but we intercept
 * that case and fall back to AuthorBookPage.
 */
type Resolution =
  | { kind: "loading" }
  | { kind: "node" }
  | { kind: "funnel"; funnel: any }
  | { kind: "book" };

export default function AuthorSubpageResolver() {
  const { bookSlug } = useParams<{ bookSlug: string }>();
  const isThankYou = bookSlug === "thank-you";
  const isKnownNode = bookSlug ? !!SLUG_TO_NODE[bookSlug] : false;
  const [resolution, setResolution] = useState<Resolution>({ kind: "loading" });

  useEffect(() => {
    if (isThankYou) return; // handled by early return below — no async resolution
    if (!bookSlug) {
      setResolution({ kind: "book" });
      return;
    }
    if (isKnownNode) {
      setResolution({ kind: "node" });
      return;
    }

    let cancelled = false;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const authorSlug = window.location.pathname.split("/")[1];

    (async () => {
      // 1. Probe dynamic microsite node
      try {
        const nodeRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/get-microsite-page?author=${authorSlug}&slug=${encodeURIComponent(bookSlug)}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        if (cancelled) return;
        if (nodeRes.ok) {
          setResolution({ kind: "node" });
          return;
        }
      } catch { /* fall through */ }

      // 2. Check funnels table for live funnel matching this slug + author
      try {
        const { data: author } = await supabase
          .from("author_profiles")
          .select("id, pen_name")
          .eq("author_slug", authorSlug)
          .maybeSingle();

        if (author) {
          const { data: funnel } = await supabase
            .from("funnels")
            .select("id, title, headline, subheadline, body_copy, cta_text, cta_url, hero_image_url, background_color, accent_color")
            .eq("author_id", author.id)
            .eq("slug", bookSlug)
            .eq("status", "live")
            .maybeSingle();

          if (!cancelled && funnel) {
            setResolution({ kind: "funnel", funnel: { ...funnel, author_name: author.pen_name } });
            return;
          }
        }
      } catch { /* fall through */ }

      // 3. Fall back to book page
      if (!cancelled) setResolution({ kind: "book" });
    })();

    return () => { cancelled = true; };
  }, [bookSlug, isKnownNode]);

  if (isThankYou) return <ThankYouPage />;

  if (resolution.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  if (resolution.kind === "node") return <MicrositePage />;
  if (resolution.kind === "funnel") return <FunnelPage funnel={resolution.funnel} />;
  return <AuthorBookPage />;
}
