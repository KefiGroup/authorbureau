// Tiny helper used by every deploy-* edge function to fire-and-forget
// the marketing asset pack generator after a node flips to status='live'.

export async function triggerAssetPack(params: {
  author_id: string;
  node_id: string;
  book_id?: string | null;
  source?: string;
}): Promise<void> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-asset-pack`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    // Fire-and-forget; we don't await so the deploy stays snappy.
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        author_id: params.author_id,
        node_id: params.node_id,
        book_id: params.book_id ?? null,
        source: params.source ?? "deploy_function",
      }),
    }).catch((e) => console.warn("triggerAssetPack failed:", e?.message));
  } catch (err) {
    console.warn("triggerAssetPack threw:", (err as Error).message);
  }
}
