import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SLUG_TO_NODE } from "@/lib/node-slug-map";
import MicrositePage from "./MicrositePage";
import AuthorBookPage from "./AuthorBookPage";

/**
 * Smart resolver for /:authorSlug/:slug routes.
 * If the slug matches a known node slug → render MicrositePage.
 * For unknown slugs → try MicrositePage (dynamic slug lookup).
 * MicrositePage shows not-found for unrecognised slugs, but we intercept
 * that case and fall back to AuthorBookPage.
 */
export default function AuthorSubpageResolver() {
  const { bookSlug } = useParams<{ bookSlug: string }>();
  const [isDynamicNode, setIsDynamicNode] = useState<boolean | null>(null);

  const isKnownNode = bookSlug ? !!SLUG_TO_NODE[bookSlug] : false;

  useEffect(() => {
    // For known node slugs or empty slugs, skip the check
    if (isKnownNode || !bookSlug) {
      setIsDynamicNode(false);
      return;
    }

    // For unknown slugs, probe the edge function to check if it's a dynamic node slug
    let cancelled = false;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const authorSlug = window.location.pathname.split("/")[1];

    fetch(
      `https://${projectId}.supabase.co/functions/v1/get-microsite-page?author=${authorSlug}&slug=${encodeURIComponent(bookSlug)}`,
      { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
    )
      .then(res => {
        if (!cancelled) setIsDynamicNode(res.ok);
      })
      .catch(() => {
        if (!cancelled) setIsDynamicNode(false);
      });

    return () => { cancelled = true; };
  }, [bookSlug, isKnownNode]);

  // Known node slug — always MicrositePage
  if (isKnownNode) {
    return <MicrositePage />;
  }

  // Still checking dynamic slug
  if (isDynamicNode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  // Dynamic slug matched a node
  if (isDynamicNode) {
    return <MicrositePage />;
  }

  // Not a node slug — render as book page
  return <AuthorBookPage />;
}
