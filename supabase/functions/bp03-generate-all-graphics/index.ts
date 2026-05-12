// bp03-generate-all-graphics
// Phase 3: batch-generate copy-paste-ready graphics for every BP-03 social post
// that doesn't yet have one. Returns counts; the calendar reloads to show
// thumbnails + Download buttons.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const PLATFORM_SPECS: Record<string, { width: number; height: number; label: string }> = {
  instagram: { width: 1080, height: 1350, label: "Instagram (4:5)" },
  linkedin: { width: 1200, height: 627, label: "LinkedIn (1.91:1)" },
  facebook: { width: 1200, height: 630, label: "Facebook (1.91:1)" },
  x: { width: 1200, height: 675, label: "X (16:9)" },
  twitter: { width: 1200, height: 675, label: "X (16:9)" },
};

async function generateOneGraphic(opts: {
  userId: string;
  platform: string;
  bookTitle: string;
  bookCoverUrl?: string | null;
  caption: string;
}): Promise<string | null> {
  const spec = PLATFORM_SPECS[opts.platform] || PLATFORM_SPECS.instagram;
  const firstLine = (opts.caption || "").split(/\n+/)[0]?.slice(0, 140) || "";
  const prompt = `Create a premium scroll-stopping ${spec.label} social graphic for the book "${opts.bookTitle}".
Visual concept inspired by this caption opening: "${firstLine}".
Clean editorial composition, brand-safe palette, NO text/letters/typography in the image.
Aspect ratio ${spec.width}x${spec.height}. Look like a professional designer made it — not AI.`;

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
    const limit: number = Math.min(Math.max(Number(body?.limit) || 20, 1), 30);

    if (!authorId) {
      return new Response(JSON.stringify({ success: false, status: "bad_request", message: "author_id required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: profile } = await admin
      .from("author_profiles")
      .select("id, user_id")
      .eq("id", authorId)
      .maybeSingle();
    if (!profile?.user_id) {
      return new Response(JSON.stringify({ success: false, status: "not_found", message: "Author not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a book for cover reference
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
      .select("id, platform, content")
      .eq("author_id", authorId)
      .eq("node_id", "BP-03")
      .in("status", ["draft", "ready"])
      .or("graphic_url.is.null,graphic_url.eq.")
      .order("post_index", { ascending: true })
      .limit(limit);
    if (bookId) postsQuery = postsQuery.eq("book_id", bookId);
    const { data: posts, error: pErr } = await postsQuery;
    if (pErr) throw pErr;

    const targets = posts || [];
    let generated = 0;
    let failed = 0;

    for (const p of targets) {
      try {
        const url = await generateOneGraphic({
          userId: profile.user_id,
          platform: p.platform,
          bookTitle,
          bookCoverUrl,
          caption: p.content || "",
        });
        if (url) {
          await admin.from("social_posts").update({ graphic_url: url }).eq("id", p.id);
          generated++;
        } else {
          failed++;
        }
      } catch (e) {
        console.error("[bp03-generate-all-graphics] post failed", p.id, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "ok",
        message: `${generated} graphic(s) generated${failed ? `, ${failed} failed` : ""}.`,
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
