import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, Bug, MessageSquare, Rocket, Globe, Hammer, BookOpen, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { cn } from "@/lib/utils";
import ABBYFrameworkArticle from "@/components/faq/ABBYFrameworkArticle";

const categories = [
  { id: "getting-started", title: "Getting Started", icon: Rocket, iconBg: "#EFF6FF", iconColor: "#3B82F6", description: "Setting up your account, profile, and first book" },
  { id: "your-microsite", title: "Your Directory Profile", icon: Globe, iconBg: "#F0FDF4", iconColor: "#22C55E", description: "Managing your public author page and published offers" },
  { id: "understanding-abby", title: "The ABBY Framework & Revenue Streams", icon: Sparkles, iconBg: "#FFFBEB", iconColor: "#D4A843", description: "How Abby works, the Analyse → Brand → Build → Yield journey, and all 28 revenue streams" },
  { id: "building-products", title: "Building & Publishing", icon: Hammer, iconBg: "#FFF7ED", iconColor: "#F97316", description: "Using guided builders to create, review, and launch your offers" },
  { id: "readers-bureau", title: "Readers Bureau", icon: BookOpen, iconBg: "#F0FDFA", iconColor: "#14B8A6", description: "How readers discover your books, offers, and author content" },
];

const faqData: Record<string, { q: string; a: string }[]> = {
  "getting-started": [
    { q: "What is Authors Bureau?", a: "Authors Bureau helps published authors turn one book into a business. Every author gets a public directory profile, a listing in the Authors Directory, and a free consultation with Abby. Using the Analyse → Brand → Build → Yield framework, Abby maps your book to 28 revenue streams — from audience-building assets to premium services." },
    { q: "How do I create an account?", a: "Click \"Sign Up\" in the top navigation. You can register using your email (we'll send a verification code) or create a password. Once registered, you'll land on your dashboard where you can start setting up your author profile and adding your books. The entire process takes about 5 minutes." },
    { q: "Is Authors Bureau free to start?", a: "Yes. You can create your account, build your public directory profile, list your published books, and get a free consultation with Abby at no cost. That gives you a live author presence plus a personalized roadmap before you decide which revenue streams to build." },
    { q: "Who can join Authors Bureau?", a: "Authors Bureau is for published authors, whether you've published through Amazon KDP, traditional publishers, hybrid publishers, or self-publishing platforms. If you have a published book (physical, ebook, or audiobook), you can apply to be featured. Your book and profile go through a brief approval process to maintain quality standards." },
    { q: "How do I add my book to Authors Bureau?", a: "After creating your account, go to \"My Books Hub\" and click \"+ Add Book.\" Enter your title, subtitle, description, genre, book link, and cover image, then submit it for review. Once approved, your book appears on your public author page and in the Authors Directory." },
  ],
  "your-microsite": [
    { q: "What is my directory profile?", a: "Your directory profile is your public author page on Authors Bureau. It showcases your photo, bio, credentials, books, links, and any revenue streams you decide to publish. It is the main page you can share with readers, podcast hosts, event organizers, and potential clients." },
    { q: "How do I set up my directory profile?", a: "Your profile is built automatically from your Author Profile and My Books Hub. Add your bio, photo, credentials, and links in \"Author Profile,\" then add your books in \"My Books Hub.\" Once approved, your public page goes live and updates as you publish more content and offers." },
    { q: "Can I customize my directory profile?", a: "You control the content on your page — your bio, photos, book descriptions, credentials, links, and published offers. The page design stays consistent across Authors Bureau so every author has a clean, professional presentation." },
    { q: "How do I add services and offers to my page?", a: "Use your dashboard to build and publish your revenue streams. Depending on what you create, your page can show products, services, speaking offers, courses, consultations, and lead-generation assets. Each published item appears with its own description and action button." },
    { q: "Can readers buy from my directory profile?", a: "Yes. When you publish revenue streams, readers can click through to the relevant product or offer page from your public profile. Some offers are direct purchases, while others may be bookings, applications, or contact-based enquiries depending on the type of revenue stream." },
  ],
  "understanding-abby": [
    { q: "What is the ABBY Framework?", a: "ABBY stands for Analyse, Brand, Build, Yield. It is the methodology Authors Bureau uses to turn a published book into a business. Abby starts by analyzing your book and positioning, then maps your opportunities across 28 revenue streams grouped into Brand Products, Build Authority, and Yield Revenue." },
    { q: "What are the 4 stages?", a: "Analyse: Abby studies your book, positioning, and opportunities. Brand: Build your foundation with the first 9 revenue streams (Email Marketing, Lead Magnets, Social Media, Website, Webinars, Workbook, Home Study, Special Editions, Book Sales). Build: Expand authority with the next 9 streams (Online Courses, Audiobook, Memberships, Group Coaching, Podcast Tour, Media Outreach, Affiliates, Upsells/Downsells, Revenue Sharing). Yield: Activate 10 premium streams (Coaching, Consulting, Keynotes, Training Programs, Masterminds, Retreats, Certification, Conferences, Fund Raising, Exhibitors/JV)." },
    { q: "Do I need to build all 28 at once?", a: "No. Abby sequences the journey for you. Most authors start with the Brand foundation, then expand into Build Authority, and only layer on Yield Revenue when the timing and audience fit are right." },
    { q: "How does Abby build my plan?", a: "Abby identifies your strongest opportunities, your audience fit, and the frameworks inside your book. She recommends the right order — usually starting with Brand foundations — then each builder turns the strategy into actual pages, content, and offers you can review and launch." },
    { q: "Is the Abby consultation free?", a: "Yes. Abby's initial consultation is free and helps you understand the biggest opportunities inside your book before you start building anything." },
    { q: "What revenue can I expect?", a: "Directional estimates based on the platform architecture: Brand Products $5,520–$15,480/year, Build Authority $13,500–$39,480/year, Yield Revenue $68,400–$215,520/year. Actual results vary by niche, audience size, positioning, and execution." },
    { q: "Can I change the order later?", a: "Yes. Abby recommends the sequence, but you can revisit earlier streams, improve published offers, and expand into new categories as your business evolves." },
  ],
  "building-products": [
    { q: "How do the builders work?", a: "Each builder is focused on one specific revenue stream. Abby uses your book and business plan context to draft the structure, copy, and supporting content for that offer. You then review, edit, and approve everything before it is published or activated." },
    { q: "What does Abby analyze before building?", a: "Abby looks at your book, author profile, positioning, audience goals, and the core frameworks or ideas inside your work. She uses that context to recommend which revenue streams fit you best, what order to build them in, and how they connect into a business model around your book." },
    { q: "Which revenue streams are usually built first?", a: "Abby usually starts with your Brand foundation: Email Marketing, Lead Magnets, Social Media, Website / Microsite, and Webinars. Once that base is in place, she expands into Workbook, Home Study Course, Special Editions, and Book Sales before moving into Build Authority and Yield Revenue opportunities." },
    { q: "Can I edit revenue streams after Abby creates them?", a: "Yes. Everything starts as a draft. You can edit the wording, structure, titles, positioning, and details before anything goes live. Abby gives you a strong first version, but you remain the final decision-maker." },
    { q: "Where do my revenue streams appear after publishing?", a: "Published offers can appear on your public author page, your book pages, and dedicated product or offer pages depending on the stream. That makes it easy for readers to move from discovering your book to engaging with your broader business." },
    { q: "What if I'm not happy with the first draft?", a: "You can revise it manually, regenerate parts of it, or ask Abby for a different angle. The system is designed to help you iterate until the offer feels aligned with your voice and audience." },
  ],
  "readers-bureau": [
    { q: "What is Readers Bureau?", a: "Readers Bureau is the reader-facing discovery layer of Authors Bureau. It helps readers explore authors, books, and published offers, while giving authors a public pathway from book discovery to deeper engagement." },
    { q: "How does my book appear on Readers Bureau?", a: "When your profile and book are approved, they can appear in the public directory and discovery experience. As you publish more revenue streams, readers can also discover those offers through your public pages." },
    { q: "How does Readers Bureau benefit me as an author?", a: "It helps turn discovery into momentum. A reader may find your book first, then move into your profile, your lead magnet, your email list, your products, or your services. In other words, it supports the journey from reader interest to long-term business growth." },
  ],
};

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const jsonLd = useMemo(() => {
    const allFaqs = Object.values(faqData).flat();
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allFaqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
  }, []);

  useDocumentMeta({
    title: "Help Center — Authors Bureau | FAQ for Published Authors",
    description: "Find answers about Authors Bureau, your directory profile, the ABBY Framework, 28 revenue streams, builders, and reader discovery.",
    jsonLd,
  });

  const toggleItem = useCallback((key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openChatbot = () => {
    const btn = document.querySelector("[data-abby-trigger]") as HTMLButtonElement;
    if (btn) btn.click();
  };

  const lq = searchQuery.toLowerCase();
  const filteredCategories = categories.filter((cat) => !lq || faqData[cat.id]?.some((f) => f.q.toLowerCase().includes(lq) || f.a.toLowerCase().includes(lq)));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16" style={{ background: "#1B2A4A" }}>
        <div className="container text-center">
          <h1 className="text-4xl font-bold text-white font-heading">Help Center</h1>
          <p className="mt-2 text-white/70 text-base">Everything you need to know about Authors Bureau</p>

          <div className="mx-auto mt-6 max-w-[560px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

      {!searchQuery && (
        <section className="py-16 bg-background">
          <div className="container max-w-[1200px]">
            <h2 className="text-2xl font-semibold text-center mb-8" style={{ color: "#1B2A4A" }}>Browse by Topic</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
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

      {filteredCategories.map((cat, catIdx) => {
        const Icon = cat.icon;

        if ((cat as any).isArticle) {
          if (lq) return null;
          return (
            <section
              key={cat.id}
              id={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
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
        const filteredItems = lq ? items.filter((f) => f.q.toLowerCase().includes(lq) || f.a.toLowerCase().includes(lq)) : items;

        if (filteredItems.length === 0) return null;

        return (
          <section
            key={cat.id}
            id={cat.id}
            ref={(el) => { sectionRefs.current[cat.id] = el; }}
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
                      <button onClick={() => toggleItem(key)} className="flex w-full items-center gap-3 py-4 text-left">
                        {isOpen ? <ChevronDown size={18} className="shrink-0 text-secondary" /> : <ChevronRight size={18} className="shrink-0 text-muted-foreground" />}
                        <h3 className="text-base font-semibold" style={{ color: "#1B2A4A" }}>{faq.q}</h3>
                      </button>

                      <div className={cn("overflow-hidden transition-all duration-200", isOpen ? "max-h-[2000px] opacity-100 pb-4" : "max-h-0 opacity-0")}>
                        <div className="pl-8 pr-4">
                          <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-muted-foreground/60">Was this helpful?</span>
                            <button onClick={() => setVotes((prev) => ({ ...prev, [voteKey]: "up" }))} className={cn("p-1 rounded transition-colors", votes[voteKey] === "up" ? "text-secondary" : "text-muted-foreground/40 hover:text-secondary")}>
                              <ThumbsUp size={14} />
                            </button>
                            <button onClick={() => setVotes((prev) => ({ ...prev, [voteKey]: "down" }))} className={cn("p-1 rounded transition-colors", votes[voteKey] === "down" ? "text-destructive" : "text-muted-foreground/40 hover:text-destructive")}>
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

      <section className="py-16" style={{ background: "linear-gradient(135deg, #D4A843, #C4922E)" }}>
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white">Still Have Questions?</h2>
          <p className="mt-2 text-white/80 text-base">Our AI assistant Abby is here to help 24/7</p>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/auth?redirect=%2Fdashboard" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-medium transition-transform hover:scale-105" style={{ color: "#D4A843" }}>
              <Sparkles size={18} /> Ask Abby
            </Link>
            <a href="mailto:support@authorsbureau.com?subject=Bug%20Report" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-medium text-white transition-transform hover:scale-105" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Bug size={18} /> Report a Bug
            </a>
            <a href="mailto:support@authorsbureau.com?subject=Feedback" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-medium text-white transition-transform hover:scale-105" style={{ background: "rgba(255,255,255,0.2)" }}>
              <MessageSquare size={18} /> Give Feedback
            </a>
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
