const PUBLISHNOW_BASE = "https://publishnowinterface.lovable.app/#";

/**
 * Open PublishNow in a new tab at the given path.
 * SSO handoff is currently unavailable, so we link directly.
 */
export async function redirectToPublishNow(
  targetPath: string = "/dashboard"
): Promise<{ error?: string }> {
  try {
    window.open(`${PUBLISHNOW_BASE}${targetPath}`, "_blank");
    return {};
  } catch (err: any) {
    return { error: err.message || "Could not open PublishNow" };
  }
}
