import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

type DraftPayload = {
  currentStep?: number;
  stepData?: Record<string, unknown>;
  editedSteps?: string[];
  savedAt?: string;
};

async function resolveIdentity(token: string): Promise<{ userId: string; email: string | null } | null> {
  const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
  const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);

  if (sharedUser) {
    return { userId: sharedUser.id, email: sharedUser.email ?? null };
  }

  const localClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user: localUser } } = await localClient.auth.getUser();

  if (!localUser) return null;
  return { userId: localUser.id, email: localUser.email ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "load" | "save" | undefined;
    const bookId = body?.bookId as string | undefined;
    const nodeId = body?.nodeId as string | undefined;

    if (!action || !bookId || !nodeId) {
      return new Response(JSON.stringify({ error: "action, bookId, and nodeId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const identity = await resolveIdentity(token);
    if (!identity) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await cloudAdmin
      .from("author_profiles")
      .select("pen_name")
      .eq("user_id", identity.userId)
      .maybeSingle();

    const allUserIds: string[] = [identity.userId];
    if (profile?.pen_name) {
      const { data: siblingProfiles } = await cloudAdmin
        .from("author_profiles")
        .select("user_id")
        .eq("pen_name", profile.pen_name)
        .neq("user_id", identity.userId);
      for (const sibling of siblingProfiles || []) {
        allUserIds.push(sibling.user_id);
      }
    }

    const { data: book, error: bookError } = await cloudAdmin
      .from("books")
      .select("id, author_id, owner_email, author_name")
      .eq("id", bookId)
      .maybeSingle();

    if (bookError || !book) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasBookAccess =
      allUserIds.includes(book.author_id) ||
      (!!identity.email && !!book.owner_email && identity.email.toLowerCase() === book.owner_email.toLowerCase()) ||
      (!!profile?.pen_name && !!book.author_name && profile.pen_name === book.author_name);

    if (!hasBookAccess) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assetType = `builder_draft_${nodeId}`;

    if (action === "load") {
      const { data: draftRow, error: draftError } = await cloudAdmin
        .from("generated_assets")
        .select("content, updated_at")
        .eq("book_id", bookId)
        .eq("asset_type", assetType)
        .maybeSingle();

      if (draftError) {
        throw draftError;
      }

      if (!draftRow?.content) {
        return new Response(JSON.stringify({ draft: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let parsed: DraftPayload | null = null;
      try {
        parsed = JSON.parse(draftRow.content) as DraftPayload;
      } catch {
        parsed = null;
      }

      return new Response(JSON.stringify({
        draft: parsed
          ? { ...parsed, savedAt: parsed.savedAt || draftRow.updated_at }
          : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const payload = (body?.payload || {}) as DraftPayload;
      const savedAt = new Date().toISOString();
      const content = JSON.stringify({
        currentStep: payload.currentStep ?? 0,
        stepData: payload.stepData ?? {},
        editedSteps: Array.isArray(payload.editedSteps) ? payload.editedSteps : [],
        savedAt,
      });

      const { error: upsertError } = await cloudAdmin
        .from("generated_assets")
        .upsert(
          {
            author_id: book.author_id,
            book_id: bookId,
            asset_type: assetType,
            content,
            updated_at: savedAt,
          },
          { onConflict: "book_id,asset_type" }
        );

      if (upsertError) {
        throw upsertError;
      }

      return new Response(JSON.stringify({ ok: true, savedAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("builder-draft-state error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
