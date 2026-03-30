import { useState, useRef, useCallback, useMemo } from "react";
import { Search, Sparkles, Bug, MessageSquare, Rocket, Globe, Hammer, BookOpen, HelpCircle, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";
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
  { id: "understanding-abby", title: "Understanding the ABBY Framework", icon: Sparkles, iconBg: "#FFFBEB", iconColor: "#D4A843", description: "The complete guide to 28 revenue streams and how everything connects", isArticle: true },
  { id: "abby-framework", title: "ABBY Framework", icon: Sparkles, iconBg: "#FFFBEB", iconColor: "#D4A843", description: "How Abby analyzes your book and builds your plan" },
  { id: "building-products", title: "Building Products", icon: Hammer, iconBg: "#FFF7ED", iconColor: "#F97316", description: "Using the AI builders to create and sell products" },
  { id: "readers-bureau", title: "Readers Bureau", icon: BookOpen, iconBg: "#F0FDFA", iconColor: "#14B8A6", description: "Discover, read, and engage with author content" },
];

const faqData: Record<string, { q: string; a: string }[]> = {
  "getting-started": [
    { q: "What is Authors Bureau?", a: "Authors Bureau is the platform where published authors turn their book into a business. Every author gets a free professional microsite at authorsbureau.com/authors/your-name, a listing in the Authors Directory, and a free AI business consultation with Abby. Using the ABBY Framework (Analyze, Brand, Build, Yield), Abby can map your book to up to 28 revenue streams, from workbooks and online courses to coaching programs and speaking engagements." },
    { q: "How do I create an account?", a: "Click \"Sign Up\" in the top navigation. You can register using your email (we'll send a verification code) or create a password. Once registered, you'll land on your dashboard where you can start setting up your author profile and adding your books. The entire process takes about 5 minutes." },
    { q: "Is Authors Bureau free to start?", a: "Yes! Every author gets three things completely free: (1) a professional microsite with your books, bio, services, and social links; (2) a listing in the Authors Directory where readers discover you; and (3) a free AI business consultation with Abby, who analyzes your book and creates a personalized monetization strategy with revenue projections." },
    { q: "Who can join Authors Bureau?", a: "Authors Bureau is for published authors, whether you've published through Amazon KDP, traditional publishers, hybrid publishers, or self-publishing platforms. If you have a published book (physical, ebook, or audiobook), you can apply to be featured. Your book and profile go through a brief approval process to maintain quality standards." },
    { q: "How do I get my book featured?", a: "After creating your account, go to \"My Books Hub\" in the dashboard and click \"+ Add Book.\" Fill in your book details (title, subtitle, genre, description, Amazon or purchase link) and upload your cover image. Submit for approval, and our team will review it within 24-48 hours. Once approved, your book appears in the Authors Directory and on your microsite." },
  ],
  "your-microsite": [
    { q: "What is a microsite?", a: "Your microsite is a professional landing page for your author brand at authorsbureau.com/authors/your-name. It showcases your photo, bio, credentials, all your published books with pricing and purchase links, services you offer (speaking, coaching, courses), and social media links. It's designed to be the one link you share everywhere, on social media, in your email signature, on business cards, and in media kits." },
    { q: "How do I set up my microsite?", a: "Your microsite is built automatically from your Author Profile and My Books Hub. Go to \"Author Profile\" in the dashboard to add your bio, photo, and credentials. Then go to \"My Books Hub\" to add your books. Once your profile and at least one book are approved, your microsite goes live. Preview it anytime from \"My Microsite\" in the sidebar." },
    { q: "Can I customize my microsite?", a: "The visual design is standardized to maintain a professional, consistent look across all authors, which helps with credibility and trust. You can fully customize your content: bio, photo, book descriptions, services, social links, and credentials." },
    { q: "How do I add services to my microsite?", a: "Go to \"Author Profile\" in the dashboard, scroll down to the Services section. You can add speaking topics, coaching packages, course offerings, and any other services you provide. Each service appears as a card on your microsite with a description and a call-to-action button." },
    { q: "Can readers buy my products through my microsite?", a: "Yes! Once you connect Stripe and publish products through the AI builders, they appear on your microsite with \"Buy Now\" or \"Enroll\" buttons. Readers can purchase directly, and payments go to your Stripe account. You keep approximately 92% of every sale after platform and processing fees." },
  ],
  "abby-framework": [
    { q: "What is the ABBY Framework?", a: "ABBY stands for Analyze, Brand, Build, Yield. It's the four-step methodology for turning your book into a business. First, Abby (our AI Business Advisor) Analyzes your book and creates a personalized business plan. Then you create Brand Products (workbooks, home study courses, special editions). Next, you Build Authority to scale your audience (online courses, audiobooks, memberships, group coaching). Finally, you Yield Revenue through premium services like coaching, consulting, keynotes, and masterminds." },
    { q: "What does Abby analyze?", a: "Abby reads your book content and author profile, then maps your expertise to up to 28 revenue streams across three tiers: Brand Products (9 products like workbooks, home study courses, and email marketing), Build Authority (9 growth channels like online courses, audiobooks, and memberships), and Yield Revenue (10 premium services like coaching, consulting, masterminds, and retreats). She creates a personalized business plan with product recommendations, pricing suggestions, and revenue projections tailored to your genre and audience." },
    { q: "Is the Abby consultation free?", a: "Yes, completely free with no credit card required. Abby will analyze your book, identify your best revenue opportunities, and create a detailed monetization strategy with revenue projections. You can download the plan and review it at your own pace." },
    { q: "How long does the analysis take?", a: "Abby's analysis typically takes about 5 minutes. She'll walk you through a brief conversation about your goals and audience, then generate your personalized business plan. You can download the plan as a document and review it at your own pace." },
    { q: "What are the 28 revenue streams?", a: "The 28 streams are organized into three tiers. Brand Products (9 streams): book sales, workbooks, home study courses, special editions, lead magnets, webinars, social media, email marketing, and website. Build Authority (9 streams): online courses, audiobooks, memberships, group coaching, podcast tour, media outreach, affiliates, upsells/downsells, and revenue sharing. Yield Revenue (10 streams): 1-on-1 coaching, consulting, keynotes, training programs, masterminds, retreats, certification, conventions, fundraising, and exhibitors." },
  ],
  "building-products": [
    { q: "How do the AI builders work?", a: "Each builder is an AI-powered tool that creates a specific type of product from your book content. For example, the Workbook Builder takes your book's key concepts and creates a structured workbook with exercises, reflection prompts, and action items. The Course Builder creates a multi-module online course with lesson plans and assignments. You review and customize everything before publishing. Nothing goes live without your approval." },
    { q: "How long does it take to build a product?", a: "Most individual products take 5-15 minutes for the AI to generate. You then review, customize, and publish at your own pace. You can also use the \"Build My Author Business\" feature where Abby generates all your recommended products in one session." },
    { q: "Can I edit products after the AI creates them?", a: "Absolutely! Every AI-generated product starts as a draft. You can review, edit, rewrite, add to, or completely customize everything before publishing. Think of the AI as your first draft creator. You're the editor and final decision-maker. You can also re-generate any product if you want a different approach." },
    { q: "Where do my products appear after publishing?", a: "Published products appear on your microsite at authorsbureau.com/authors/your-name. Readers can discover them through the Authors Directory, Readers Bureau, search engines, or by visiting your microsite directly. You can share your microsite link anywhere." },
    { q: "What if I'm not happy with what the AI creates?", a: "You can regenerate any product as many times as you like. You can also edit the AI's output manually. If you're still not satisfied, use the Abby chatbot to give feedback. We continuously improve our builders based on author input." },
  ],
  "readers-bureau": [
    { q: "What is Readers Bureau?", a: "Readers Bureau is the reader-facing side of Authors Bureau. It's where readers discover authors, browse books, purchase digital products like courses and workbooks, and engage with author content. Think of it as the storefront that connects readers directly with the products authors build on the platform." },
    { q: "How does my book appear on Readers Bureau?", a: "Once your book is approved and listed on Authors Bureau, it automatically appears in the Readers Bureau catalog. Readers can browse by genre and discover your books, courses, and other products." },
    { q: "How does Readers Bureau benefit me as an author?", a: "Readers Bureau is a powerful discovery channel. Readers who engage with your content become deeply familiar with your ideas, making them the most likely audience to buy your courses, sign up for coaching, attend your speaking events, or join your membership. It turns casual browsers into committed readers, and committed readers into paying customers." },
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
