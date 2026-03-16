/**
 * Product-specific content for the "Behind the Design" panel.
 * Each product has 5 tabs: methodology, market, pricing, marketing, connected.
 */

export interface BehindTheDesignData {
  methodology: string;
  market: string;
  pricing: string;
  marketing: string;
  connected: string;
}

const CONTENT: Record<string, BehindTheDesignData> = {
  // ── BUILD ──────────────────────────────────────────────
  "workbook": {
    methodology: "Workbooks use **experiential learning theory** — readers learn best by doing, not just reading. Abby structures exercises using Kolb's cycle: concrete experience → reflective observation → abstract conceptualization → active experimentation. Each chapter maps to 3–5 hands-on activities that deepen comprehension.",
    market: "The self-help workbook market grows 8% annually. Readers who purchase workbooks spend **2.3x more time** engaging with the material vs. passive readers. Completion rates jump from 12% (books alone) to 47% (book + workbook).",
    pricing: "Workbooks are priced at **$17–$37** for print, $9.99–$19.99 digital. This positions them as an impulse-buy companion to your book. The low price point maximizes volume while the print version commands higher margins.",
    marketing: "Workbooks are your **top-of-funnel product**. They convert book readers into active learners and email subscribers. Bundle with the book for a \"Complete Transformation Kit\" at a 15–20% discount to increase average order value.",
    connected: "Your workbook exercises feed directly into the **Home Study Course** daily activities. Completed workbook pages become portfolio pieces for **Certification** programs. The workbook CTA drives readers to your **Online Course** for deeper learning.",
  },
  "home-study": {
    methodology: "Home Study programs use **spaced repetition** and **habit stacking** — the two most evidence-backed methods for behavior change. The 21-day format maps to habit formation research (Lally et al., 2010). Daily micro-actions (15–20 min) prevent overwhelm while building momentum.",
    market: "Self-paced accountability programs have a **73% higher completion rate** than traditional online courses. The daily email format achieves 45% open rates vs. 21% for weekly newsletters. This format is ideal for non-fiction authors in health, business, and personal development.",
    pricing: "Priced at **$27–$67** as a standalone, or $47–$97 bundled with the book. This sits in the \"easy yes\" price range — high enough to signal value, low enough to avoid purchase hesitation. Each daily email builds perceived value.",
    marketing: "Home Study is your **list-building engine**. Every daily email is a touchpoint that builds trust and positions your next offer. Day 14 introduces your Online Course. Day 21 presents your Coaching package. The drip format creates natural upsell moments.",
    connected: "Daily lessons pull exercises from your **Workbook**. Graduates receive a discount code for your **Online Course**. The email sequence feeds into your **Email Marketing** flows. Completion badges qualify participants for your **Certification** program.",
  },
  "book-sales": {
    methodology: "Abby optimizes your book sales page using the **AIDA framework** (Attention → Interest → Desire → Action). The page structure mirrors top-performing Amazon listings while adding direct-purchase capability to maximize your margin.",
    market: "Authors who sell direct earn **70–85% royalty** vs. 35% on Amazon. A well-optimized sales page converts at 2.5–4% from targeted traffic. The key is social proof: reviews, testimonials, and bestseller badges build trust.",
    pricing: "Your book price is set to match or slightly exceed Amazon to maintain channel harmony. The real margin comes from **bundles** — book + workbook + bonus chapter at 1.5x the book price captures 60% more revenue per transaction.",
    marketing: "Your book sales page is the **anchor** of your entire funnel. Every product you build drives traffic back here. Use the book as a loss-leader in ads ($5–10 CPA) to build your buyer list, then monetize through the product suite.",
    connected: "Book purchasers are automatically tagged for your **Email Marketing** welcome sequence. The order confirmation offers an upsell to your **Workbook** or **Home Study Course**. Review requesters feed into your **Social Media** content calendar.",
  },
  "special-editions": {
    methodology: "Special Editions use **occasion-based marketing** — tapping into gift-buying psychology and seasonal demand spikes. Each edition is themed with exclusive bonus content (forewords, reflection prompts, exclusive chapters) that justifies a premium price.",
    market: "Gift book purchases account for **65% of non-fiction sales** during Q4. Themed editions (graduation, holiday, anniversary) create urgency and collectibility. Limited print runs of 250–500 copies command 2–3x standard pricing.",
    pricing: "Special Editions are priced at **$35–$75** for standard, $75–$150 for collector's editions. The premium is justified by exclusive content, upgraded materials (hardcover, foil stamping), and limited availability. Gift buyers are less price-sensitive.",
    marketing: "Launch each edition **6–8 weeks** before the occasion. Use countdown timers and \"Only X remaining\" messaging. Gift-buyer copy reframes your book as a thoughtful present, expanding your audience beyond traditional readers.",
    connected: "Special Edition buyers enter a **VIP email segment** for early access to future products. Include a QR code linking to your **Online Course** trial. Graduation editions naturally connect to **Certification** and **Training Programs**.",
  },
  "social-media": {
    methodology: "Abby's social strategy uses the **Content Pillar Method** — 4–5 recurring themes derived from your book's chapters. Each pillar generates 10+ posts, ensuring consistent messaging without creative burnout. The mix follows the 80/20 rule: 80% value, 20% promotion.",
    market: "Non-fiction authors who post **3–5x/week** see 340% more profile visits than those posting weekly. LinkedIn and Instagram drive the highest book-related engagement. Video content (reels, shorts) generates 2x the reach of static posts.",
    pricing: "Social media content is a **free marketing channel** with compounding returns. Each post is a micro-advertisement for your products. The content calendar Abby creates would cost $2,000–5,000/month from a social media agency.",
    marketing: "Every post includes a soft CTA to one of your products. Monday = book excerpt → book sales. Wednesday = tip from workbook → workbook sales. Friday = student success story → course enrollment. Sunday = reflection prompt → home study.",
    connected: "Social posts promote all products in rotation. Your **Book Sales** page is the primary link-in-bio destination. **Webinar** announcements drive registrations. Student testimonials from **Online Course** and **Coaching** become social proof content.",
  },
  "email-marketing": {
    methodology: "Abby builds email sequences using the **Trust Ladder** framework: Welcome → Educate → Inspire → Offer → Nurture. Each sequence is designed to move subscribers through your product suite at their own pace, with behavioral triggers for optimal timing.",
    market: "Email marketing delivers **$42 ROI per $1 spent** — the highest of any marketing channel. Non-fiction author lists convert at 3–8% on product launches. A list of 1,000 engaged subscribers can generate $5,000–15,000 per product launch.",
    pricing: "Email infrastructure costs **$0–50/month** for lists under 5,000. The sequences Abby creates are evergreen — they work 24/7 without additional effort. Each automated sequence replaces $500–1,500/month in manual marketing labor.",
    marketing: "Your email list is your **most valuable business asset**. It's the only channel you own entirely. Every product launch starts here. Segment by purchase history to send targeted offers: book buyers get workbook offers, course students get coaching offers.",
    connected: "Email sequences promote every product in your suite. **Home Study** daily emails build your list. **Lead Magnets** capture new subscribers. **Webinar** follow-ups convert attendees. **Upsell** sequences maximize customer lifetime value.",
  },
  "website": {
    methodology: "Abby designs your author website using **conversion-centered design** principles: one primary CTA per page, F-pattern layout for scanning, social proof above the fold, and mobile-first responsive design. Every element serves either credibility or conversion.",
    market: "Authors with professional websites earn **3.2x more** from their book business than those without. 78% of potential clients/event organizers check an author's website before booking. A website is your digital business card and product storefront.",
    pricing: "A custom author website typically costs **$3,000–10,000** from a web agency. Abby generates the same structure and copy for a fraction of the cost. The website pays for itself with a single coaching client or course sale.",
    marketing: "Your website is your **central hub** — all roads lead here. Social media bios, email signatures, podcast interviews, and speaking engagements all point to your site. The site then funnels visitors to your highest-value products.",
    connected: "Your website showcases all products: **Book Sales** page, **Course** enrollment, **Coaching** booking, **Speaking** inquiries. The blog feeds your **Social Media** content. The newsletter signup grows your **Email Marketing** list.",
  },
  "online-course": {
    methodology: "Abby structures courses using **Bloom's Taxonomy** — progressing from knowledge recall through application to creation. Each module builds on the previous one, with quizzes for retention and projects for application. The curriculum maps directly to your book's chapters.",
    market: "The online course market reaches **$185B by 2026**. Non-fiction authors have a unique advantage: existing credibility and content. Author-led courses convert at 4–8% from email lists, vs. 1–2% for unknown instructors.",
    pricing: "Courses are priced in three tiers: **$47** (mini-course), **$147** (standard), **$297** (premium). Abby recommends starting at $97–$147 to establish value, then creating a premium tier with added coaching or certification.",
    marketing: "Your course is your **primary digital product**. It's the logical next step after the book: \"You've read the theory, now apply it.\" Launch with a **Webinar** to demonstrate value, then use **Email Marketing** for evergreen enrollment.",
    connected: "The course curriculum extends your **Workbook** exercises into video lessons. **Home Study** graduates receive a course discount. Course completers are invited to **Group Coaching**. Top students become **Certification** candidates.",
  },

  // ── BRIDGE ─────────────────────────────────────────────
  "audiobook": {
    methodology: "Abby's audiobook scripts are optimized for **auditory learning** — shorter sentences, more pauses, and added context that visual readers would see on the page. Chapter transitions include summaries to maintain comprehension without visual cues.",
    market: "Audiobook revenue grew **25% year-over-year**, outpacing all other book formats. 45% of audiobook listeners say they consume more books in audio format. The average listener completes 15 audiobooks per year.",
    pricing: "Audiobooks are priced at **$14.99–$24.99** on retail platforms. Direct sales at $19.99 yield 85% margin vs. 25% through distributors. Bundling audiobook + ebook at $29.99 increases perceived value by 40%.",
    marketing: "Audiobooks reach an **entirely new audience** — commuters, gym-goers, and multitaskers who don't read print. Promote through podcast ad swaps and audio-first platforms. Include a CTA at the end directing listeners to your website.",
    connected: "Audiobook listeners are tagged for **Podcast** cross-promotion. The audio format feeds content for **Social Media** audio clips. Listeners receive email invitations to your **Webinar** and **Online Course**.",
  },
  "podcast-scripts": {
    methodology: "Abby structures podcast episodes using the **Hook-Story-Offer** framework: open with a compelling question, deliver value through narrative, close with a clear next step. Each episode maps to a book chapter, creating a natural content calendar.",
    market: "There are **500M+ podcast listeners** globally. Interview-format podcasts featuring authors drive a 30% increase in book sales within 48 hours of airing. A 10-episode podcast tour reaches 50,000–200,000 potential readers.",
    pricing: "Podcast content is **free to produce** (your time) and free to distribute. The ROI comes from audience building and product promotion. Each episode is a 30–60 minute infomercial for your expertise and products.",
    marketing: "Podcast appearances are **borrowed audience** marketing — you tap into established listener bases. Repurpose audio into **Social Media** clips, blog posts, and email content. Each appearance builds backlinks to your website.",
    connected: "Podcast scripts promote your **Book Sales** page and **Lead Magnets**. Guest questions prepare you for **Media Outreach** interviews. Episode topics become **Webinar** content. Listener feedback shapes **Online Course** curriculum.",
  },
  "webinar": {
    methodology: "Abby uses the **Teach-Transition-Transform** webinar framework: teach one powerful concept (30 min), transition to how your product solves the bigger problem (10 min), present the transformation offer (15 min). This achieves 15–25% conversion rates.",
    market: "Webinars convert at **5–15%** for products under $500, making them the highest-converting sales tool for authors. Average attendance is 40–55% of registrants. Replay viewers convert at 5–8%, extending the sales window by 48 hours.",
    pricing: "Free webinars convert to products priced **$97–$997**. Paid webinars ($27–$47) attract higher-quality attendees with 25–40% conversion rates. The webinar itself generates $0 revenue but drives $5,000–50,000 in product sales per session.",
    marketing: "Webinars are your **highest-leverage sales event**. One 60-minute session can generate more revenue than months of social media posting. Run monthly for consistent income. Use **Email Marketing** and **Social Media** to fill seats.",
    connected: "Webinars sell your **Online Course**, **Coaching**, and **Training Programs**. Registration builds your **Email Marketing** list. Webinar content is repurposed for **Social Media** and **Lead Magnets**. Non-buyers enter a **Upsell** sequence.",
  },
  "lead-magnet": {
    methodology: "Abby designs lead magnets using the **Quick Win** principle: deliver one specific, actionable result in under 10 minutes. The format (checklist, template, mini-guide) is chosen based on your audience's preferred consumption style and the problem's urgency.",
    market: "Lead magnets convert website visitors at **20–40%** vs. 2% for generic newsletter signups. The most effective formats: checklists (38%), templates (29%), quizzes (25%). Specificity beats comprehensiveness — \"5-Minute Morning Routine\" outperforms \"Complete Wellness Guide\".",
    pricing: "Lead magnets are **free** — they're the entry point to your funnel. The real value: each subscriber is worth $1–3/month in future product sales. A lead magnet generating 100 subscribers/month creates $1,200–3,600 in annual recurring revenue.",
    marketing: "Place lead magnets on every **touchpoint**: website popup, social media bio, podcast mentions, book back matter. Each lead magnet targets a specific pain point that your paid products solve, creating a natural upgrade path.",
    connected: "Lead magnet subscribers enter your **Email Marketing** welcome sequence. The content previews your **Workbook** exercises. Quiz results segment subscribers for targeted **Online Course** or **Coaching** offers. Downloads feed **Home Study** enrollment.",
  },
  "media-outreach": {
    methodology: "Abby crafts media pitches using the **Newsjacking + Expertise** model: tie your book's insights to current events and trending topics. Each pitch includes a unique angle, 3 talking points, and a ready-to-use bio. The goal is to position you as the go-to expert in your niche.",
    market: "A single major media appearance can sell **500–2,000 books** in 24 hours. Authors featured in top-tier media command 3–5x higher speaking fees. PR coverage creates permanent backlinks that boost your website's SEO for years.",
    pricing: "DIY media outreach costs **$0** (your time). PR agencies charge $3,000–10,000/month. Abby's pitch templates deliver agency-quality angles at no cost. One successful placement can generate $5,000–50,000 in product sales.",
    marketing: "Media appearances are **credibility accelerators**. \"As featured in...\" badges on your website increase conversion by 25%. Repurpose interviews into **Social Media** content, **Email Marketing** campaigns, and **Website** testimonials.",
    connected: "Media coverage drives traffic to your **Book Sales** page and **Website**. Interview talking points become **Webinar** and **Keynote** content. PR mentions boost **Affiliate** partner confidence. Media clips enhance your **Speaking** kit.",
  },
  "affiliates": {
    methodology: "Abby structures affiliate programs using the **Partnership Pyramid**: Tier 1 (micro-influencers, 1,000–10,000 followers, high engagement), Tier 2 (mid-tier, 10,000–100,000, moderate engagement), Tier 3 (macro, 100,000+, brand awareness). Each tier gets different commission rates and support.",
    market: "Affiliate marketing drives **16% of all online sales**. Book and course affiliates typically earn 20–40% commission. A network of 20 active affiliates can generate $2,000–10,000/month in passive sales without advertising spend.",
    pricing: "Commission rates: **20–30%** for digital products, 10–15% for physical products. Higher commissions attract better affiliates. Offer tiered bonuses: 5 sales = bonus content, 20 sales = free coaching session, 50 sales = VIP partner status.",
    marketing: "Affiliates are your **unpaid sales force**. Provide them with ready-made content: email swipes, social posts, banner images, and comparison pages. The best affiliates are your own students and clients who've experienced your transformation.",
    connected: "Affiliates promote your **Online Course**, **Coaching**, and **Book Sales**. **Email Marketing** sequences nurture affiliate relationships. **Webinar** replays become affiliate promotional tools. Top affiliates are invited to **Revenue Sharing** partnerships.",
  },
  "upsell": {
    methodology: "Abby designs upsell funnels using the **Ascension Model**: each purchase triggers an offer for the next logical product. The timing is critical — upsells presented within 30 minutes of purchase convert at 15–25% vs. 3% after 24 hours.",
    market: "Post-purchase upsells increase average order value by **30–50%**. The most effective upsell offers are 40–60% of the original purchase price. One-click upsells (no re-entering payment info) convert 3x higher than standard checkout flows.",
    pricing: "Upsell products are priced at **40–60%** of the triggering product. Book ($17) → Workbook upsell ($9.99). Course ($147) → Coaching upsell ($67/month). The perceived value must be 3x the price to maintain conversion rates.",
    marketing: "Upsells are **automated revenue**. Set them once, earn forever. Every product purchase should trigger exactly one upsell offer. Use urgency (\"This offer expires in 15 minutes\") and exclusivity (\"Only available to new buyers\").",
    connected: "Upsell funnels connect every product: **Book** → **Workbook** → **Home Study** → **Online Course** → **Coaching**. **Email Marketing** handles delayed upsells. **Webinar** attendees who don't buy get a downsell to a **Lead Magnet**.",
  },
  "revenue-share": {
    methodology: "Revenue sharing agreements use the **Strategic Alliance** framework: identify partners with complementary audiences, structure win-win deals (typically 50/50 or 60/40 splits), and create joint products or co-marketed offerings that neither party could produce alone.",
    market: "Joint ventures between complementary authors generate **2–5x more revenue** than solo launches. The key is audience overlap of 30–50% — enough commonality for relevance, enough difference for fresh reach.",
    pricing: "Revenue splits typically follow: **50/50** for equal contribution, **60/40** favoring the product creator, or **70/30** favoring the audience owner. Structure deals with minimum guarantees to ensure both parties are motivated.",
    marketing: "Revenue sharing **doubles your reach** instantly. Cross-promote to each other's email lists, social followings, and speaking audiences. Joint webinars combining two experts convert at 2x the rate of solo presentations.",
    connected: "Revenue share partners co-create **Webinars**, **Online Courses**, and **Training Programs**. Joint promotions feed both partners' **Email Marketing** lists. Shared **Affiliate** networks amplify distribution.",
  },

  // ── YIELD ──────────────────────────────────────────────
  "coaching": {
    methodology: "Abby structures coaching packages using the **Transformation Timeline**: identify the client's current state, desired state, and the 3–5 milestones between them. Each session addresses one milestone with accountability check-ins. This creates measurable progress and justifies premium pricing.",
    market: "The coaching industry is worth **$20B globally** and growing 15% annually. Non-fiction authors who offer coaching earn 3–5x their book royalties. The key differentiator: your book is your methodology, giving clients confidence in your approach.",
    pricing: "1:1 coaching: **$150–$500/session** or $997–$5,000 for packages. Authors with bestseller status command 2x premium. Package pricing (vs. per-session) increases commitment by 60% and reduces cancellations.",
    marketing: "Coaching is sold through **demonstration of expertise**: free webinars, book content, and social proof. Your book readers are pre-sold on your methodology — they just need a personal application. Convert through **Webinars** and **Email Marketing**.",
    connected: "Coaching clients are your highest-value customers. Upsell to **Masterminds** and **Retreats**. Their testimonials power **Social Media** and **Website** content. Their results become **Certification** case studies. Coaching insights improve your **Online Course**.",
  },
  "group-coaching": {
    methodology: "Group coaching uses **peer learning dynamics**: participants learn as much from each other as from you. Abby structures cohorts of 8–15 people for optimal interaction. The curriculum combines your book content with group exercises, hot seats, and accountability partnerships.",
    market: "Group coaching delivers **80% of 1:1 results** at 30% of the price, making it accessible to more clients. Cohort-based programs have 85% completion rates vs. 15% for self-paced courses. The community aspect creates lasting professional networks.",
    pricing: "Group coaching: **$297–$1,497** per participant per cohort. With 10 participants, that's $2,970–$14,970 per cohort — more revenue than 1:1 with less time invested. Run 4 cohorts/year for a scalable high-ticket income stream.",
    marketing: "Position group coaching as the **\"best of both worlds\"** — personal attention at a fraction of 1:1 pricing. Launch through **Webinars** showcasing the community aspect. Use FOMO: \"Only 12 spots per cohort.\"",
    connected: "Group coaching graduates feed into **1:1 Coaching** (VIP upgrade) and **Masterminds** (ongoing community). The group format is a mini version of your **Training Programs**. Participant results become **Certification** credentials.",
  },
  "membership": {
    methodology: "Abby designs memberships using the **Recurring Value Loop**: monthly fresh content (aligned with your book chapters), community engagement, and member-only perks. The key to retention is making cancellation feel like losing access to an essential resource.",
    market: "Membership sites have **$150B+ annual revenue** globally. Average retention is 7–14 months. A membership with 100 members at $27/month generates $32,400/year in predictable, recurring revenue. The compound effect of new members + retention = exponential growth.",
    pricing: "Memberships: **$9.99–$47/month** or $97–$397/year (annual discount). The sweet spot for authors is $27/month — low enough for impulse signup, high enough for meaningful recurring revenue. Annual plans reduce churn by 45%.",
    marketing: "Memberships convert best from **existing customers** — book buyers, course students, webinar attendees. The value proposition: ongoing access to you and your community. Use free trials (7–14 days) to reduce signup friction.",
    connected: "Membership content extends your **Online Course** with monthly updates. Members get discounts on **Coaching** and **Events**. The community hosts discussions about your **Workbook** exercises. Member Q&As become **Podcast** content.",
  },
  "consulting": {
    methodology: "Abby structures consulting engagements using the **Diagnostic → Prescription → Implementation** model. Your book provides the diagnostic framework. The consulting applies it to the client's specific situation. Deliverables include strategic plans, implementation roadmaps, and ROI projections.",
    market: "Author-consultants command **$250–$1,000/hour** — 5–10x typical coaching rates. The difference: consulting delivers organizational outcomes, not personal development. Corporate clients have budgets 10–50x what individuals spend on coaching.",
    pricing: "Consulting: **$2,500–$15,000** per engagement (half-day to multi-day). Retainer models: $3,000–$10,000/month. Always price by value, not time. A $10,000 engagement that saves a company $100,000 is a 10x ROI.",
    marketing: "Consulting is sold through **credibility and case studies**. Your book establishes methodology. Speaking engagements demonstrate expertise. Client results prove ROI. The sales cycle is 30–90 days with decision-makers.",
    connected: "Consulting clients purchase **Training Programs** for their teams. Consulting frameworks become **Online Course** content. Client testimonials power **Keynote** speaker proposals. Consulting relationships lead to **Licensing** agreements.",
  },
  "keynotes": {
    methodology: "Abby crafts keynotes using the **One Big Idea** framework: every great talk has a single transformative concept, supported by 3 stories, 2 data points, and 1 audience interaction. The talk must deliver value AND create demand for your products without being a sales pitch.",
    market: "Professional keynote speakers earn **$5,000–$25,000** per engagement. Authors with bestselling books command 2–3x premium. Corporate event budgets allocate $50,000–200,000 for speakers. The speaking circuit has 10,000+ events annually in the US alone.",
    pricing: "Keynotes: **$5,000–$15,000** for emerging speakers, $15,000–$50,000 for established. Virtual keynotes: $2,500–$7,500. Always include book bundles in your speaker fee — bulk book sales of 200–500 copies boost your Amazon rankings.",
    marketing: "Keynotes are **sold through speaker bureaus, your website's speaking page, and direct outreach** to event organizers. Your book is your speaker demo reel. Include a sizzle reel, testimonials, and 3 talk titles on your speaking page.",
    connected: "Keynote audiences purchase **Books** (back-of-room sales), **Online Courses**, and **Coaching**. Speaking establishes credibility for **Training Programs**. Keynote content becomes **Webinar** material. Event organizers become **Consulting** clients.",
  },
  "training-programs": {
    methodology: "Training programs use **Bloom's Taxonomy + Kolb's Experiential Learning Cycle**: participants move through Remember → Understand → Apply → Analyze → Evaluate → Create, with concrete experiences, reflective observation, abstract conceptualization, and active experimentation at each level.",
    market: "Corporate training is a **$370B industry**. Companies spend $1,300 per employee on training annually. Author-led programs command premium pricing because the methodology is published, peer-reviewed, and proven. Facilitator-led workshops achieve 75% knowledge retention vs. 5% for lectures.",
    pricing: "Training programs: **$497–$2,997** per participant. Corporate licenses: $5,000–$25,000 per session (up to 30 participants). The price reflects the facilitated, interactive nature — this isn't a passive video course. Workbook materials add $500–1,500 to the program fee.",
    marketing: "Sell training programs to **HR directors, L&D managers, and conference organizers**. Your book is the proof of concept. Offer a free 90-minute preview workshop to demonstrate the methodology. Use **LinkedIn** and **Consulting** relationships for lead generation.",
    connected: "Training program workbooks are created from your **Workbook** builder. Participants continue learning through your **Online Course**. Top participants become **Certification** candidates. Training contracts lead to **Consulting** retainers.",
  },
  "masterminds": {
    methodology: "Abby designs masterminds using the **Curated Cohort** model: 6–12 carefully selected members who meet regularly for strategic thinking, accountability, and peer mentorship. The structure includes hot seats, guest experts, and quarterly goal-setting aligned with your book's framework.",
    market: "Mastermind groups generate **$50,000–$500,000/year** for facilitators. Members report 3–5x ROI through business growth, networking, and accountability. The exclusivity and peer quality are the primary value propositions — not just your content.",
    pricing: "Masterminds: **$5,000–$25,000/year** per member. With 10 members at $10,000, that's $100,000/year for 2–4 hours/month of your time. The pricing filter ensures committed, high-quality participants who elevate the group dynamic.",
    marketing: "Masterminds are **invitation-only or application-based**. Market to your best coaching clients, course graduates, and high-engagement email subscribers. Scarcity is real, not manufactured — you genuinely limit the group size.",
    connected: "Mastermind members are your **most loyal customers**. They purchase **Retreats**, attend **Conventions**, and become **Certification** facilitators. Their success stories power your **Marketing**. Many become **Affiliate** partners.",
  },
  "retreats": {
    methodology: "Retreats use **immersive learning** — removing participants from their daily environment accelerates transformation. Abby structures 2–4 day experiences combining your book content with experiential activities, group dynamics, and individual reflection time.",
    market: "Wellness and professional retreats are a **$639B global market**. Author-led retreats in unique locations command premium pricing. Average satisfaction scores exceed 90% due to the immersive, distraction-free environment. Repeat attendance rates: 35–45%.",
    pricing: "Retreats: **$2,000–$10,000** per participant (excluding travel). With 15–25 attendees, revenue ranges from $30,000–$250,000 per event. Price includes accommodation, meals, materials, and your facilitation. Premium retreats include 1:1 sessions.",
    marketing: "Market retreats to your **highest-engagement audience**: mastermind members, coaching clients, and course graduates. Use FOMO (limited spots), social proof (past attendee testimonials), and aspirational imagery of the venue and experience.",
    connected: "Retreats deepen relationships with **Coaching** and **Mastermind** clients. Retreat content becomes **Online Course** bonus modules. Attendee testimonials power **Website** and **Social Media**. Retreat networking spawns **Revenue Sharing** partnerships.",
  },
  "certification": {
    methodology: "Certification programs use **competency-based assessment**: participants demonstrate mastery through practical application, not just written tests. The program validates facilitators to teach your methodology, creating a network of authorized practitioners who expand your reach.",
    market: "Certification programs generate **$100,000–$1M+/year** for established authors. Certified facilitators become your distribution network — each one introduces your methodology to new audiences. The certification credential adds $10,000–50,000 to participants' earning potential.",
    pricing: "Certification: **$2,997–$9,997** per participant. Include training materials, assessment, ongoing support, and licensing rights. Annual renewal fees ($497–$997) create recurring revenue. Limit cohorts to 15–20 for quality control.",
    marketing: "Market certification to your **most successful students** — coaching clients, training program graduates, and mastermind members. Position it as a career advancement tool: \"Become a Certified [Your Method] Practitioner.\"",
    connected: "Certified facilitators deliver your **Training Programs** as licensed partners. They use your **Workbooks** and **Course** materials. Certification alumni form a **Community**. Their activities generate **Licensing** and **Franchise** revenue.",
  },
  "conventions": {
    methodology: "Conventions use the **Conference Experience Design** framework: curate speakers, workshops, networking, and exhibitions around your book's central theme. Abby designs a multi-track agenda that serves beginners, intermediate, and advanced attendees simultaneously.",
    market: "Author-hosted conventions attract **200–2,000 attendees** and generate $50,000–$500,000 per event. The real revenue is in sponsorships (40–60% of total revenue), with ticket sales covering operational costs. Conventions establish you as the category leader.",
    pricing: "Convention tickets: **$297–$997** for general admission, $997–$2,997 for VIP. Sponsorship packages: $2,500–$25,000. Exhibitor booths: $1,000–$5,000. Multi-day events with 500+ attendees can generate $200,000–$1M in total revenue.",
    marketing: "Position your convention as the **\"must-attend event\"** in your niche. Secure 2–3 headline speakers to drive registrations. Early-bird pricing (30% discount) creates urgency and early cash flow. Use **Email Marketing** for the primary promotion channel.",
    connected: "Conventions showcase all your products: **Books**, **Courses**, **Coaching**. **Exhibitors** purchase booth space. **Keynote** appearances build your speaking reputation. Convention content becomes **Online Course** material. Attendees join your **Membership**.",
  },
  "fundraising": {
    methodology: "Abby structures fundraising campaigns around your book's **mission and impact story**. The campaign ties book purchases to charitable outcomes: every book sold funds X hours of training, meals, or resources. This creates dual motivation — personal growth AND social impact.",
    market: "Cause-related marketing increases purchase intent by **85%**. Book-based fundraising campaigns raise $10,000–$100,000 for causes while simultaneously boosting book sales by 200–400%. Donors become your most engaged community members.",
    pricing: "Fundraising products are priced at a **premium** ($35–$75 for special editions) with 10–30% donated to the cause. Corporate sponsorships ($5,000–$50,000) cover event costs. The charity tie-in justifies premium pricing and attracts new audiences.",
    marketing: "Fundraising campaigns leverage **storytelling** and **urgency**: \"Help us reach our goal of $X by [date].\" Partner with established charities for credibility. Use matching gifts to double impact. Share progress publicly to maintain momentum.",
    connected: "Fundraising editions connect to **Special Editions** (charity-themed). Events tie into **Conventions** and **Retreats**. Donor lists feed **Email Marketing**. Corporate sponsors become **Consulting** clients. Impact reports power **Media Outreach**.",
  },
  "exhibitors": {
    methodology: "Abby designs exhibitor packages using the **Booth Value Proposition** framework: define what exhibitors gain (audience access, lead capture, brand association) and structure tiered packages that maximize revenue while ensuring exhibitor ROI.",
    market: "Exhibition space at niche conferences sells at **$50–$150 per square foot**. A 20-booth exhibition generates $20,000–$100,000 in booth rental alone. Exhibitors also become sponsors, speakers, and long-term business partners.",
    pricing: "Exhibitor packages: **$1,000–$5,000** for basic booths, $5,000–$15,000 for premium placement. Include: booth space, attendee list, speaking slot, and logo placement. Early-bird pricing and multi-event discounts lock in commitments.",
    marketing: "Recruit exhibitors through **direct outreach** to companies serving your audience. Provide attendee demographics, past event data, and expected foot traffic. Position exhibition as a customer acquisition channel, not just brand awareness.",
    connected: "Exhibitors at your **Conventions** become **Affiliate** partners and **Revenue Sharing** collaborators. Exhibitor relationships lead to **Consulting** opportunities. Exhibitor content enriches your **Training Programs**.",
  },
  "in-house-speaker": {
    methodology: "In-house speaking engagements use the **Corporate Alignment** approach: customize your book's message to address the client organization's specific challenges, culture, and strategic objectives. Abby helps you create modular talk components that can be mixed and matched for different corporate audiences.",
    market: "Corporate speaking is a **$4B industry**. Companies book 3–5 external speakers annually for all-hands meetings, conferences, and retreats. Authors with published methodology command $5,000–$20,000 per engagement, with repeat bookings at 35% rate.",
    pricing: "In-house speaking: **$3,000–$15,000** per engagement. Half-day workshops: $5,000–$20,000. Package deals (speaking + workshops + book bundles) command premium pricing. Travel expenses are typically covered separately.",
    marketing: "Target **HR leaders, event coordinators, and C-suite executives** through LinkedIn outreach, speaker bureaus, and referrals from past clients. Your book serves as a leave-behind that extends the impact of your talk.",
    connected: "In-house speaking leads to **Training Programs** (multi-day engagements) and **Consulting** (strategic advisory). Audience members purchase **Books** and enroll in **Online Courses**. Corporate clients become **Licensing** partners.",
  },
  "jv-partnerships": {
    methodology: "Joint venture partnerships use the **Complementary Audience** strategy: partner with authors, speakers, and experts whose audiences overlap 30–50% with yours. Abby identifies ideal partners based on your genre, audience demographics, and product suite.",
    market: "JV partnerships generate **$10,000–$100,000+** per collaboration. The key metrics: list size, engagement rate, and audience alignment. A partner with 5,000 engaged subscribers can drive more sales than one with 50,000 passive followers.",
    pricing: "JV structures: **50/50 revenue split** for joint products, 40–50% commission for promotions, or flat fee ($2,000–$10,000) for list access. Always start with a small test (single email or social post) before committing to a full campaign.",
    marketing: "Build JV relationships through **genuine value exchange**: promote their products first, offer exclusive content for their audience, and make the partnership easy (provide all marketing materials). The best JVs come from your professional network.",
    connected: "JV partners co-create **Webinars**, **Online Courses**, and **Retreats**. Cross-promotion feeds **Email Marketing** lists. Joint products become **Affiliate** offers. Successful JVs evolve into **Revenue Sharing** arrangements.",
  },
  "big-ticket": {
    methodology: "Big-ticket offerings use the **High-Touch Transformation** model: premium pricing is justified by personalized attention, guaranteed outcomes, and exclusive access. Abby packages your expertise into comprehensive solutions that solve major problems for high-net-worth clients.",
    market: "High-ticket programs ($5,000–$50,000+) serve **the top 1–5% of your audience**. These clients value time over money and want the fastest path to results. A single big-ticket sale can equal 100+ book sales in revenue.",
    pricing: "Big-ticket: **$5,000–$50,000** per engagement. Include 1:1 coaching, VIP experiences, done-for-you services, and lifetime access to your content library. Price anchoring against the cost of NOT solving the problem is key.",
    marketing: "Sell big-ticket through **personal relationships, referrals, and application processes**. Never use buy buttons — use \"Apply Now\" to maintain exclusivity. The sales process includes a discovery call, proposal, and onboarding experience.",
    connected: "Big-ticket clients are the pinnacle of your product suite. They've typically purchased **Books**, completed **Courses**, participated in **Coaching**, and attended **Retreats**. Their success stories drive all other product marketing.",
  },
  "licensing": {
    methodology: "Licensing agreements use the **Intellectual Property Monetization** framework: your book's methodology, frameworks, and branded content are licensed to organizations for internal use, training, or co-branded products. Abby structures deals that protect your IP while maximizing distribution.",
    market: "Content licensing generates **$5,000–$100,000+ annually** per licensee. Organizations prefer licensed, proven content over developing their own — it's faster, cheaper, and carries the credibility of your published work.",
    pricing: "Licensing fees: **$5,000–$50,000/year** depending on scope, exclusivity, and organization size. Per-use fees ($50–$500 per participant) work for training applications. Site licenses for unlimited internal use command premium annual fees.",
    marketing: "Target **L&D departments, franchise organizations, and educational institutions** that need scalable, proven content. Your book is the proof of concept. **Consulting** engagements often reveal licensing opportunities within client organizations.",
    connected: "Licensed content extends your **Training Programs** and **Workbooks** to new markets. Licensees become **Certification** program sponsors. Licensing revenue funds **Convention** expansion. Licensed organizations provide case studies for **Marketing**.",
  },
  "community": {
    methodology: "Community building uses the **Belonging + Growth** framework: people stay in communities that make them feel seen (belonging) and help them improve (growth). Abby structures community spaces with weekly rituals, member spotlights, and progressive challenges tied to your book's methodology.",
    market: "Online communities have a **78% member retention rate** when properly managed vs. 15% for passive groups. Community-led growth reduces customer acquisition costs by 60%. Members who participate in community buy 2.5x more products.",
    pricing: "Community access: **free tier** (basic discussion) + **premium tier** ($9.99–$27/month with live sessions, exclusive content, and networking). Free communities grow your email list. Premium communities generate recurring revenue and superfans.",
    marketing: "Communities are **self-marketing engines**: satisfied members invite peers, share wins, and create user-generated content. Launch with a founding members cohort of 50–100 for momentum. Use **Email Marketing** to nurture free-to-paid upgrades.",
    connected: "Community discussions surface content for **Social Media** and **Podcasts**. Active members upgrade to **Coaching**, **Masterminds**, and **Retreats**. Community Q&As improve your **Online Course**. Member achievements drive **Certification** interest.",
  },
  "white-label": {
    methodology: "White-label solutions use the **Brand Extension** model: your proven methodology is repackaged under a client's brand for their internal use or resale. Abby creates modular content that can be easily customized with different branding while maintaining your IP protection.",
    market: "White-label content licensing is a **$10B+ industry**. Organizations pay premium for proven, ready-to-deploy content rather than developing from scratch. Time-to-market drops from months to weeks, making white-label irresistible to corporate buyers.",
    pricing: "White-label licenses: **$10,000–$100,000** per deal depending on scope and exclusivity. Per-seat models ($100–$500/user) scale with the client's organization. Annual renewal fees ($5,000–$20,000) ensure ongoing revenue.",
    marketing: "Target **training companies, coaches, and consultants** who need proven content for their clients. Your book establishes the methodology's credibility. **Consulting** relationships often reveal white-label opportunities.",
    connected: "White-label products use your **Workbook**, **Online Course**, and **Training Program** content. White-label clients become **Certification** candidates. The relationship generates **Licensing** and **Franchise** opportunities.",
  },
  "events": {
    methodology: "Events use the **Experience Design** framework: every element — from venue selection to agenda flow — serves the dual purpose of delivering value and creating shareable moments. Abby designs events that transform attendees while generating content for your marketing.",
    market: "Live events have an **85% satisfaction rate** vs. 45% for virtual experiences. Post-pandemic, hybrid events (live + virtual) capture the best of both worlds. Event attendees spend 3x more on products than non-attendees.",
    pricing: "Event tickets: **$97–$497** for day events, $497–$2,997 for multi-day. VIP upgrades ($500–$2,000 premium) for exclusive access. Corporate group rates (10+ tickets at 20% discount) increase attendance. Early-bird pricing drives cash flow.",
    marketing: "Events are **relationship accelerators** that deepen connections with your audience. Promote through **Email Marketing**, **Social Media**, and **Affiliate** partners. Use event recordings for **Online Course** content and **Social Media** clips.",
    connected: "Events sell **Books** (back-of-room), **Coaching** (VIP upgrades), and **Courses** (live demos). Event content becomes **Webinar** replays. Attendees join your **Community** and **Membership**. Event sponsors become **Exhibitors**.",
  },
  "franchise": {
    methodology: "Franchise models use the **Replication System** framework: document every process, create training materials, and establish quality standards so your methodology can be delivered consistently by licensed operators. Abby helps you build the operations manual.",
    market: "Franchise-model educational programs generate **$500,000–$5M+** in annual system-wide revenue. The franchise fee plus ongoing royalties (5–8% of revenue) create a scalable income stream. Each franchisee extends your brand reach to new markets.",
    pricing: "Franchise fees: **$10,000–$50,000** initial investment, plus 5–8% ongoing royalties. Training and support package: $5,000–$15,000. Territory exclusivity commands premium pricing. Multi-unit discounts encourage expansion.",
    marketing: "Market franchises to **successful Certification graduates** who want to build a business around your methodology. Provide proven business models, marketing templates, and ongoing operational support to reduce franchisee risk.",
    connected: "Franchisees use your **Certification** as the entry point. They deliver **Training Programs** using your **Workbook** materials. Franchise operations feed your **Convention** speaker roster. Franchisee success stories drive **Media Outreach**.",
  },
};

// Fallback for any unmapped product
const FALLBACK: BehindTheDesignData = {
  methodology: "Abby uses proven pedagogical and business frameworks tailored to your book's unique content and audience. Every design decision is grounded in research-backed best practices for knowledge transfer and engagement.",
  market: "Market analysis considers your genre, audience size, competitor pricing, and seasonal demand patterns to position your product for maximum impact and discoverability.",
  pricing: "Pricing is calibrated using competitive analysis, perceived value benchmarks, and your audience's willingness to pay. The goal is to maximize revenue while maintaining accessibility for your target market.",
  marketing: "Your marketing strategy integrates with your existing products and audience touchpoints. Every promotional element is designed to drive measurable conversions across your product ecosystem.",
  connected: "This product connects to your broader author business suite — feeding leads, content, and revenue into complementary offerings. Each product strengthens the others in a self-reinforcing ecosystem.",
};

export function getBehindTheDesignContent(builderId: string): BehindTheDesignData {
  return CONTENT[builderId] || FALLBACK;
}
