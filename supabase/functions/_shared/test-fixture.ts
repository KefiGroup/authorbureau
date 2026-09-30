// Permanent synthetic test fixture for the daily audit.
//
// One dedicated test author + one dedicated test reader + one pseudo book with
// a real manuscript. Everything is flagged is_test = true so it never appears
// in the public directory, revenue reporting, or real author CRM counts.
//
// ensureTestFixture() is idempotent: safe to call on every audit run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Admin = ReturnType<typeof createClient>;

export const TEST_AUTHOR_EMAIL = "audit.author@authorsbureau.com";
export const TEST_READER_EMAIL = "audit.reader@authorsbureau.com";
export const TEST_AUTHOR_SLUG = "audit-sandbox";
export const TEST_BOOK_SLUG = "modern-thought-leader";
export const TEST_BOOK_TITLE = "The Modern Thought Leader";

export const TEST_MANUSCRIPT = `THE MODERN THOUGHT LEADER
Blueprint for Knowledge Entrepreneurs

By Avery Sandhu

INTRODUCTION — THE BOOK IS THE HOOK

Most experts publish a book and then wait. They wait for royalties, for invitations, for the phone to ring. It rarely does. A book is not a business. A book is the hook that opens the door to a business.

This book is written for the consultant, coach, clinician, operator or specialist who already knows something valuable and wants that knowledge to travel further than a single client engagement. It sets out a repeatable system, the LADDER method, for turning expertise into a durable knowledge business.

Reader profile: a mid-career professional, aged 35 to 60, with ten or more years of hard-won domain experience, an audience of under 5,000 people, and little or no product beyond their own billable hours.

Core promise: within twelve months, a reader who follows the LADDER method will have a defined signature framework, a free entry point that captures readers, at least one paid product priced under one hundred dollars, and at least one high-value service delivered by application.

CHAPTER 1 — LOCATE THE PROBLEM YOU OWN

Authority is not built on breadth. It is built on owning one specific, expensive, recurring problem. This chapter teaches the Problem Ownership Test: the problem must be painful enough that people already pay to solve it, frequent enough to recur, and narrow enough that you can be the obvious answer.

Exercises: the Pain Inventory, the Paid-Already Audit, and the One Sentence Claim. The chapter closes with the Problem Statement Canvas, a single page the reader completes before moving on.

CHAPTER 2 — ARTICULATE THE SIGNATURE FRAMEWORK

A framework turns opinion into method. Readers learn to convert their working intuition into a named model with between three and seven steps, each with a verb, an outcome, and a visible artifact the client receives.

The chapter covers naming conventions, the difference between a linear method and a cyclical one, and the sequencing rule: a framework must be teachable by a stranger from the diagram alone.

CHAPTER 3 — DOCUMENT THE PROOF

Expertise without evidence is a claim. This chapter covers the four proof types: outcome proof, process proof, peer proof and presence proof. Readers learn how to collect a usable case study in a fifteen minute interview, and how to write results honestly when exact numbers cannot be shared.

The chapter includes a consent-safe testimonial request template and a proof matrix for tracking which claim is backed by which evidence.

CHAPTER 4 — DESIGN THE ENTRY POINT

Nobody buys the expensive thing first. The entry point is a small, complete, genuinely useful asset that a stranger can consume in under ten minutes and that leaves them better off even if they never buy anything.

Readers learn the three entry point formats that convert best for expertise businesses: the diagnostic assessment, the decision checklist, and the annotated example. The chapter covers the two to three minute assessment rule, the five result tiers, and how to write result descriptions that feel personal without flattery.

CHAPTER 5 — DELIVER THE FIRST PAID PRODUCT

The first paid product exists to convert an audience member into a customer, not to maximise revenue. Price it low, keep the scope tight, and make the outcome unmistakable.

This chapter covers workbook design, the self-paced home study format, and the sequencing rule that a workbook precedes a home study course, which precedes a full online course. Readers learn to build a product from material they already have rather than starting from scratch.

CHAPTER 6 — ESCALATE TO HIGH VALUE WORK

Above a certain price point, selling stops being a checkout and becomes a conversation. This chapter covers the application model: publishing the outcome and the fit criteria while holding the price for the conversation.

Readers learn to design a consulting engagement, an intensive day, and a small group programme, and to write an application form that filters gently but firmly.

CHAPTER 7 — REPEAT THE ATTENTION ENGINE

Attention is a system, not an event. This chapter covers the weekly rhythm: one substantive piece, five short derivatives, one conversation with the audience, and one measured experiment.

Readers learn the content repurposing chain, the email cadence that respects a reader's inbox, and how to tell the difference between a channel that is failing and a channel that is simply young.

CHAPTER 8 — BUILD THE BUSINESS THAT OUTLIVES THE BOOK

The final chapter assembles everything into an operating model: what the reader sells, to whom, at what price, through which channel, and what they must personally do each week for the business to function.

It closes with the twelve month sequence, a quarterly review rhythm, and the single question the author returns to every ninety days: what is the smallest change that would double the value of what I already have?

APPENDIX — THE LADDER METHOD AT A GLANCE

L — Locate the problem you own
A — Articulate the signature framework
D — Document the proof
D — Design the entry point
E — Escalate to high value work
R — Repeat the attention engine

END OF MANUSCRIPT`;

