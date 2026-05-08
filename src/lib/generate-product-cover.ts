import { supabase } from "@/integrations/supabase/client";

export type ProductKind =
  | "workbook"
  | "home-study"
  | "course"
  | "special-edition"
  | "bundle"
  | "generic";

export interface GenerateProductCoverInput {
  /** Either authorNodeId, OR authorId + nodeId (+ bookId optional). */
  authorNodeId?: string;
  authorId?: string;
  nodeId?: string;
  bookId?: string | null;
  productKind: ProductKind;
  productTitle: string;
  productSubtitle?: string;
  authorName?: string;
  force?: boolean;
}

export interface GenerateProductCoverResult {
  success: boolean;
  status: number;
  message: string;
  cover_url?: string;
}

/**
 * Generate (or regenerate with force=true) an AI cover for a product node
 * that visually emulates the parent book cover. Stored on
 * `author_nodes.cover_image_url`. Safe to call fire-and-forget — the
 * microsite falls back to the SVG `WorkbookCoverArt` when no URL exists.
 */
export async function generateProductCover(
  input: GenerateProductCoverInput,
): Promise<GenerateProductCoverResult> {
  const { data, error } = await supabase.functions.invoke("generate-product-cover", {
    body: input,
  });
  if (error) {
    return { success: false, status: 500, message: error.message };
  }
  return data as GenerateProductCoverResult;
}
