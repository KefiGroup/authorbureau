/**
 * Returns the local /auth route with optional redirect parameters.
 * All sign-in / sign-up CTAs now route to the local Auth page.
 */
export function getPublishNowAuthUrl(targetPath: string = "/dashboard"): string {
  const normalizedTarget = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  return `/auth?redirect=${encodeURIComponent(normalizedTarget)}`;
}
