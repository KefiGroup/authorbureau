const PUBLISHNOW_AUTH_BASE = "https://publishnow.io/#/auth";

export function getPublishNowAuthUrl(targetPath: string = "/dashboard"): string {
  const normalizedTarget = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  return `${PUBLISHNOW_AUTH_BASE}?from=authorsbureau&redirect=${encodeURIComponent(normalizedTarget)}`;
}
