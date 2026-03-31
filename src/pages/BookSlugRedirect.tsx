import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Redirects old /books/:slug URLs to the new /:authorSlug/:bookSlug pattern.
 */
export default function BookSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [target, setTarget] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); return; }

    (async () => {
      // Find book by slug
      const { data: book } = await supabase
        .from("books_public")
        .select("author_id, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (!book) { setNotFound(true); return; }

      // Find author slug
      const { data: profile } = await supabase
        .from("author_profiles_public")
        .select("author_slug")
        .eq("user_id", book.author_id)
        .maybeSingle();

      if (!profile?.author_slug) { setNotFound(true); return; }

      setTarget(`/${profile.author_slug}/${book.slug}`);
    })();
  }, [slug]);

  if (notFound) return <Navigate to="/directory" replace />;
  if (target) return <Navigate to={target} replace />;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-secondary" />
    </div>
  );
}
