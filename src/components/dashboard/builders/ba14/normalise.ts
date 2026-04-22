/**
 * Normalises BA-14 (Podcast) content to the new shape. Idempotent.
 *
 * Legacy: { show_title, first_10_episodes: [{ title, hook }], monetisation_strategy }
 * New:    { podcast_title, episodes: [{ title, description }], launch_plan }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalisePodcast(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    podcast_title: raw.podcast_title || raw.show_title || "",
    episodes: Array.isArray(raw.episodes)
      ? raw.episodes
      : Array.isArray(raw.first_10_episodes)
        ? raw.first_10_episodes.map((e: any) => ({
            title: e.title,
            description: e.description || e.hook || "",
          }))
        : [],
    launch_plan: raw.launch_plan || raw.monetisation_strategy || "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLegacyPodcast(raw: any): boolean {
  return !raw || !Array.isArray(raw.episodes) || raw.episodes.length === 0;
}
