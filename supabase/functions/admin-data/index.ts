import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPERADMIN_EMAILS = ["paulinet77@gmail.com", "mitchcarson@rocketmail.com"];

async function verifyAdmin(token: string) {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Try Cloud auth first
  const { data: { user: cloudUser } } = await client.auth.getUser(token);
  if (cloudUser) {
    // Check user_roles table
    const { data: roleData } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", cloudUser.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleData) return { userId: cloudUser.id, client };

    // Check superadmin emails
    if (cloudUser.email && SUPERADMIN_EMAILS.includes(cloudUser.email.toLowerCase())) {
      return { userId: cloudUser.id, client };
    }
    return { userId: null, client: null };
  }

  // Fallback: shared backend token
  const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
  const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
  if (!sharedUser) return { userId: null, client: null };

  // Check superadmin emails for shared backend users
  if (sharedUser.email && SUPERADMIN_EMAILS.includes(sharedUser.email.toLowerCase())) {
    // Find or use the shared user's ID — look up matching Cloud user by email
    const { data: profile } = await client
      .from("author_profiles")
      .select("user_id")
      .eq("user_id", sharedUser.id)
      .maybeSingle();
    const resolvedId = profile?.user_id || sharedUser.id;
    return { userId: resolvedId, client };
  }

  // Non-superadmin shared user: check user_roles by shared user ID
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { userId, client } = await verifyAdmin(token);
    if (!userId || !client) return json({ error: "Admin access required" }, 403);

    const { action, ...params } = await req.json();

    // ─── Overview Counts ───
    if (action === "overview-counts") {
      const tables = [
        { key: "courses", table: "courses" },
        { key: "homeStudy", table: "home_study_courses" },
        { key: "audiobooks", table: "audiobooks" },
        { key: "podcasts", table: "podcasts" },
        { key: "socialMedia", table: "social_media_content" },
        { key: "emailFlows", table: "email_flows" },
        { key: "coaching", table: "coaching_packages" },
      ];

      const productCounts: Record<string, number> = {};
      await Promise.all(
        tables.map(async ({ key, table }) => {
          const { count } = await client.from(table).select("id", { count: "exact", head: true });
          productCounts[key] = count ?? 0;
        })
      );

      const [
        { count: crmCount },
        { count: subscriberCount },
        { count: bugCount },
        { count: feedbackCount },
      ] = await Promise.all([
        client.from("crm_contacts").select("id", { count: "exact", head: true }),
        client.from("author_subscribers").select("id", { count: "exact", head: true }),
        client.from("bug_reports").select("id", { count: "exact", head: true }).eq("status", "new"),
        client.from("feedback").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);

      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count: crmWeekCount } = await client
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo);

      // AI usage
      const { data: usageRows } = await client
        .from("ai_usage_logs")
        .select("feature, total_tokens, cost_estimate, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      let aiUsage = { totalTokens: 0, totalCost: 0, topFeatures: [] as any[], last7DaysTokens: 0 };
      if (usageRows && usageRows.length > 0) {
        const totalTokens = usageRows.reduce((s, r) => s + (r.total_tokens || 0), 0);
        const totalCost = usageRows.reduce((s, r) => s + parseFloat(String(r.cost_estimate || 0)), 0);
        const last7 = usageRows
          .filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000))
          .reduce((s, r) => s + (r.total_tokens || 0), 0);
        const featureMap: Record<string, number> = {};
        usageRows.forEach(r => { featureMap[r.feature] = (featureMap[r.feature] || 0) + (r.total_tokens || 0); });
        const topFeatures = Object.entries(featureMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([feature, tokens]) => ({ feature, tokens }));
        aiUsage = { totalTokens, totalCost, topFeatures, last7DaysTokens: last7 };
      }

      return json({
        productCounts,
        crmCount: crmCount ?? 0,
        crmWeekCount: crmWeekCount ?? 0,
        subscriberCount: subscriberCount ?? 0,
        bugCount: bugCount ?? 0,
        feedbackCount: feedbackCount ?? 0,
        aiUsage,
      });
    }

    // ─── Node Gating ───
    if (action === "list-node-gating") {
      const { data, error } = await client
        .from("node_gating")
        .select("node_id, category, is_open, updated_at")
        .order("category", { ascending: true })
        .order("node_id", { ascending: true });

      if (error) throw error;
      return json({ rows: data || [] });
    }

    if (action === "update-node-gating-node") {
      const { nodeId, category, isOpen } = params as {
        nodeId?: string;
        category?: string;
        isOpen?: boolean;
      };

      if (!nodeId || !category || typeof isOpen !== "boolean") {
        return json({ error: "nodeId, category, and isOpen are required" }, 400);
      }

      const updatedAt = new Date().toISOString();
      const { data, error } = await client
        .from("node_gating")
        .upsert(
          {
            node_id: nodeId,
            category,
            is_open: isOpen,
            updated_at: updatedAt,
            updated_by: userId,
          },
          { onConflict: "node_id" }
        )
        .select("node_id, category, is_open, updated_at")
        .single();

      if (error) throw error;
      return json({ success: true, row: data });
    }

    if (action === "update-node-gating-category") {
      const { categoryId, nodeIds, isOpen } = params as {
        categoryId?: string;
        nodeIds?: string[];
        isOpen?: boolean;
      };

      if (!categoryId || !Array.isArray(nodeIds) || nodeIds.length === 0 || typeof isOpen !== "boolean") {
        return json({ error: "categoryId, nodeIds, and isOpen are required" }, 400);
      }

      const validNodeIds = nodeIds.filter((id) => typeof id === "string" && id.length > 0);
      if (validNodeIds.length === 0) return json({ error: "nodeIds must contain valid values" }, 400);

      const updatedAt = new Date().toISOString();
      const { error } = await client
        .from("node_gating")
        .upsert(
          validNodeIds.map((nodeId) => ({
            node_id: nodeId,
            category: categoryId,
            is_open: isOpen,
            updated_at: updatedAt,
            updated_by: userId,
          })),
          { onConflict: "node_id" }
        );

      if (error) throw error;
      return json({ success: true, updated_at: updatedAt });
    }

    // ─── Authors ───
    if (action === "list-authors") {
      const { data: profiles } = await client
        .from("author_profiles")
        .select("id, user_id, pen_name, photo_url, photo_crop_y, bio_short, bio_long, genres, directory_status, author_slug, created_at, tagline, website_url, instagram_url, twitter_url, linkedin_url, youtube_url, amazon_author_profile_url, location_city, location_country, is_speaker, speaker_fee_range, availability_notes, photo_zoom, subscription_tier, suspended_at, suspended_reason, tier_expires_at, stripe_connected_account_id, stripe_onboarding_complete")
        .order("created_at", { ascending: false });

      const { data: books } = await client.from("books").select("author_id, author_name");
      const bookCounts = new Map<string, number>();
      (books || []).forEach((b: any) => {
        bookCounts.set(b.author_id, (bookCounts.get(b.author_id) || 0) + 1);
      });
      const bookCountsByName = new Map<string, number>();
      (books || []).forEach((b: any) => {
        if (b.author_name) bookCountsByName.set(b.author_name, (bookCountsByName.get(b.author_name) || 0) + 1);
      });

      const authors = (profiles || []).map((p: any) => {
        const byId = bookCounts.get(p.user_id) || 0;
        const byName = p.pen_name ? (bookCountsByName.get(p.pen_name) || 0) : 0;
        return { ...p, book_count: Math.max(byId, byName) };
      });

      return json({ authors });
    }

    if (action === "update-author") {
      const { userId: targetUserId, updates } = params;
      if (!targetUserId || !updates) return json({ error: "userId and updates required" }, 400);

      // Only allow safe fields
      const allowedFields = [
        "pen_name", "bio_short", "bio_long", "tagline", "genres", "directory_status",
        "photo_url", "photo_crop_y", "photo_zoom", "website_url", "instagram_url",
        "twitter_url", "linkedin_url", "youtube_url", "amazon_author_profile_url",
        "location_city", "location_country", "is_speaker", "speaker_fee_range", "availability_notes",
      ];
      const safeUpdates: Record<string, any> = {};
      for (const key of allowedFields) {
        if (key in updates) safeUpdates[key] = updates[key];
      }

      const { error } = await client
        .from("author_profiles")
        .update(safeUpdates)
        .eq("user_id", targetUserId);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── Support: Bug Reports ───
    if (action === "list-bugs") {
      const { data } = await client.from("bug_reports").select("*").order("created_at", { ascending: false });
      return json({ bugs: data || [] });
    }

    if (action === "update-bug") {
      const { id, status, admin_notes, assigned_to, priority } = params;
      if (!id) return json({ error: "id required" }, 400);
      const updateData: any = {};
      if (status) updateData.status = status;
      if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
      if (priority !== undefined) updateData.priority = priority;
      // Mark first response time when admin first moves out of "new" or adds notes
      if ((status && status !== "new") || admin_notes) {
        const { data: existing } = await client.from("bug_reports").select("first_response_at").eq("id", id).maybeSingle();
        if (!existing?.first_response_at) updateData.first_response_at = new Date().toISOString();
      }
      if (status === "resolved") updateData.resolved_at = new Date().toISOString();
      await client.from("bug_reports").update(updateData).eq("id", id);
      return json({ success: true });
    }

    // ─── Support: Feedback ───
    if (action === "list-feedback") {
      const { data } = await client.from("feedback").select("*").order("created_at", { ascending: false });
      return json({ feedback: data || [] });
    }

    if (action === "update-feedback") {
      const { id, status, admin_notes } = params;
      if (!id) return json({ error: "id required" }, 400);
      const updateData: any = {};
      if (status) updateData.status = status;
      if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
      await client.from("feedback").update(updateData).eq("id", id);
      return json({ success: true });
    }

    // ─── Support: Chat Sessions ───
    if (action === "list-chats") {
      const { data } = await client.from("chat_sessions").select("*").order("created_at", { ascending: false });
      return json({ chats: data || [] });
    }

    // ─── CRM Contacts ───
    if (action === "list-crm-contacts") {
      const { data: contacts } = await client
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false });

      // Get tags for all contacts
      const contactIds = (contacts || []).map((c: any) => c.id);
      let tags: any[] = [];
      if (contactIds.length > 0) {
        const { data: tagData } = await client
          .from("crm_contact_tags")
          .select("contact_id, tag")
          .in("contact_id", contactIds);
        tags = tagData || [];
      }

      const tagMap = new Map<string, string[]>();
      tags.forEach((t: any) => {
        const arr = tagMap.get(t.contact_id) || [];
        arr.push(t.tag);
        tagMap.set(t.contact_id, arr);
      });

      const enriched = (contacts || []).map((c: any) => ({
        ...c,
        tags: tagMap.get(c.id) || [],
      }));

      return json({ contacts: enriched });
    }

    // ─── Messages ───
    if (action === "list-messages") {
      const { data: msgs } = await client
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      // Enrich with author names
      const authorIds = [...new Set((msgs || []).map((m: any) => m.author_id))];
      let authorMap = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: profiles } = await client
          .from("author_profiles")
          .select("user_id, pen_name")
          .in("user_id", authorIds);
        (profiles || []).forEach((p: any) => {
          if (p.pen_name) authorMap.set(p.user_id, p.pen_name);
        });
      }

      const enriched = (msgs || []).map((m: any) => ({
        ...m,
        author_name: authorMap.get(m.author_id) || null,
      }));

      return json({ messages: enriched });
    }

    if (action === "update-message") {
      const { id, status, admin_notes } = params;
      if (!id) return json({ error: "id required" }, 400);
      const updateData: any = {};
      if (status) updateData.status = status;
      if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
      updateData.updated_at = new Date().toISOString();
      await client.from("contact_messages").update(updateData).eq("id", id);
      return json({ success: true });
    }

    // ─── Delete Author ───
    if (action === "delete-author") {
      const { userId: targetUserId } = params;
      if (!targetUserId) return json({ error: "userId required" }, 400);

      // Delete related data in order (products, then profile)
      const tables = [
        "home_study_courses", "courses", "coaching_packages", "audiobooks", "podcasts",
        "generated_assets", "cross_builder_pushes", "feature_requests",
        "ai_usage_logs", "email_campaigns", "email_templates", "email_flows",
        "author_subscribers", "contact_messages", "crm_contacts",
        "author_email_settings", "author_payout_settings", "consultation_sessions",
        "newsletter_signups",
      ];

      // Delete books separately (need book_ids first for cascade)
      const { data: authorBooks } = await client.from("books").select("id").eq("author_id", targetUserId);
      const bookIds = (authorBooks || []).map((b: any) => b.id);

      if (bookIds.length > 0) {
        // Delete book-related items
        await Promise.all([
          client.from("newsletter_signups").delete().in("book_id", bookIds),
          client.from("consultation_sessions").delete().in("book_id", bookIds),
        ]);
      }

      // Delete author-owned rows from all tables
      for (const table of tables) {
        await client.from(table).delete().eq("author_id", targetUserId);
      }

      // Delete books
      if (bookIds.length > 0) {
        await client.from("books").delete().in("id", bookIds);
      }

      // Delete profile
      await client.from("author_profiles").delete().eq("user_id", targetUserId);

      // Delete notifications
      await client.from("notifications").delete().eq("user_id", targetUserId);

      return json({ success: true });
    }

    // ─── Payouts: list purchases ───
    if (action === "list-purchases") {
      const { data: purchases } = await client
        .from("purchases")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return json({ purchases: purchases || [] });
    }

    // ─── Payouts: list payouts ───
    if (action === "list-payouts") {
      const { data: payouts } = await client
        .from("author_payouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return json({ payouts: payouts || [] });
    }

    // ─── Payouts: initiate payout ───
    if (action === "initiate-payout") {
      const { author_id, payout_method, amount, currency, purchase_count } = params;
      if (!author_id || !amount) return json({ error: "Missing fields" }, 400);
      const { error } = await client.from("author_payouts").insert({
        author_id,
        payout_method: payout_method || "stripe",
        amount,
        currency: currency || "USD",
        purchase_count: purchase_count || 0,
        status: "pending",
        initiated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return json({ success: true });
    }

    // ─── Payouts: status of automation secrets + last cron runs ───
    if (action === "payouts-status") {
      const stripeReady = !!Deno.env.get("STRIPE_SECRET_KEY");
      const { data: lastPayout } = await client
        .from("author_payouts_v2")
        .select("created_at, status")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: lastStatement } = await client
        .from("author_annual_statements")
        .select("generated_at, tax_year")
        .order("generated_at", { ascending: false }).limit(1).maybeSingle();
      return json({
        stripe_ready: stripeReady,
        last_payout_at: lastPayout?.created_at ?? null,
        last_statement_at: lastStatement?.generated_at ?? null,
        last_statement_year: lastStatement?.tax_year ?? null,
      });
    }

    // ─── Payouts: trigger monthly payout run NOW ───
    if (action === "run-monthly-payouts-now") {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/run-monthly-payouts`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ triggered_by: "admin", admin_user_id: userId }),
      });
      const text = await res.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep text */ }
      return json({ ok: res.ok, status: res.status, result: data });
    }

    // ─── Payouts: trigger annual statements generation NOW ───
    if (action === "generate-annual-statements-now") {
      const taxYear = (params as { tax_year?: number }).tax_year;
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-annual-statements`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(taxYear ? { tax_year: taxYear } : {}),
      });
      const text = await res.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep text */ }
      return json({ ok: res.ok, status: res.status, result: data });
    }

    // ─── Refund: proxy to refund-purchase edge function ───
    if (action === "refund-purchase") {
      const { purchase_id, reason } = params as { purchase_id?: string; reason?: string };
      if (!purchase_id || !reason) return json({ error: "purchase_id and reason required" }, 400);
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/refund-purchase`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward the admin's bearer token so refund-purchase can re-verify them
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchase_id, reason }),
      });
      const text = await res.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep text */ }
      return json(data, res.status);
    }

    // ─── System Health: connector secrets, last cron runs, recent edge errors ───
    if (action === "system-health") {
      const secrets = {
        stripe: !!Deno.env.get("STRIPE_SECRET_KEY"),
        stripe_webhook: !!Deno.env.get("STRIPE_WEBHOOK_SECRET"),
        resend: !!Deno.env.get("RESEND_API_KEY"),
        elevenlabs: !!Deno.env.get("ELEVENLABS_API_KEY"),
        buffer: !!Deno.env.get("BUFFER_API_KEY"),
        lovable_ai: !!Deno.env.get("LOVABLE_API_KEY"),
        perplexity: !!Deno.env.get("PERPLEXITY_API_KEY"),
        firecrawl: !!Deno.env.get("FIRECRAWL_API_KEY"),
      };

      const [lastPayout, lastStatement, lastEmailSync, recentAudit] = await Promise.all([
        client.from("author_payouts_v2").select("created_at, status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        client.from("author_annual_statements").select("generated_at, tax_year").order("generated_at", { ascending: false }).limit(1).maybeSingle(),
        client.from("email_sync_log").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        client.from("admin_audit_log").select("event_key, created_at, target_type, payload").order("created_at", { ascending: false }).limit(20),
      ]);

      // Real error count from system_error_log (last 24h, unresolved)
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count: errorCount24h } = await client
        .from("system_error_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      const { count: unresolvedCritical } = await client
        .from("system_error_log")
        .select("id", { count: "exact", head: true })
        .eq("severity", "critical")
        .is("resolved_at", null);

      return json({
        secrets,
        crons: {
          last_payout_at: lastPayout?.data?.created_at ?? null,
          last_statement_at: lastStatement?.data?.generated_at ?? null,
          last_statement_year: lastStatement?.data?.tax_year ?? null,
          last_email_sync_at: lastEmailSync?.data?.created_at ?? null,
        },
        error_count_24h: errorCount24h ?? 0,
        recent_activity: recentAudit?.data ?? [],
      });
    }

    // ─── Wave 3: Author lifecycle ───
    if (action === "suspend-author") {
      const { authorId, suspend, reason } = params;
      if (!authorId || typeof suspend !== "boolean") return json({ error: "authorId and suspend required" }, 400);
      const { data, error } = await client.rpc("admin_set_author_suspension", {
        p_author_id: authorId, p_suspend: suspend, p_reason: reason ?? null,
      });
      if (error) throw error;
      return json(data);
    }

    if (action === "set-author-tier") {
      const { authorId, tier, expiresAt } = params;
      if (!authorId || !tier) return json({ error: "authorId and tier required" }, 400);
      const { data, error } = await client.rpc("admin_set_author_tier", {
        p_author_id: authorId, p_tier: tier, p_expires_at: expiresAt ?? null,
      });
      if (error) throw error;
      return json(data);
    }

    // ─── Wave 3: Broadcast ───
    if (action === "send-broadcast") {
      const { title, message, link, audience } = params;
      if (!title || !message) return json({ error: "title and message required" }, 400);
      const { data, error } = await client.rpc("admin_send_broadcast", {
        p_title: title, p_message: message, p_link: link ?? null, p_audience: audience ?? "all",
      });
      if (error) throw error;
      return json(data);
    }

    // ─── Wave 3: Audit log viewer ───
    if (action === "audit-log") {
      const { eventKey, targetType, since, until, search, limit = 100, offset = 0 } = params;
      let q = client.from("admin_audit_log")
        .select("id, actor_id, actor_email, event_key, target_type, target_id, payload, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + Math.min(limit, 500) - 1);
      if (eventKey) q = q.eq("event_key", eventKey);
      if (targetType) q = q.eq("target_type", targetType);
      if (since) q = q.gte("created_at", since);
      if (until) q = q.lte("created_at", until);
      if (search) q = q.or(`payload::text.ilike.%${search}%,actor_email.ilike.%${search}%,target_id.ilike.%${search}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return json({ rows: data || [], total: count ?? 0 });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
