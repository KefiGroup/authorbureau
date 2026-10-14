/**
 * Node update registry. When a module's engine/design improves, bump its
 * version here and add release notes. Authors whose saved node has an older
 * `content_json._engineVersion` (missing = 1) see an "update available" notice.
 */
export interface NodeUpdate {
  nodeId: string;
  version: number;
  title: string;
  highlights: string[];
  /** What the author should do to get the new version. */
  action: string;
}

export const NODE_UPDATES: Record<string, NodeUpdate> = {
  "BP-03": {
    nodeId: "BP-03",
    version: 2,
    title: "New social post designs",
    highlights: [
      "A different layout for each post type (quote, story, question, lesson, framework, proof)",
      "Your photo is framed so your face is never cut off",
      "Every graphic now shows a clear call to action",
    ],
    action:
      "Your posts below already show the new designs. Check them, then download the kit again or re-send to your Social Calendar.",
  },
};

export function getStoredVersion(contentJson: unknown): number {
  const v = Number((contentJson as any)?._engineVersion);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export function getPendingUpdate(nodeId: string, contentJson: unknown): NodeUpdate | null {
  const u = NODE_UPDATES[nodeId];
  if (!u || !contentJson) return null;
  return getStoredVersion(contentJson) < u.version ? u : null;
}
