// Switch the active design among the saved cover_image_history entries.
// Validates the requesting user owns the author_node, then flips is_active
// flags and mirrors the chosen URL into author_nodes.cover_image_url.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type HistEntry = { url: string; created_at: string; is_active: boolean };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const resolved = await resolveUser(authHeader);
    if (!resolved.id && !resolved.email) {
      return new Response(
        JSON.stringify({ success: false, status: 401, message: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { authorNodeId, authorId, nodeId, bookId, url } = body || {};
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, status: 400, message: "url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    let nodeQuery = admin
      .from("author_nodes")
      .select("id, author_id, book_id, cover_image_history");
    if (authorNodeId) {
      nodeQuery = nodeQuery.eq("id", authorNodeId);
    } else if (authorId && nodeId) {
      nodeQuery = nodeQuery.eq("author_id", authorId).eq("node_id", nodeId);
      if (bookId) nodeQuery = nodeQuery.eq("book_id", bookId);
    } else {
      return new Response(
        JSON.stringify({ success: false, status: 400, message: "Provide authorNodeId or (authorId + nodeId)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: node, error: nodeErr } = await nodeQuery.maybeSingle();
    if (nodeErr || !node) {
      return new Response(
        JSON.stringify({ success: false, status: 404, message: "author_node not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ownership: author_profiles.user_id matches resolved.id, OR fall back to
    // matching the resolved email against the author's email/owner_email.
    const { data: authorRow } = await admin
      .from("author_profiles")
      .select("user_id, email")
      .eq("id", node.author_id)
      .maybeSingle();
    const ownsById = !!(authorRow && resolved.id && authorRow.user_id === resolved.id);
    const ownsByEmail = !!(
      authorRow &&
      resolved.email &&
      authorRow.email &&
      authorRow.email.toLowerCase() === resolved.email.toLowerCase()
    );
    if (!authorRow || (!ownsById && !ownsByEmail)) {
      return new Response(
        JSON.stringify({ success: false, status: 403, message: "Not your author_node" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const history: HistEntry[] = Array.isArray(node.cover_image_history)
      ? (node.cover_image_history as HistEntry[])
      : [];
    if (!history.some((h) => h.url === url)) {
      return new Response(
        JSON.stringify({ success: false, status: 400, message: "URL not in history" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updated = history.map((h) => ({ ...h, is_active: h.url === url }));

    await admin
      .from("author_nodes")
      .update({ cover_image_url: url, cover_image_history: updated })
      .eq("id", node.id);

    return new Response(
      JSON.stringify({ success: true, status: 200, message: "ok", cover_url: url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("set-active-product-cover error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, status: 500, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
