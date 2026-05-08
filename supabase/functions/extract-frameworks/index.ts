import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { resolveAuthorId } from "../_shared/resolve-author-id.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

async function resolveUser(token: string): Promise<{ id: string; email: string }> {
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await localClient.auth.getUser(token);
  if (localUser?.user?.id && localUser?.user?.email) {
    return { id: localUser.user.id, email: localUser.user.email };
  }

  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.id && sharedUser?.user?.email) {
      return { id: sharedUser.user.id, email: sharedUser.user.email };
    }
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub && payload.email) return { id: payload.sub, email: payload.email };
  } catch { /* ignore */ }

  throw new Error("Unauthorized");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId } = await req.json();
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const user = await resolveUser(token);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const authorId = (await resolveAuthorId(adminClient, user.id, user.email)) || user.id;

    const [manuscriptRes, bookRes] = await Promise.all([
      adminClient
        .from("generated_assets")
        .select("content")
        .eq("book_id", bookId)
        .eq("author_id", authorId)
        .eq("asset_type", "source_material")
        .maybeSingle(),
      adminClient
        .from("books")
        .select("title, subtitle, description, genre")
        .eq("id", bookId)
        .eq("author_id", authorId)
        .maybeSingle(),
    ]);

    const manuscript = manuscriptRes.data?.content;
    const book = bookRes.data;

    if (!manuscript) {
      return new Response(JSON.stringify({ error: "No manuscript found for this book" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use tool calling to extract structured frameworks
    const systemPrompt = `You are an expert book analyst. Your task is to read the entire book manuscript and extract the author's unique, proprietary frameworks, theories, methodologies, and step-by-step processes.

WHAT TO LOOK FOR:
- Named theories or concepts (e.g., "The SUCKcess Theory", "The 5P Method", "The Abundance Mindset Framework")
- Step-by-step processes or numbered systems the author teaches
- Acronyms the author uses to organize their ideas (e.g., ABBY = Automate, Build, Broadcast, Yield)
- Unique models, matrices, or mental frameworks
- Signature concepts that are central to the book's thesis
- Any methodology the author presents as their own original approach

WHAT TO IGNORE:
- Generic advice that isn't unique to this author
- Common industry terms that aren't the author's creation
- Chapter titles that aren't frameworks themselves

Extract 1-5 frameworks. For each, identify the name, a clear description, and the key principles/steps (3-7 per framework). If the book has no clear proprietary frameworks, extract the author's core methodology and present it as a framework using their own language.`;

    const truncatedManuscript = manuscript.slice(0, 200000);

    const response = await fetchAiGateway({
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Book: "${book?.title || "Unknown"}"${book?.subtitle ? ` — ${book.subtitle}` : ""}
Genre: ${book?.genre || "Unknown"}
Description: ${book?.description || "N/A"}

=== FULL MANUSCRIPT ===
${truncatedManuscript}
=== END MANUSCRIPT ===

Extract the author's unique frameworks, theories, and methodologies from this manuscript.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_frameworks",
              description: "Extract the author's proprietary frameworks, theories, and methodologies from the book manuscript.",
              parameters: {
                type: "object",
                properties: {
                  frameworks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "The name of the framework/theory/methodology as the author calls it" },
                        description: { type: "string", description: "A 1-3 sentence description of what this framework is and how it works" },
                        key_principles: {
                          type: "array",
                          items: { type: "string" },
                          description: "The 3-7 key steps, principles, or components of this framework",
                        },
                      },
                      required: ["name", "description", "key_principles"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["frameworks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_frameworks" } },
      }),
    }, "extract-frameworks");

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI extraction failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No frameworks extracted");
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const frameworks = extracted.frameworks || [];

    return new Response(JSON.stringify({ frameworks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-frameworks error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