export interface TestFixture {
  authorUserId: string;
  authorProfileId: string;
  bookId: string;
  readerEmail: string;
  created: string[];
}

async function ensureAuthUser(admin: Admin, email: string, fullName: string): Promise<string> {
  // Look for an existing user by email (paged listing is fine — small project).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await (admin as any).auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = data?.users || [];
    const hit = users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 200) break;
  }
  const { data, error } = await (admin as any).auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, is_test_account: true },
  });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  return data.user.id;
}

export async function ensureTestFixture(admin: Admin): Promise<TestFixture> {
  const created: string[] = [];

  // 1. Auth users
  const authorUserId = await ensureAuthUser(admin, TEST_AUTHOR_EMAIL, "Avery Sandhu");
  await ensureAuthUser(admin, TEST_READER_EMAIL, "Audit Reader");

  // 2. Author profile — unlisted + is_test so it stays out of the directory.
  let { data: profile } = await admin
    .from("author_profiles")
    .select("id")
    .eq("user_id", authorUserId)
    .limit(1)
    .maybeSingle();

  if (!profile) {
    const { data, error } = await admin
      .from("author_profiles")
      .insert({
        user_id: authorUserId,
        pen_name: "Avery Sandhu",
        author_slug: TEST_AUTHOR_SLUG,
        bio_short: "Automated audit sandbox author. Not a real author profile.",
        bio_long:
          "Avery Sandhu is the synthetic author profile used by the Authors Bureau daily system check. It exists so every module can be built and verified each day without touching a real author's account.",
        tagline: "Automated audit sandbox",
        directory_status: "unlisted",
        subscription_tier: "yield",
        genres: ["Business"],
        is_test: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(`author_profiles insert failed: ${error.message}`);
    profile = data;
    created.push("author_profile");
  } else {
    await admin.from("author_profiles")
      .update({ is_test: true, directory_status: "unlisted", subscription_tier: "yield" })
      .eq("id", profile.id);
  }
  const authorProfileId = profile!.id as string;

  // 3. Pseudo book — approved so every builder gate opens, is_test so it is
  //    excluded from the public directory and revenue reporting.
  let { data: book } = await admin
    .from("books")
    .select("id")
    .eq("author_id", authorProfileId)
    .eq("slug", TEST_BOOK_SLUG)
    .limit(1)
    .maybeSingle();

  if (!book) {
    const { data, error } = await admin
      .from("books")
      .insert({
        author_id: authorProfileId,
        owner_email: TEST_AUTHOR_EMAIL,
        title: TEST_BOOK_TITLE,
        subtitle: "Blueprint for Knowledge Entrepreneurs",
        slug: TEST_BOOK_SLUG,
        description:
          "A system for turning hard-won expertise into a durable knowledge business. The LADDER method takes a specialist from one owned problem to a named framework, a free entry point, a first paid product and high value work delivered by application.",
        genre: "Business",
        pages: 236,
        author_name: "Avery Sandhu",
        approval_status: "approved",
        published_at: new Date().toISOString(),
        entry_mode: "manuscript",
        is_test: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(`books insert failed: ${error.message}`);
    book = data;
    created.push("book");
  } else {
    await admin.from("books")
      .update({ is_test: true, approval_status: "approved" })
      .eq("id", book.id);
  }
  const bookId = book!.id as string;

  // 4. Manuscript source material (what every ABBY generator reads).
  const { data: ms } = await admin
    .from("generated_assets")
    .select("id, content")
    .eq("book_id", bookId)
    .eq("asset_type", "source_material")
    .limit(1)
    .maybeSingle();

  if (!ms) {
    const { error } = await admin.from("generated_assets").insert({
      book_id: bookId,
      author_id: authorProfileId,
      asset_type: "source_material",
      title: `${TEST_BOOK_TITLE} — manuscript`,
      content: TEST_MANUSCRIPT,
      status: "complete",
    });
    if (error) throw new Error(`manuscript insert failed: ${error.message}`);
    created.push("manuscript");
  } else if (!ms.content || String(ms.content).trim().length < 500) {
    await admin.from("generated_assets").update({ content: TEST_MANUSCRIPT }).eq("id", ms.id);
    created.push("manuscript_repaired");
  }

  return { authorUserId, authorProfileId, bookId, readerEmail: TEST_READER_EMAIL, created };
}
