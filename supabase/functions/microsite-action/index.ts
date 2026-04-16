import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[microsite-action] ▶ Function invoked");
    const body = await req.json();
    console.log("[microsite-action] Body received:", JSON.stringify({ author_id: body.author_id, node_id: body.node_id, action_type: body.action_type, email: body.email }));
    const { author_id, node_id, action_type, email, first_name, last_name, quiz_stage, quiz_score, quiz_answers, ...extra } = body;

    if (!author_id || !node_id || !action_type || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: author_id, node_id, action_type, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("author_profiles")
      .select("ghl_sub_account_id, pen_name, user_id")
      .eq("id", author_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Author not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authorUserId = profile.user_id;
    const ghlSubAccountId = profile.ghl_sub_account_id;
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY") || Deno.env.get("GHL_SUBACCOUNT_KEY") || "";

    // Tag map
    const tagMap: Record<string, string> = {
      "BP-02:optin": "lead-magnet-optin",
      "BP-05:optin": "webinar-registrant",
      "BP-06:purchase": "workbook-buyer",
      "BP-07:purchase": "home-study-buyer",
      "BP-08:purchase": "special-edition-buyer",
      "BP-09:purchase": "book-buyer",
      "BA-10:purchase": "online-course-student",
      "BA-12:purchase": "membership-member",
      "BA-13:application": "group-coaching-applicant",
      "BA-16:optin": "affiliate-signup",
      "YR-19:purchase": "coaching-client",
      "YR-20:application": "big-ticket-applicant",
      "YR-21:enquiry": "speaking-enquiry",
      "YR-22:enquiry": "corporate-training-enquiry",
      "YR-23:application": "mastermind-applicant",
      "YR-24:purchase": "retreat-attendee",
      "YR-25:purchase": "certification-student",
      "YR-26:purchase": "conference-attendee",
      "YR-27:purchase": "fundraising-donor",
      "YR-28:enquiry": "sponsorship-enquiry",
    };

    const tag = tagMap[`${node_id}:${action_type}`] || `${node_id.toLowerCase()}-${action_type}`;
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || email;
    const cleanEmail = email.toLowerCase().trim();

    // ─── GHL Contact ───
    console.log("[microsite-action] Tag resolved:", tag, "| GHL sub:", ghlSubAccountId);
    let ghlContactId: string | null = null;
    if (ghlSubAccountId && GHL_API_KEY) {
      try {
        const ghlRes = await fetch("https://services.leadconnectorhq.com/contacts/", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            locationId: ghlSubAccountId,
            email: cleanEmail,
            firstName: first_name || "",
            lastName: last_name || "",
            tags: [tag],
            source: `Authors Bureau - ${node_id}`,
            ...(extra.company ? { companyName: extra.company } : {}),
          }),
        });
        const ghlData = await ghlRes.json();
        ghlContactId = ghlData?.contact?.id || null;
      } catch (ghlErr) {
        console.error("GHL contact creation failed:", ghlErr);
      }
    }

    // ─── Author Subscribers (existing) ───
    console.log("[microsite-action] ▶ Upserting author_subscribers for", cleanEmail);
    try {
      await supabaseAdmin.from("author_subscribers").upsert(
        {
          author_id: authorUserId || author_id,
          email: cleanEmail,
          name: fullName !== email ? fullName : null,
          source: "microsite",
          source_detail: `${node_id}:${action_type}`,
          status: "active",
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "author_id,email", ignoreDuplicates: false }
      );
    } catch (subErr) {
      console.error("Subscriber upsert failed:", subErr);
    }

    // ─── LEVEL 1: Author-level CRM ───
    console.log("[microsite-action] ▶ LEVEL 1 CRM for author_id:", authorUserId);
    let authorContactId: string | null = null;
    const isQuizCapture = node_id === "BP-02" && quiz_stage;

    try {
      // Dedup by email
      const { data: existing } = await supabaseAdmin
        .from("crm_contacts")
        .select("id")
        .eq("author_id", authorUserId)
        .eq("email", cleanEmail)
        .maybeSingle();

      const quizFields = isQuizCapture ? {
        quiz_stage: quiz_stage,
        quiz_score: typeof quiz_score === "number" ? quiz_score : null,
        quiz_completed_at: new Date().toISOString(),
      } : {};

      if (existing) {
        authorContactId = existing.id;
        await supabaseAdmin.from("crm_contacts").update({
          ...(fullName !== email ? { full_name: fullName } : {}),
          ...quizFields,
        }).eq("id", authorContactId);
      } else {
        const { data: newContact } = await supabaseAdmin
          .from("crm_contacts")
          .insert({
            author_id: authorUserId,
            full_name: fullName,
            email: cleanEmail,
            source: `microsite-${node_id}`,
            notes: extra.message || extra.budget ? JSON.stringify(extra) : null,
            company: extra.company || null,
            abby_score: isQuizCapture ? 2 : 0,
            ...quizFields,
          })
          .select("id")
          .single();
        authorContactId = newContact?.id || null;
      }

      // Add tags (idempotent)
      if (authorContactId) {
        const tagsToAdd = [tag];
        if (isQuizCapture) {
          tagsToAdd.push("quiz-completed");
          if (quiz_stage) tagsToAdd.push(quiz_stage);
        }

        for (const t of tagsToAdd) {
          await supabaseAdmin.from("crm_contact_tags").insert({
            author_id: authorUserId,
            contact_id: authorContactId,
            tag: t,
          }).then(({ error }) => {
            if (error && !error.message.includes("duplicate")) console.error("Author tag error:", error);
          });
        }

        // Activity log
        const activityContent = isQuizCapture
          ? `Completed SUCKCESS Quiz — ${quiz_stage} (Score: ${quiz_score}%)`
          : `Lead captured from Author Page ${node_id} (${action_type}): ${cleanEmail}`;

        await supabaseAdmin.from("crm_activity_log").insert({
          author_id: authorUserId,
          contact_id: authorContactId,
          type: isQuizCapture ? "quiz_completed" : "note",
          content: activityContent,
        });
      }
    } catch (crmErr) {
      console.error("Author CRM capture failed:", crmErr);
    }

    // ─── Quiz Responses + Leads (BP-02 quiz only) ───
    if (isQuizCapture) {
      console.log("[microsite-action] ▶ Saving quiz responses and leads data");
      try {
        // Insert into leads table
        const { data: lead } = await supabaseAdmin.from("leads").insert({
          author_id: authorUserId,
          email: cleanEmail,
          name: fullName !== email ? fullName : null,
          source: "BP-02 Quiz Funnel",
          quiz_stage: quiz_stage,
          quiz_score: typeof quiz_score === "number" ? quiz_score : null,
          quiz_completed_at: new Date().toISOString(),
        }).select("id").single();

        // Insert quiz_responses
        if (lead?.id && Array.isArray(quiz_answers) && quiz_answers.length > 0) {
          const responseRows = quiz_answers.map((a: any) => ({
            lead_id: lead.id,
            question_number: a.question_number || 0,
            answer_selected: a.answer_selected || "",
            answer_text: a.answer_text || "",
          }));
          await supabaseAdmin.from("quiz_responses").insert(responseRows);
        }

        // Log nurture event
        if (authorContactId) {
          await supabaseAdmin.from("crm_activity_log").insert({
            author_id: authorUserId,
            contact_id: authorContactId,
            type: "opt_in",
            content: `Quiz nurture event: quiz_completed | Stage: ${quiz_stage} | Score: ${quiz_score}%`,
          });
        }
      } catch (quizErr) {
        console.error("Quiz data capture failed (non-fatal):", quizErr);
      }

      // ─── Reader Quiz Result Email (non-blocking) ───
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");

        if (resendKey) {
          console.log("[microsite-action] ▶ Sending quiz result email for stage:", quiz_stage);

          const penName = profile.pen_name || "the author";
          const readerName = first_name || "there";
          const stageName = (quiz_stage || "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
          const scoreVal = typeof quiz_score === "number" ? quiz_score : 0;

          // Get book Amazon URL for CTA
          const { data: bookData } = await supabaseAdmin
            .from("books")
            .select("title, amazon_url")
            .eq("author_id", profile.user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const bookTitle = bookData?.title || "Be SUCKcessful";
          const bookUrl = bookData?.amazon_url || "https://www.amazon.com/dp/B0DQKZWK33";

          // Stage-specific descriptions
          const stageDescriptions: Record<string, string> = {
            "Stuck": "You're in the early stages of your journey — feeling overwhelmed or unsure where to start. That's completely normal, and recognising it is the first powerful step forward.",
            "Unstuck": "You've started moving, but might still feel like you're figuring things out. The key now is building momentum and finding the right strategies to keep progressing.",
            "Climbing": "You're making real progress and building confidence. This is where the right frameworks and support can accelerate your growth dramatically.",
            "Kicking Goals": "You're achieving meaningful results and gaining clarity on your path. Now it's about optimising and scaling what's already working.",
            "Cruising": "You've hit your stride and things are flowing. The focus now shifts to sustaining your success and exploring new opportunities.",
            "Soaring": "You're at the top of your game — inspiring others and achieving at the highest level. Your story and experience are incredibly valuable.",
          };

          const stageMessage = stageDescriptions[stageName] ||
            `You're at the ${stageName} stage of your SUCKCESS journey. This is a meaningful milestone, and understanding where you are is the first step to moving forward with clarity.`;

          const emailHtml = `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
              <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                Hi ${readerName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                You just discovered you're at <strong>${stageName}</strong> — scoring <strong>${scoreVal}%</strong> on the SUCKCESS journey.
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                ${stageMessage}
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${bookUrl}" style="display: inline-block; background: #c8a45a; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Get Your Copy of ${bookTitle} →
                </a>
              </div>
              <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0 0 8px;">
                To your SUCKCESS,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0; font-weight: bold;">
                ${penName}
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
              <p style="color: #999; font-size: 12px;">
                This email was sent from ${penName}'s Author Page, powered by Authors Bureau.
              </p>
            </div>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: `${penName} via Authors Bureau <notify@notify.authorsbureau.com>`,
              to: [cleanEmail],
              subject: `Your SUCKCESS Stage: ${stageName} — Here's What It Means For You, ${readerName}`,
              html: emailHtml,
            }),
          });
          console.log("[microsite-action] ✅ Quiz result email sent to:", cleanEmail);
        }
      } catch (emailErr) {
        console.error("[microsite-action] Quiz result email error (non-fatal):", emailErr);
      }
    }

    // ─── LEVEL 2: Platform-level CRM (first admin) ───
    console.log("[microsite-action] ▶ LEVEL 2 Platform CRM");
    try {
      const { data: adminRole } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .single();

      const platformAdminId = adminRole?.user_id;

      if (platformAdminId && platformAdminId !== authorUserId) {
        const { data: existingPlatform } = await supabaseAdmin
          .from("crm_contacts")
          .select("id")
          .eq("author_id", platformAdminId)
          .eq("email", cleanEmail)
          .maybeSingle();

        let platformContactId: string | null = null;

        if (existingPlatform) {
          platformContactId = existingPlatform.id;
        } else {
          const { data: newPlatform } = await supabaseAdmin
            .from("crm_contacts")
            .insert({
              author_id: platformAdminId,
              full_name: fullName,
              email: cleanEmail,
              source: `microsite-${node_id}`,
              notes: `Via author: ${profile.pen_name || "Unknown"}`,
              company: extra.company || null,
            })
            .select("id")
            .single();
          platformContactId = newPlatform?.id || null;
        }

        if (platformContactId) {
          await supabaseAdmin.from("crm_contact_tags").insert({
            author_id: platformAdminId,
            contact_id: platformContactId,
            tag,
          }).then(({ error }) => {
            if (error && !error.message.includes("duplicate")) console.error("Platform tag error:", error);
          });

          // Tag with author name for filtering
          if (profile.pen_name) {
            await supabaseAdmin.from("crm_contact_tags").insert({
              author_id: platformAdminId,
              contact_id: platformContactId,
              tag: `author-${profile.pen_name.toLowerCase().replace(/\s+/g, "-")}`,
            }).then(({ error }) => {
              if (error && !error.message.includes("duplicate")) { /* ignore */ }
            });
          }

          await supabaseAdmin.from("crm_activity_log").insert({
            author_id: platformAdminId,
            contact_id: platformContactId,
            type: "note",
            content: `Platform lead from ${profile.pen_name || "author"}'s Author Page ${node_id} (${action_type})`,
          });
        }
      }
    } catch (platformErr) {
      console.error("Platform CRM capture failed:", platformErr);
    }

    // ─── Resend Email Notification to Author ───
    console.log("[microsite-action] ▶ Sending Resend email to author");
    try {
      const { data: { user: authorUser } } = await supabaseAdmin.auth.admin.getUserById(authorUserId);

      if (authorUser?.email) {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          const actionLabel = action_type === "optin" ? "New lead"
            : action_type === "purchase" ? "New purchase"
            : action_type === "enquiry" ? "New enquiry"
            : "New application";

          const quizInfo = isQuizCapture
            ? `<p style="color: #333; margin: 8px 0 0;"><strong>Quiz Stage:</strong> ${quiz_stage}</p><p style="color: #333; margin: 8px 0 0;"><strong>Quiz Score:</strong> ${quiz_score}%</p>`
            : "";

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "Authors Bureau <notify@notify.authorsbureau.com>",
              to: [authorUser.email],
              subject: `${actionLabel} from ${fullName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a1a1a;">${actionLabel} via your Author Page</h2>
                  <p style="color: #555;"><strong>${fullName}</strong> (${cleanEmail}) submitted via <strong>${node_id}</strong>.</p>
                  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="color: #333; margin: 0;"><strong>Action:</strong> ${action_type}</p>
                    <p style="color: #333; margin: 8px 0 0;"><strong>Tag:</strong> ${tag}</p>
                    ${quizInfo}
                    ${extra.message ? `<p style="color: #333; margin: 8px 0 0;"><strong>Message:</strong> ${String(extra.message).slice(0, 300)}</p>` : ""}
                  </div>
                  <a href="https://authorbureau.lovable.app/dashboard?section=crm"
                     style="display: inline-block; background: #c8a45a; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">
                    View in CRM
                  </a>
                </div>
              `,
            }),
          });
          console.log("Resend email sent to author:", authorUser.email);
        }
      }
    } catch (emailErr) {
      console.error("Email notification error (non-fatal):", emailErr);
    }

    // ─── In-app notification ───
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: authorUserId,
        title: `New ${action_type} from ${node_id}`,
        message: `${fullName} (${cleanEmail}) via your Author Page`,
        link: "/dashboard?section=crm",
      });
    } catch (notifErr) {
      console.error("Notification insert failed:", notifErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ghl_contact_id: ghlContactId,
        tag,
        message: action_type === "optin"
          ? "You're in! Check your email for next steps."
          : action_type === "enquiry"
            ? "Your enquiry has been received. We'll be in touch!"
            : action_type === "application"
              ? "Application submitted! We'll review and get back to you soon."
              : "Thank you for your purchase!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("microsite-action error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
