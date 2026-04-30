import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

const SUPERADMIN_EMAILS = ["paulinet77@gmail.com", "mitchcarson@rocketmail.com"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(token: string) {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Try Cloud auth first
  const { data: { user: cloudUser } } = await client.auth.getUser(token);
  if (cloudUser) {
    const { data: roleData } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", cloudUser.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleData) return { userId: cloudUser.id, client };
    if (cloudUser.email && SUPERADMIN_EMAILS.includes(cloudUser.email.toLowerCase())) {
      return { userId: cloudUser.id, client };
    }
    return { userId: null, client: null };
  }

  // Fallback: shared backend token
  const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
  const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
  if (!sharedUser) return { userId: null, client: null };

  if (sharedUser.email && SUPERADMIN_EMAILS.includes(sharedUser.email.toLowerCase())) {
    const { data: profile } = await client
      .from("author_profiles")
      .select("user_id")
      .eq("user_id", sharedUser.id)
      .maybeSingle();
    return { userId: profile?.user_id || sharedUser.id, client };
  }

  const { data: roleData } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", sharedUser.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleData) return { userId: sharedUser.id, client };

  return { userId: null, client: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId, client: adminClient } = await verifyAdmin(token);
    if (!userId || !adminClient) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const { action, bookId, page = 1, filter } = body;

    if (action === "list") {
      const pageSize = 20;
      const from = (page - 1) * pageSize;
      
      let query = adminClient
        .from("books")
        .select("id, title, subtitle, author_name, genre, cover_image_url, slug, published_at, created_at, entry_mode, description, amazon_url, price, currency, kindle_price, paperback_price, pages, rating, badges, bestseller_proof_url, owner_email, approval_status, rejection_note, submitted_at, review_round, last_review_action_at")
        .order("created_at", { ascending: false });

      // Filter: "pending" = not published, "published" = published, default = all
      if (filter === "pending") {
        query = query.is("published_at", null);
      } else if (filter === "published") {
        query = query.not("published_at", "is", null);
      }

      const { data: books, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;

      // Get total count for the current filter
      let totalQuery = adminClient
        .from("books")
        .select("id", { count: "exact", head: true });
      if (filter === "pending") {
        totalQuery = totalQuery.is("published_at", null);
      } else if (filter === "published") {
        totalQuery = totalQuery.not("published_at", "is", null);
      }
      const { count: totalCount } = await totalQuery;

      // Also get pending count for badge
      const { count: pendingCount } = await adminClient
        .from("books")
        .select("id", { count: "exact", head: true })
        .is("published_at", null);

      return new Response(JSON.stringify({ books: books || [], pendingCount: pendingCount || 0, totalCount: totalCount || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      if (!bookId) {
        return new Response(JSON.stringify({ error: "bookId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: approveError } = await adminClient
        .from("books")
        .update({ published_at: new Date().toISOString(), approval_status: "approved", rejection_note: null })
        .eq("id", bookId);
      if (approveError) throw approveError;

      // Send "Book Page Live" email notification via transactional email system
      try {
        const { data: approvedBook } = await adminClient
          .from("books")
          .select("title, slug, author_id, owner_email, author_name")
          .eq("id", bookId)
          .single();

        if (approvedBook) {
          let authorEmail = approvedBook.owner_email || null;
          if (!authorEmail) {
            const { data: { user: authorUser } } = await adminClient.auth.admin.getUserById(approvedBook.author_id);
            authorEmail = authorUser?.email || null;
          }

          if (authorEmail) {
            const bookPageUrl = `https://authorsbureau.com/books/${approvedBook.slug}`;
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const emailClient = createClient(supabaseUrl, supabaseServiceKey);
            await emailClient.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'book-approved',
                recipientEmail: authorEmail,
                idempotencyKey: `book-approved-${bookId}`,
                templateData: {
                  authorName: approvedBook.author_name || '',
                  bookTitle: approvedBook.title,
                  bookPageUrl,
                },
              },
            });
            console.log("[admin-books] Approval email queued for", authorEmail);
          }
        }
      } catch (emailErr) {
        console.error("[admin-books] Approval email failed (non-fatal):", emailErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject" || action === "request-changes") {
      if (!bookId) {
        return new Response(JSON.stringify({ error: "bookId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rejectionNote = (body.rejectionNote || body.reason || "").toString().trim() || null;
      if (!rejectionNote) {
        return new Response(JSON.stringify({ error: "A reason / note is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newStatus = action === "request-changes" ? "changes_requested" : "rejected";
      const { error: rejectError } = await adminClient
        .from("books")
        .update({ published_at: null, approval_status: newStatus, rejection_note: rejectionNote })
        .eq("id", bookId);
      if (rejectError) throw rejectError;
      // DB trigger handles in-portal notification + audit log to author.
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!bookId) {
        return new Response(JSON.stringify({ error: "bookId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: deleteError } = await adminClient.from("books").delete().eq("id", bookId);
      if (deleteError) throw deleteError;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pending-counts") {
      const { count: pendingBooks } = await adminClient
        .from("books")
        .select("id", { count: "exact", head: true })
        .is("published_at", null);

      const { count: pendingAuthors } = await adminClient
        .from("author_profiles")
        .select("id", { count: "exact", head: true })
        .eq("directory_status", "unlisted");

      const { count: totalBooks } = await adminClient
        .from("books")
        .select("id", { count: "exact", head: true });

      return new Response(JSON.stringify({
        pendingBooks: pendingBooks || 0,
        pendingAuthors: pendingAuthors || 0,
        totalBooks: totalBooks || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
