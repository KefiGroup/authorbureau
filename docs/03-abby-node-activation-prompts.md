# 03 · ABBY Node Activation Prompts

_Version 1.0 · 2026-05-01_

For every node builder shipped to date, this document records the **exact prompt(s)** the corresponding edge function sends to the Lovable AI Gateway when the author activates that node.

The prompts are extracted verbatim from each `supabase/functions/generate-*/index.ts` file. When a node has multiple template literals (e.g. system + user), they are listed in source order.

---

## BP-00 · Initial Analysis

- **Edge function**: `supabase/functions/generate-bp00-analysis/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BP-01 · Email Marketing

- **Edge function**: `supabase/functions/generate-bp01-email-marketing/index.ts`
- **Model**: `google/gemini-2.5-flash`
- **Max tokens**: `4000`
- **Prompt blocks extracted**: 2

### `systemPrompt`

```text
You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.
```

### `userPrompt`

```text
Create a complete email marketing system for ${authorName}'s book '${bookTitle}'.

Book details:
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "N/A"}
- Target audience: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Commercial angles: ${commercialAngles}
${leadMagnetInfo}

Generate the following as a JSON object with these exact keys:
{
  "campaign_name": "A compelling name for this author's email marketing campaign (e.g., The [Book Theme] Insider Series)",
  "welcome_sequence": [
    {
      "email_number": 1,
      "subject": "Email subject line",
      "preview_text": "Preview text (40-90 chars)",
      "body": "Full email body (200-300 words, warm and personal, from the author)",
      "send_delay_days": 0
    }
  ],
  "lead_magnet_offer": {
    "title": "${leadMagnet ? "Use the author's existing lead magnet title exactly as provided above" : "Name of the free resource to offer as a lead magnet"}",
    "description": "${leadMagnet ? "Describe the existing lead magnet accurately based on the details above" : "One sentence describing what readers get"}",
    "cta_text": "Button text for the opt-in form"${leadMagnetUrl ? 
```

---

## BP-02 · Lead Magnet

- **Edge function**: `supabase/functions/generate-bp02-lead-magnets/index.ts`
- **Model**: `google/gemini-2.5-flash`
- **Max tokens**: `10000`
- **Prompt blocks extracted**: 2

### `systemPrompt`

```text
You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.

CRITICAL GENERATION CONSTRAINTS:
- All lead magnets must be designed as SIMPLE 2-3 MINUTE actions focused on ASSESSMENT and SELF-DIAGNOSIS only.
- Quizzes: 8-10 multiple-choice questions MAXIMUM. Self-scoring. Results gated behind contact form.
- Do NOT include "Next-step plans", action items, or exercises.
- Content must acknowledge that the reader is STUCK and provide exactly 3 specific product recommendations per scoring tier.
- FORBIDDEN PHRASES: "Next step", "pick 1", "action step", "your task", "try this", "exercise", "I will ___ for".
- All lead magnets must collect: First Name, Email, and Phone Number before delivering value.
```

### `userPrompt`

```text
Create a complete lead magnet system for ${authorName}'s book '${bookTitle}'.

Book details:
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "N/A"}
- Target audience: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Commercial angles: ${commercialAngles}
${businessPlanExcerpt ? 
```

---

## BP-03 · Social Media

- **Edge function**: `supabase/functions/generate-bp03-social-media/index.ts`
- **Model**: `openai/gpt-5.2`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BP-04 · Author Website

- **Edge function**: `supabase/functions/generate-bp04-website/index.ts`
- **Model**: `openai/gpt-5.2`
- **Max tokens**: `6000`
- **Prompt blocks extracted**: 2

### `systemPrompt`

```text
You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging.

CRITICAL ANTI-HALLUCINATION RULES:
1. You MUST write everything specifically for the EXACT book title, subtitle, and core thesis provided by the user. The book title appears verbatim in the user prompt — copy it exactly, never paraphrase or invent a new title.
2. NEVER substitute a different topic, niche, or domain — even if the title or thesis seems unusual or unfamiliar.
3. NEVER default to generic finance, business, self-help, leadership, or productivity content unless the user prompt explicitly says the book is about that topic.
4. The "site_name" must include the author's pen name exactly as provided. The "book_page.headline" and "book_page.book_description" MUST reference the exact book title verbatim at least once.
5. Derive the niche/genre ONLY from the "Genre/Niche" and "Core thesis" fields supplied. If both are missing, ask for them via "abby_summary" — do NOT fabricate.
6. Always respond with valid JSON only — no markdown, no code fences, no commentary outside the JSON object.
```

### `userPrompt`

```text
Create complete author website copy for ${authorName}'s book '${bookTitle}'.

Author details:
- Author name: ${authorName}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "N/A"}
- Target audience: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Genre/Niche: ${genre}

Generate the following as a JSON object with these exact keys:
{
  "site_name": "The website name (e.g., ${authorName} | Author & Expert)",
  "tagline": "A compelling one-line tagline for the author brand",
  "homepage": {
    "hero_headline": "Main headline for the homepage hero section",
    "hero_subheadline": "Supporting subheadline (1-2 sentences)",
    "hero_cta_primary": "Primary CTA button text",
    "hero_cta_secondary": "Secondary CTA button text",
    "about_teaser": "A 2-3 sentence teaser about the author",
    "book_teaser": "A 2-3 sentence teaser about the book",
    "social_proof_headline": "Headline for the testimonials section",
    "placeholder_testimonials": [
      { "quote": "A realistic placeholder testimonial (2-3 sentences)", "name": "Reader Name", "title": "Title or Role" },
      { "quote": "A second realistic placeholder testimonial", "name": "Reader Name 2", "title": "Title or Role 2" }
    ]
  },
  "about_page": {
    "headline": "Headline for the About page",
    "bio_short": "A short 2-3 sentence bio",
    "bio_long": "A full 4-6 paragraph author bio",
    "credentials": ["Credential 1", "Credential 2", "Credential 3"],
    "personal_note": "A short personal note from the author (2-3 sentences)"
  },
  "book_page": {
    "headline": "Headline for the book page",
    "book_description": "Full book description (3-4 paragraphs)",
    "what_youll_learn": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4", "Takeaway 5"],
    "who_its_for": "A 2-3 sentence description of who this book is for",
    "buy_cta": "CTA button text for buying",
    "bonus_offer": "A free bonus offer for book buyers"
  },
  "contact_page": {
    "headline": "Headline for the contact page",
    "intro_text": "1-2 sentence intro",
    "speaking_topics": ["Topic 1", "Topic 2", "Topic 3"],
    "media_note": "A short note for media/press inquiries"
  },
  "seo": {
    "meta_title": "SEO meta title (under 60 characters)",
    "meta_description": "SEO meta description (under 160 characters)",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  },
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created"
}

Make everything specific to this author's book, niche, and audience. Never use generic placeholder text except where explicitly marked as 'placeholder' (testimonials only).
```

---

## BP-05 · Webinars

- **Edge function**: `supabase/functions/generate-bp05-webinars/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 1

### `userPrompt`

```text
Create a complete webinar system for ${author.pen_name}'s book '${bookTitle}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${bookTitle}
- Book subtitle: ${ctxBundle.bookSubtitle || "N/A"}
- Core thesis: ${ctxBundle.coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona || {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks || [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights || [])}
- Niche: ${niche}

Generate the following as a JSON object with these exact keys:

{
  "webinar_topics": [
    {
      "number": 1,
      "title": "Compelling webinar title (specific, benefit-driven, creates curiosity)",
      "subtitle": "One-line subtitle that clarifies the promise",
      "duration_minutes": 60,
      "format": "Format type (e.g., Live Training, Q&A Session, Workshop, Masterclass)",
      "description": "2-3 sentences describing what attendees will learn and the transformation they will experience",
      "key_points": ["Key teaching point 1", "Key teaching point 2", "Key teaching point 3", "Key teaching point 4"],
      "ideal_for": "One sentence describing exactly who this webinar is for",
      "hook": "A compelling one-sentence hook to open the webinar (creates urgency or curiosity)"
    }
  ],
  "recommended_webinar": 1,
  "recommended_reason": "One sentence explaining why webinar #1 is the best starting point for this author",
  "registration_page": {
    "headline": "Main headline for the registration page (powerful, specific, benefit-driven)",
    "subheadline": "Supporting subheadline (1-2 sentences)",
    "bullet_points": ["What attendees will learn 1", "What attendees will learn 2", "What attendees will learn 3", "What attendees will learn 4"],
    "presenter_bio": "A 2-3 sentence bio positioning the author as the expert for this webinar",
    "cta_button_text": "Registration button text (e.g., Reserve My Spot)",
    "urgency_note": "A short urgency or scarcity note (e.g., Limited spots available)"
  },
  "follow_up_emails": [
    { "send_time": "Immediately after registration", "subject": "...", "preview_text": "...", "body_summary": "..." },
    { "send_time": "24 hours before the webinar", "subject": "...", "preview_text": "...", "body_summary": "..." },
    { "send_time": "1 hour before the webinar", "subject": "...", "preview_text": "...", "body_summary": "..." },
    { "send_time": "24 hours after the webinar", "subject": "...", "preview_text": "...", "body_summary": "..." }
  ],
  "promotion_strategy": {
    "launch_timeline": "Recommended number of days to promote before the webinar (e.g., 14 days)",
    "channels": ["Channel 1", "Channel 2", "Channel 3"],
    "promotional_posts": [
      { "day": "Day 1 (Announcement)", "platform": "LinkedIn", "caption": "..." },
      { "day": "Day 7 (Reminder)", "platform": "Instagram", "caption": "..." },
      { "day": "Day 13 (Last chance)", "platform": "Email", "caption": "..." }
    ]
  },
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created and why this webinar system will grow this author's audience and revenue"
}

The webinar_topics array must have exactly 3 items, each covering a different angle of the book's content.
Make everything specific to this author's book, niche, and audience. Never use generic placeholder text.
```

---

## BP-06 · Workbook

- **Edge function**: `supabase/functions/generate-bp06-online-course/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `12000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BP-07 · Home Study Course

- **Edge function**: `supabase/functions/generate-bp07-coaching/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `8192`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BP-08 · Special Editions

- **Edge function**: `supabase/functions/generate-bp08-mastermind/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `8000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BP-09 · Book Sales

- **Edge function**: `supabase/functions/generate-bp09-speaking/index.ts`
- **Model**: `openai/gpt-5.2`
- **Max tokens**: `12000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-10 · Online Course

- **Edge function**: `supabase/functions/generate-ba10-online-course/index.ts`
- **Model**: `google/gemini-2.5-flash`
- **Max tokens**: `6000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-11 · Audiobook

- **Edge function**: `supabase/functions/generate-ba11-audiobook/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-12 · Membership

- **Edge function**: `supabase/functions/generate-ba12-membership/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-13 · Group Coaching

- **Edge function**: `supabase/functions/generate-ba13-group-coaching/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-14 · Podcast Tour

- **Edge function**: `supabase/functions/generate-ba14-podcast/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-15 · Media & PR

- **Edge function**: `supabase/functions/generate-ba15-media-pr/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-16 · Affiliates

- **Edge function**: `supabase/functions/generate-ba16-affiliate/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-17 · Bundles

- **Edge function**: `supabase/functions/generate-ba17-upsells/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## BA-18 · JV Partnerships

- **Edge function**: `supabase/functions/generate-ba18-jv-partnerships/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-19 · 1-on-1 Coaching

- **Edge function**: `supabase/functions/generate-yr19-coaching/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-20 · Big Ticket Consulting

- **Edge function**: `supabase/functions/generate-yr20-big-ticket/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-21 · Speaking

- **Edge function**: `supabase/functions/generate-yr21-speaking/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-22 · Corporate Training

- **Edge function**: `supabase/functions/generate-yr22-corporate/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-23 · Mastermind

- **Edge function**: `supabase/functions/generate-yr23-mastermind/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-24 · Retreats

- **Edge function**: `supabase/functions/generate-yr24-retreats/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-25 · Certification

- **Edge function**: `supabase/functions/generate-yr25-certification/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-26 · Conference

- **Edge function**: `supabase/functions/generate-yr26-conference/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-27 · Fundraising

- **Edge function**: `supabase/functions/generate-yr27-fundraising/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

## YR-28 · Sponsors

- **Edge function**: `supabase/functions/generate-yr28-sponsors/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 0

_No template-literal prompts auto-detected. The function may build prompts inline; see source._

---

