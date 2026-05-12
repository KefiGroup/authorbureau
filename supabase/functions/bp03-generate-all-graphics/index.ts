// bp03-generate-all-graphics
// Sprint 62 — generate THREE size variants (landscape / portrait / square) per
// BP-03 social post and persist them on social_posts.graphics (JSONB), keeping
// graphic_url populated with the platform-default size for back-compat.
// The image prompt now embeds author + book + site theme as brand-kit context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type SizeKey = "landscape" | "portrait" | "square";

const SIZE_SPECS: Record<SizeKey, { width: number; height: number; label: string }> = {
  landscape: { width: 1200, height: 627, label: "Landscape 1200×627 (LinkedIn / Facebook / X)" },
  portrait: { width: 1080, height: 1350, label: "Portrait 1080×1350 (Instagram feed)" },
  square: { width: 1080, height: 1080, label: "Square 1080×1080 (multi-purpose)" },
};

// Per-platform default size used to populate the legacy graphic_url field.
const PLATFORM_DEFAULT_SIZE: Record<string, SizeKey> = {
  linkedin: "landscape",
  facebook: "landscape",
  x: "landscape",
  twitter: "landscape",
  instagram: "portrait",
};

function brandKitBlock(opts: {
  authorName: string;
  bookTitle: string;
  siteTheme?: string | null;
}): string {
  const themeHint = opts.siteTheme ? `Site theme cue: ${opts.siteTheme}.` : "Default to a confident, editorial palette.";
  return `BRAND KIT:
- Author: ${opts.authorName}
- Book: "${opts.bookTitle}"
- ${themeHint}
- Reuse the same palette + composition language across every variant so they read as one cohesive series.
- Keep author name and book title as PART OF THE DESIGN SYSTEM (typography, lower-third or footer line) where it serves the layout.`;
}

async function generateOneGraphic(opts: {
  userId: string;
  size: SizeKey;
  bookTitle: string;
  bookCoverUrl?: string | null;
  authorName: string;
  siteTheme?: string | null;
  caption: string;
  archetype?: string | null;
}): Promise<string | null> {
  const spec = SIZE_SPECS[opts.size];
  const firstLine = (opts.caption || "").split(/\n+/)[0]?.slice(0, 160) || "";
  const archetype = opts.archetype ? `Archetype: ${opts.archetype}.` : "";
  const prompt = `Create a premium scroll-stopping ${spec.label} social graphic for the book "${opts.bookTitle}".
${archetype}
Visual concept inspired by this caption opening: "${firstLine}".
${brandKitBlock({ authorName: opts.authorName, bookTitle: opts.bookTitle, siteTheme: opts.siteTheme })}
Clean editorial composition. Aspect ratio ${spec.width}x${spec.height}.
Look like a senior brand designer made it — no AI tells, no clip-art, no awkward typography.`;

  const messageContent: any[] = [{ type: "text", text: prompt }];
  if (opts.bookCoverUrl) {
    messageContent.push({ type: "image_url", image_url: { url: opts.bookCoverUrl } });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: messageContent }],
      modalities: ["image", "text"],
    }),
  });

  if (!resp.ok) {
    console.error("[bp03-generate-all-graphics] AI gateway error", resp.status, await resp.text().catch(() => ""));
    return null;
  }

  const data = await resp.json();
  const dataUrl: string | undefined = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) return null;

  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!m) return null;
  const ext = m[1];
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const fileName = `${opts.userId}/${crypto.randomUUID()}.${ext}`;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await admin.storage.from("social-media-graphics").upload(fileName, bytes, {
    contentType: `image/${ext}`,
    upsert: false,
  });
  if (error) {
    console.error("[bp03-generate-all-graphics] upload error", error);
    return null;
  }
  const { data: pub } = admin.storage.from("social-media-graphics").getPublicUrl(fileName);
  return pub.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const authorId: string | null = body?.author_id ?? null;
    const bookId: string | null = body?.book_id ?? null;
    const limit: number = Math.min(Math.max(Number(body?.limit) || 30, 1), 30);

    if (!authorId) {
      return new Response(JSON.stringify({ success: false, status: "bad_request", message: "author_id required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: profile } = await admin
      .from("author_profiles")
      .select("id, user_id, pen_name, site_theme")
      .eq("id", authorId)
      .maybeSingle();
    if (!profile?.user_id) {
      return new Response(JSON.stringify({ success: false, status: "not_found", message: "Author not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorName = (profile as any).pen_name || "the author";
    const siteTheme = (profile as any).site_theme || null;

    let bookTitle = "your book";
    let bookCoverUrl: string | null = null;
    if (bookId) {
      const { data: b } = await admin.from("books").select("title, cover_url").eq("id", bookId).maybeSingle();
      if (b) { bookTitle = b.title || bookTitle; bookCoverUrl = b.cover_url || null; }
    }
    if (!bookCoverUrl) {
      const { data: b } = await admin
        .from("books")
        .select("title, cover_url")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (b) { bookTitle = bookTitle === "your book" ? (b.title || bookTitle) : bookTitle; bookCoverUrl = bookCoverUrl || b.cover_url || null; }
    }

    let postsQuery = admin
      .from("social_posts")
      .select("id, platform, content, archetype, post_type, graphics, graphic_url")
      .eq("author_id", authorId)
      .eq("node_id", "BP-03")
      .in("status", ["draft", "ready"])
      .order("post_index", { ascending: true })
      .limit(limit);
    if (bookId) postsQuery = postsQuery.eq("book_id", bookId);
    const { data: posts, error: pErr } = await postsQuery;
    if (pErr) throw pErr;

    // Skip posts that already have all 3 sizes generated.
    const targets = (posts || []).filter((p: any) => {
      const g = p.graphics;
      const has3 = g && typeof g === "object" && g.landscape && g.portrait && g.square;
      return !has3;
    });

    const SIZES: SizeKey[] = ["landscape", "portrait", "square"];
    let generated = 0;
    let failed = 0;

    for (const p of targets as any[]) {
      try {
        const existing = (p.graphics && typeof p.graphics === "object") ? p.graphics : {};
        const next: Record<string, string> = { ...existing };
        for (const size of SIZES) {
          if (next[size]) continue;
          const url = await generateOneGraphic({
            userId: profile.user_id,
            size,
            bookTitle,
            bookCoverUrl,
            authorName,
            siteTheme,
            caption: p.content || "",
            archetype: p.archetype || p.post_type || null,
          });
          if (url) {
            next[size] = url;
            generated++;
          } else {
            failed++;
          }
        }
        // Choose the legacy preview URL based on platform default.
        const defaultSize = PLATFORM_DEFAULT_SIZE[p.platform] || "square";
        const legacyUrl = next[defaultSize] || next.square || next.landscape || next.portrait || null;
        await admin
          .from("social_posts")
          .update({ graphics: next, graphic_url: legacyUrl })
          .eq("id", p.id);
      } catch (e) {
        console.error("[bp03-generate-all-graphics] post failed", p.id, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "ok",
        message: `${generated} graphic variant(s) generated${failed ? `, ${failed} failed` : ""}.`,
        generated,
        failed,
        scanned: targets.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[bp03-generate-all-graphics] fatal", e);
    return new Response(
      JSON.stringify({ success: false, status: "error", message: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
