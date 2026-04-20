import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tables that reference an author by author_id (UID == author_profiles.user_id)
const AUTHOR_ID_TABLES = [
  "abby_conversations", "abby_nudges", "ai_usage_logs", "audiobooks",
  "author_context", "author_email_settings", "author_nodes",
  "author_payout_settings", "author_payouts", "author_revenue_snapshots",
  "author_subscribers", "author_testimonials", "books", "coaching_packages",
  "contact_messages", "courses", "crm_activity_log", "crm_contact_tags",
  "crm_contacts", "cross_builder_pushes", "email_campaigns", "email_flows",
  "email_lists", "email_send_log", "email_templates", "feature_requests",
  "funnel_submissions", "funnels", "generated_assets", "generated_emails",
  "ghl_deployments", "home_study_courses", "lead_activities", "leads",
  "marketing_assets", "podcast_episodes", "podcasts", "purchases",
  "social_connections", "social_media_content", "social_posts",
  "speaking_topics", "special_editions", "testimonials", "training_programs",
  "webinar_registrations", "webinars", "workbooks",
];

// Tables that reference the user by user_id
const USER_ID_TABLES = [
  "consultation_sessions", "social_connections",
];

const ORPHANS = [
  { name: "Fasa Husain",   email: "fasahath@gmail.com",     oldUid: "ffbc179a-1643-4326-9f3d-a6b7543e178f" },
  { name: "Bob Battista",  email: "bob@bbattista.com",      oldUid: "734b3c3e-49e1-4643-bc18-5408f0cccd6a" },
  { name: "Felicia Tan",   email: "felicia@artoflife.sg",   oldUid: "00000000-0000-0000-0000-000000000001" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: any[] = [];

  for (const orphan of ORPHANS) {
    const log: any = { name: orphan.name, email: orphan.email, oldUid: orphan.oldUid, steps: [] };
    try {
      // 1. Create or fetch existing Cloud auth user
      let newUid: string | null = null;

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: orphan.email,
        email_confirm: true,
        user_metadata: { display_name: orphan.name },
      });

      if (createErr) {
        // If user already exists, look it up
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === orphan.email.toLowerCase());
        if (existing) {
          newUid = existing.id;
          log.steps.push({ createUser: "already_exists", newUid });
        } else {
          throw createErr;
        }
      } else {
        newUid = created.user!.id;
        log.steps.push({ createUser: "created", newUid });
      }

      if (!newUid) throw new Error("Failed to resolve newUid");
      if (newUid === orphan.oldUid) {
        log.steps.push({ skip: "newUid == oldUid, no cascade needed" });
        results.push(log);
        continue;
      }

      // 2. Cascade update author_profiles.user_id
      const { error: profErr, count: profCount } = await supabase
        .from("author_profiles")
        .update({ user_id: newUid }, { count: "exact" })
        .eq("user_id", orphan.oldUid);
      if (profErr) throw new Error(`author_profiles: ${profErr.message}`);
      log.steps.push({ table: "author_profiles", updated: profCount });

      // 3. Cascade author_id tables
      for (const table of AUTHOR_ID_TABLES) {
        const { error, count } = await supabase
          .from(table)
          .update({ author_id: newUid }, { count: "exact" })
          .eq("author_id", orphan.oldUid);
        if (error) {
          log.steps.push({ table, error: error.message });
        } else if ((count ?? 0) > 0) {
          log.steps.push({ table, updated: count });
        }
      }

      // 4. Cascade user_id tables
      for (const table of USER_ID_TABLES) {
        const { error, count } = await supabase
          .from(table)
          .update({ user_id: newUid }, { count: "exact" })
          .eq("user_id", orphan.oldUid);
        if (error) {
          log.steps.push({ table: `${table}.user_id`, error: error.message });
        } else if ((count ?? 0) > 0) {
          log.steps.push({ table: `${table}.user_id`, updated: count });
        }
      }

      log.success = true;
    } catch (e: any) {
      log.success = false;
      log.error = e.message ?? String(e);
    }
    results.push(log);
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
