import { supabase } from "@/integrations/supabase/client";
import { getMicrositeUrl, NO_MICROSITE_NODES } from "@/lib/node-slug-map";

/**
 * Publishes a node's content to the author's microsite.
 * Sets status = 'live', saves content_json, and sets microsite_url.
 * 
 * Call this instead of deploy-*-to-ghl in the builder's final step.
 * GHL activation is now done separately from the Marketing Hub.
 */
export async function publishNodeToSite(
  authorId: string,
  nodeId: string,
  penNameSlug: string,
): Promise<void> {
  const hasPublicPage = !NO_MICROSITE_NODES.has(nodeId);
  const micrositeUrl = hasPublicPage ? getMicrositeUrl(penNameSlug, nodeId) : null;

  const { error } = await supabase
    .from("author_nodes")
    .update({
      status: "live",
      microsite_url: micrositeUrl,
      activated_at: new Date().toISOString(),
    })
    .eq("author_id", authorId)
    .eq("node_id", nodeId);

  if (error) {
    console.error("Failed to publish node:", error);
    throw new Error("Failed to publish your page. Please try again.");
  }
}
