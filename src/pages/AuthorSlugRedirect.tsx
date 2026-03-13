import { Navigate, useParams } from "react-router-dom";

/**
 * Redirects /authors/:slug to /:slug (301-equivalent client-side redirect).
 */
export function AuthorSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/${slug}`} replace />;
}
