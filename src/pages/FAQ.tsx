import { useState, useRef, useCallback, useMemo } from "react";
import { Search, Sparkles, Bug, MessageSquare, Rocket, Globe, CreditCard, Hammer, BookOpen, HelpCircle, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { cn } from "@/lib/utils";
import ABBYFrameworkArticle from "@/components/faq/ABBYFrameworkArticle";

/* ─── FAQ Data ─── */
const categories = [
  { id: "getting-started", title: "Getting Started", icon: Rocket, iconBg: "#EFF6FF", iconColor: "#3B82F6", description: "Setting up your account, profile, and first book" },
  { id: "your-microsite", title: "Your Directory Profile", icon: Globe, iconBg: "#F0FDF4", iconColor: "#22C55E", description: "Managing your public directory profile" },
  { id: "understanding-abby", title: "Understanding the ABBY Framework", icon: Sparkles, iconBg: "#FFFBEB", iconColor: "#D4A843", description: "The complete guide to 28 revenue streams, pricing paths, and how everything connects", isArticle: true },
  { id: "abby-framework", title: "ABBY Framework", icon: Sparkles, iconBg: "#FFFBEB", iconColor: "#D4A843", description: "How Abby analyzes your book and builds your plan" },
  { id: "subscriptions-billing", title: "Subscriptions & Billing", icon: CreditCard, iconBg: "#F5F3FF", iconColor: "#8B5CF6", description: "Plans, pricing, upgrades, and payments" },
  { id: "building-products", title: "Building Products", icon: Hammer, iconBg: "#FFF7ED", iconColor: "#F97316", description: "Using the AI builders to create and sell products" },
  { id: "reading-club", title: "Reading Club", icon: BookOpen, iconBg: "#F0FDFA", iconColor: "#14B8A6", description: "The 100-Day Reading Challenge" },
];

const faqData: Record<string, { q: string; a: string }[]> = {
  "getting-started": [
    { q: "What is Authors Bureau?", a: "Authors Bureau is the author showcase platform where published authors are discovered and where their expertise becomes a business. Every author gets a free professional microsite — a landing page with your photo, bio, books, services, and social links — all at authorsbureau.com/authors/your-name. With the ABBY Framework, our AI Business Consultant Abby can turn your book into up to 28 revenue streams, from online courses and coaching programs to speaking engagements and retreats. Think of it as Amazon Author Central + Teachable + Kajabi + Calendly — all in one place, with AI that builds your products for you." },
    { q: "How do I create an account?", a: 'Click "Dashboard" in the top navigation or "Get Featured" on the homepage. You can sign up using your email (we\'ll send a verification code) or create a password. Once registered, you\'ll land on your dashboard where you can start setting up your author profile and adding your books. The entire process takes about 5 minutes.' },
    { q: "Is Authors Bureau free?", a: "Yes! Every author gets three things completely free: (1) a professional microsite — your own author landing page with books, bio, services, and social links; (2) a listing in the Authors Directory where readers discover you; and (3) a free AI business consultation with Abby, who analyzes your book and creates a personalized monetization strategy. You only pay when you're ready to start building products — subscriptions start at $47/month for the Starter plan." },
    { q: "Who can join Authors Bureau?", a: "Authors Bureau is for published authors — whether you've published through Amazon KDP, traditional publishers, hybrid publishers, or self-publishing platforms. If you have a published book (physical, ebook, or audiobook), you can apply to be featured. Your book and profile go through a brief approval process to maintain quality standards." },
    { q: "How do I get my book featured?", a: 'After creating your account, go to "My Books Hub" in the dashboard and click "+ Add Book." Fill in your book details — title, subtitle, genre, description, Amazon or purchase link, and upload your cover image. Submit for approval, and our team will review it. Once approved, your book appears in the Authors Directory, the Reading Club catalog, and on your microsite.' },
    { q: "How long does approval take?", a: "Most books are reviewed and approved within 24-48 hours. You'll receive a notification when your book is live. If we need additional information, we'll reach out through the platform." },
  ],
  "your-microsite": [
    { q: "What is a microsite?", a: "Your microsite is a professional landing page for your author brand at authorsbureau.com/authors/your-name. It showcases your photo, bio, credentials, all your published books with pricing and purchase links, services you offer (speaking, coaching, courses), and social media links. It's designed to be the one link you share everywhere — on social media, in your email signature, on business cards, and in media kits." },
    { q: "How do I set up my microsite?", a: 'Your microsite is built automatically from your Author Profile and My Books Hub. Go to "Author Profile" in the dashboard to add your bio, photo, and credentials. Then go to "My Books Hub" to add your books. Once your profile and at least one book are approved, your microsite goes live. Preview it anytime from "My Microsite" in the sidebar.' },
    { q: "Can I customize my microsite?", a: "The visual design is standardized to maintain a professional, consistent look across all authors — this actually helps with credibility and trust. You can fully customize your content: bio, photo, book descriptions, services, social links, and credentials. On Pro and Enterprise plans, you get additional microsite pages (lead capture forms, events calendar, blog) and Enterprise includes custom domain support so your microsite can live at your own domain." },
    { q: "How do I add services to my microsite?", a: 'Go to "Author Profile" in the dashboard, scroll down to the Services section. You can add speaking topics, coaching packages, course offerings, and any other services you provide. Each service appears as a card on your microsite with a description and a call-to-action button.' },
    { q: "Can readers buy my products through my microsite?", a: 'Yes! Once you connect Stripe and publish products through the AI builders, they appear on your microsite with "Buy Now" or "Enroll" buttons. Readers can purchase directly, and payments go to your Stripe account minus the platform fee (5%) and Stripe processing fees (2.9% + $0.30). You keep approximately 92% of every sale.' },
  ],
  "abby-framework": [
    { q: "What is the ABBY Framework?", a: "ABBY stands for Analyze, Brand, Build, Yield — it's the four-step methodology for turning your book into a business. First, Abby (our AI Business Consultant) Analyzes your book and creates a personalized business plan. Then you create Brand Products (workbooks, home study, lead magnets, webinars) using AI builders. Next, you Build Authority by scaling your audience through courses, audiobooks, coaching, and partnerships. Finally, you Yield Revenue through premium services like consulting, keynotes, masterminds, and retreats." },
    { q: "What does Abby analyze?", a: "Abby reads your book content and author profile, then maps your expertise to up to 28 revenue streams across three categories: Brand Products (9 nodes — workbooks, home study, book sales, special editions, lead magnets, webinars, social media, email marketing, website), Build Authority (9 nodes — online courses, audiobook, memberships, group coaching, podcast tour, media outreach, affiliates, upsells, revenue sharing), and Yield Revenue (10 nodes — coaching, consulting, keynotes, training, masterminds, retreats, certification, conventions, fundraising, exhibitors). She creates a personalized business plan with specific product recommendations, pricing suggestions, and conservative revenue projections tailored to your genre, audience, and expertise." },
    { q: "Is the Abby consultation free?", a: "Yes, completely free — no credit card required. Abby will analyze your book, identify your best revenue opportunities, and create a detailed monetization strategy with revenue projections. You only pay when you're ready to use the AI builders to create the actual products." },
    { q: "How long does the analysis take?", a: "Abby's analysis typically takes about 5 minutes. She'll walk you through a brief conversation about your goals and audience, then generate your personalized business plan. You can download the plan as a .docx file and review it at your own pace." },
    { q: "What are the 28 revenue streams?", a: "The 28 streams are organized into three categories. Brand Products (9 streams) includes book sales, workbooks, home study, special editions, lead magnets, webinars, social media, email marketing, and website. Build Authority (9 streams) includes online courses, audiobook, memberships, group coaching, podcast tour, media outreach, affiliates, upsells, and revenue sharing. Yield Revenue (10 streams) includes coaching, consulting, keynotes, training, masterminds, retreats, certification, conventions, fundraising, and exhibitors." },
    { q: "Can I re-run the analysis?", a: 'Yes! You can start a new session with Abby anytime from the "Analyze with Abby" page. This is useful if you\'ve published a new book, changed your focus, or want to explore different revenue strategies.' },
  ],
  "subscriptions-billing": [
    { q: "What subscription plans are available?", a: "Authors Bureau offers three plans. Starter ($49/month) includes Build builders (workbooks, social media calendars, email sequences, home study courses, book sales, special editions, microsite), a basic author profile page, and 1 product sales page — perfect for testing the waters. Pro ($199/month) adds all 8 Build builders plus all 8 Bridge builders (audiobooks, podcasts, webinars, lead magnets, media outreach, affiliates, upsells/downsells, revenue sharing), unlimited microsite pages, Stripe Connect for payments, CRM and email automation, lead capture pages, and coaching booking — everything you need to build a real business. Enterprise ($499/month) unlocks all 28 builders including all 12 Yield builders (coaching, memberships, consulting, keynotes, retreats, certification, masterminds, training, conventions, fundraising, exhibitors/JV), custom domain support, white-label option, events management, and a 1-on-1 strategic session with Pauline Teo." },
    { q: "How do I subscribe?", a: 'After Abby creates your business plan, you\'ll see a subscription section with pricing cards and "Get Started" buttons. You can also subscribe from the Dashboard page. Click the plan you want, and you\'ll be taken to a secure Stripe checkout to enter your payment details.' },
    { q: "Can I upgrade or downgrade my plan?", a: "You can upgrade at any time — your new plan takes effect immediately, and you'll be charged the prorated difference for the remainder of your billing cycle. To downgrade, use the Abby chatbot to contact support. Downgrades take effect at the end of your current billing cycle so you don't lose access mid-month." },
    { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through Stripe's secure payment processing." },
    { q: "What is Stripe Connect and why do I need it?", a: "Stripe Connect is how you receive payments when readers buy your products through your microsite. When someone purchases your course, workbook, or coaching session, the payment flows through Stripe — the platform takes a 5% fee, Stripe takes their standard processing fee (2.9% + $0.30), and approximately 92% goes directly to your Stripe account. You need to connect Stripe before you can publish paid products. The setup takes about 2 minutes." },
    { q: "What is the platform fee?", a: "Authors Bureau charges a 5% platform fee on all sales made through your microsite. Standard Stripe processing fees (2.9% + $0.30) apply separately. This means you keep approximately 92% of every sale. Compare this to platforms like Kajabi (0% but $149-$399/month), Teachable (5-10% + $39-$119/month), or Gumroad (10%) — Authors Bureau gives you AI-powered product creation AND sales infrastructure for less." },
    { q: "Is there a free trial?", a: "While there's no traditional free trial, you get substantial value before paying anything: a free microsite, free directory listing, and a free AI business consultation with Abby. This lets you see exactly what products Abby recommends and what revenue she projects before you commit to a subscription. The Starter plan pays for itself when you sell just 2 copies of a $27 product." },
  ],
  "building-products": [
    { q: "How do the AI builders work?", a: "Each builder is an AI-powered tool that creates a specific type of product from your book content. For example, the Workbook Builder takes your book's key concepts and creates a structured workbook with exercises, reflection prompts, and action items. The Course Builder creates a multi-module online course with lesson plans and assignments. You review and customize everything before publishing — nothing goes live without your approval." },
    { q: "What products can I build on each plan?", a: "Starter gives you 3 builders: Workbook, Social Media Content Calendar, and Email Welcome Sequence. Pro adds 8 more Build builders (courses, audiobooks, memberships, masterclasses, certifications, templates, assessments) plus all 8 Bridge builders (coaching setup, speaking kit, webinar framework, podcast pitch, etc.). Enterprise unlocks the remaining 8 Yield builders (retreats, corporate training, licensing frameworks, event planning, etc.)." },
    { q: "How long does it take to build a product?", a: 'Most individual products take 5-15 minutes for the AI to generate. You then review, customize, and publish at your own pace. Pro and Enterprise users can use the "Build My Author Business" one-click feature, where Abby generates all your recommended products in 15-30 minutes.' },
    { q: "Can I edit products after the AI creates them?", a: "Absolutely! Every AI-generated product starts as a draft. You can review, edit, rewrite, add to, or completely customize everything before publishing. Think of the AI as your first draft creator — you're the editor and final decision-maker. You can also re-generate any product if you want a different approach." },
    { q: "Where do my products appear after publishing?", a: "Published products appear on your microsite at authorsbureau.com/authors/your-name. Readers can discover them through the Authors Directory, Reading Club, search engines, or by visiting your microsite directly. You can share your microsite link anywhere — social media, email signature, business cards, media kits." },
    { q: "What if I'm not happy with what the AI creates?", a: "You can regenerate any product as many times as you like. You can also edit the AI's output manually. If you're still not satisfied, use the Abby chatbot to give feedback — we continuously improve our builders based on author input." },
  ],
  "reading-club": [
    { q: "What is the 100-Day Reading Challenge?", a: "The Reading Club is a community feature where readers commit to reading just 2 minutes a day for 100 days. They choose a book from the Authors Bureau catalog, start the challenge, and log their daily reads. It's a trust-based accountability system designed to help readers build a consistent reading habit while discovering new authors and their expertise." },
    { q: "How does my book get into the Reading Club?", a: "Once your book is approved and listed on Authors Bureau, it automatically appears in the Reading Club catalog. Readers can browse by genre and start a 100-Day Challenge with any book in the catalog." },
    { q: "How does the Reading Club benefit me as an author?", a: "The Reading Club is a powerful discovery channel. Readers who commit to 100 days with your book become deeply engaged with your ideas — they're the most likely audience to buy your courses, sign up for coaching, attend your speaking events, or join your membership. It turns casual browsers into committed readers, and committed readers into paying customers." },
    { q: "Can readers do multiple challenges?", a: "Yes! Readers can start challenges with multiple books. Each challenge is tracked independently with its own 100-day counter." },
  ],
};

/* ─── Component ─── */
export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Build JSON-LD for all FAQs
  const jsonLd = useMemo(() => {
    const allFaqs = Object.values(faqData).flat();
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allFaqs.map(f => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
  }, []);

  useDocumentMeta({
    title: "Help Center — Authors Bureau | FAQ for Published Authors",
    description: "Find answers about Authors Bureau — the platform for published authors to build their business. Learn about microsites, the ABBY Framework, AI builders, subscriptions, and more.",
    jsonLd,
  });

  const toggleItem = useCallback((key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openChatbot = (mode?: string) => {
    // Trigger the global chatbot
    const btn = document.querySelector("[data-abby-trigger]") as HTMLButtonElement;
    if (btn) btn.click();
  };

  // Filter logic
  const lq = searchQuery.toLowerCase();
  const filteredCategories = categories.filter(cat =>
    !lq || faqData[cat.id]?.some(f => f.q.toLowerCase().includes(lq) || f.a.toLowerCase().includes(lq))
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="py-16" style={{ background: "#1B2A4A" }}>
        <div className="container text-center">
          <h1 className="text-4xl font-bold text-white font-heading">Help Center</h1>
          <p className="mt-2 text-white/70 text-base">Everything you need to know about Authors Bureau</p>

          <div className="mx-auto mt-6 max-w-[560px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for answers..."
              className="w-full rounded-full bg-white py-3 pl-12 pr-4 text-base outline-none shadow-lg"
              style={{ height: 48 }}
            />
          </div>

          <p className="mt-4 text-white/60 text-sm">
            Can't find what you need?{" "}
            <button onClick={() => openChatbot()} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #D4A843, #C4922E)" }}>
              <Sparkles size={14} /> Ask Abby
            </button>
          </p>
        </div>
      </section>

      {/* Category Cards */}
      {!searchQuery && (
        <section className="py-16 bg-background">
          <div className="container max-w-[1200px]">
            <h2 className="text-2xl font-semibold text-center mb-8" style={{ color: "#1B2A4A" }}>Browse by Topic</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => scrollToSection(cat.id)}
                    className="text-left p-6 rounded-xl border border-border bg-card hover:shadow-md hover:border-secondary transition-all"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: cat.iconBg }}>
                      <Icon size={24} style={{ color: cat.iconColor }} />
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: "#1B2A4A" }}>{cat.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Sections */}
      {filteredCategories.map((cat, catIdx) => {
        const Icon = cat.icon;

        // Render full article for the ABBY Framework guide
        if ((cat as any).isArticle) {
          if (lq) return null; // skip article in search mode
          return (
            <section
              key={cat.id}
              id={cat.id}
              ref={el => { sectionRefs.current[cat.id] = el; }}
              className={cn("py-12", catIdx % 2 === 0 ? "bg-background" : "bg-muted/30")}
              style={{ scrollMarginTop: 80 }}
            >
              <div className="container max-w-[800px]">
                <div className="flex items-center gap-3 mb-6">
                  <Icon size={24} style={{ color: cat.iconColor }} />
                  <h2 className="text-2xl font-semibold" style={{ color: "#1B2A4A" }}>{cat.title}</h2>
                </div>
                <ABBYFrameworkArticle />
              </div>
            </section>
          );
        }

        const items = faqData[cat.id] || [];
        const filteredItems = lq
          ? items.filter(f => f.q.toLowerCase().includes(lq) || f.a.toLowerCase().includes(lq))
          : items;

        if (filteredItems.length === 0) return null;

        return (
          <section
            key={cat.id}
            id={cat.id}
            ref={el => { sectionRefs.current[cat.id] = el; }}
            className={cn("py-12", catIdx % 2 === 0 ? "bg-background" : "bg-muted/30")}
            style={{ scrollMarginTop: 80 }}
          >
            <div className="container max-w-[800px]">
              <div className="flex items-center gap-3 mb-6">
                <Icon size={24} style={{ color: cat.iconColor }} />
                <h2 className="text-2xl font-semibold" style={{ color: "#1B2A4A" }}>{cat.title}</h2>
              </div>

              <div className="space-y-0">
                {filteredItems.map((faq, faqIdx) => {
                  const key = `${cat.id}-${faqIdx}`;
                  const isOpen = openItems.has(key) || !!lq;
                  const voteKey = key;

                  return (
                    <div key={key} className="border-b border-border">
                      <button
                        onClick={() => toggleItem(key)}
                        className="flex w-full items-center gap-3 py-4 text-left"
                      >
                        {isOpen
                          ? <ChevronDown size={18} className="shrink-0 text-secondary" />
                          : <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                        }
                        <h3 className="text-base font-semibold" style={{ color: "#1B2A4A" }}>{faq.q}</h3>
                      </button>

                      <div className={cn(
                        "overflow-hidden transition-all duration-200",
                        isOpen ? "max-h-[2000px] opacity-100 pb-4" : "max-h-0 opacity-0"
                      )}>
                        <div className="pl-8 pr-4">
                          <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-muted-foreground/60">Was this helpful?</span>
                            <button
                              onClick={() => setVotes(prev => ({ ...prev, [voteKey]: "up" }))}
                              className={cn("p-1 rounded transition-colors", votes[voteKey] === "up" ? "text-secondary" : "text-muted-foreground/40 hover:text-secondary")}
                            >
                              <ThumbsUp size={14} />
                            </button>
                            <button
                              onClick={() => setVotes(prev => ({ ...prev, [voteKey]: "down" }))}
                              className={cn("p-1 rounded transition-colors", votes[voteKey] === "down" ? "text-destructive" : "text-muted-foreground/40 hover:text-destructive")}
                            >
                              <ThumbsDown size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Bottom CTA */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #D4A843, #C4922E)" }}>
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white">Still Have Questions?</h2>
          <p className="mt-2 text-white/80 text-base">Our AI assistant Abby is here to help 24/7</p>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button
              onClick={() => openChatbot()}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-medium transition-transform hover:scale-105"
              style={{ color: "#D4A843" }}
            >
              <Sparkles size={18} /> Ask Abby
            </button>
            <button
              onClick={() => openChatbot("bug")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-medium text-white transition-transform hover:scale-105"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Bug size={18} /> Report a Bug
            </button>
            <button
              onClick={() => openChatbot("feedback")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-medium text-white transition-transform hover:scale-105"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <MessageSquare size={18} /> Give Feedback
            </button>
          </div>

          <p className="mt-6 text-white/60 text-sm">
            Or email us at <a href="mailto:support@authorsbureau.com" className="underline hover:text-white">support@authorsbureau.com</a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
