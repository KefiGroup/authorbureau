import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const origin = req.headers.get("origin") || "https://authorbureau.lovable.app";

  // Fetch published books
  const { data: books } = await supabase
    .from("books")
    .select("slug, updated_at")
    .not("published_at", "is", null);

  // Fetch listed/verified/featured author profiles
  const { data: authors } = await supabase
    .from("author_profiles")
    .select("author_slug, updated_at")
    .in("directory_status", ["listed", "verified", "featured"])
    .not("author_slug", "is", null);

  let urls = `
  <url><loc>${origin}/</loc><priority>1.0</priority></url>
  <url><loc>${origin}/how-it-works</loc><priority>0.9</priority></url>
  <url><loc>${origin}/directory</loc><priority>0.8</priority></url>
  <url><loc>${origin}/methodology</loc><priority>0.7</priority></url>
  <url><loc>${origin}/faq</loc><priority>0.6</priority></url>
  <url><loc>${origin}/readers-bureau</loc><priority>0.6</priority></url>
  <url><loc>${origin}/contact</loc><priority>0.5</priority></url>
  <url><loc>${origin}/terms</loc><priority>0.3</priority></url>
  <url><loc>${origin}/privacy</loc><priority>0.3</priority></url>`;

  for (const book of books || []) {
    urls += `\n  <url><loc>${origin}/books/${book.slug}</loc><lastmod>${book.updated_at?.split("T")[0]}</lastmod><priority>0.7</priority></url>`;
  }

  for (const author of authors || []) {
    urls += `\n  <url><loc>${origin}/authors/${author.author_slug}</loc><lastmod>${author.updated_at?.split("T")[0]}</lastmod><priority>0.7</priority></url>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
