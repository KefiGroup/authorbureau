import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, BookOpen, Users, Globe, Award, Building2, GraduationCap,
  Mic, MapPin, CheckCircle2, Sparkles, ChevronDown, Zap, TrendingUp,
  Star, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import DynamicMeetOurAuthors from "@/components/DynamicMeetOurAuthors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";
import paulineFullPhoto from "@/assets/pauline-teo.jpeg";
import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import { getPublishNowAuthUrl } from "@/lib/publishnow-auth";
import MethodologyTrustBadge from "@/components/MethodologyTrustBadge";

const SIGNUP_URL = "/auth";
const getPlanUrl = (_plan: string) => "/pricing";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const comparisonRows = [
  { need: "Online Course", without: "Teachable ($149/mo) + you write it", withAB: "Abby creates it from your book" },
  { need: "Email Marketing", without: "ConvertKit ($79/mo) + you write emails", withAB: "Abby writes your 7-email sequence" },
  { need: "Coaching Setup", without: "Calendly + Stripe + you price it", withAB: "Abby designs your coaching packages" },
  { need: "Author Website", without: "WordPress ($30/mo) + you build it", withAB: "Abby builds your microsite" },
  { need: "Social Media", without: "Buffer ($15/mo) + you create content", withAB: "Abby generates 90-day content calendar" },
  { need: "Speaking Kit", without: "You create your own pitch deck", withAB: "Abby writes your keynote proposal" },
  { need: "Total Cost", without: "$273+/mo + 40hrs/wk of your time", withAB: "From $49/mo + Abby does the work" },
];

const pricingPaths = [
  {
    name: "Brand Package",
    price: "$49",
    tagline: "Build passive income while keeping your day job",
    streams: 9,
    category: "BRAND",
    time: "4–8 hours/week",
    year1: "$5,500–$15,500/year",
    roi: "9x–26x return",
    cta: "Start Building →",
    badge: null,
    accent: false,
    planKey: "starter",
  },
  {
    name: "Build Package",
    price: "$99",
    tagline: "Turn your book into a real business",
    streams: 18,
    category: "BRAND + BUILD",
    time: "15–25 hours/week",
    year1: "$13,500–$39,500/year",
    roi: "6x–16x return",
    cta: "Build My Authority →",
    badge: "MOST POPULAR",
    accent: true,
    planKey: "pro",
  },
  {
    name: "Yield Package",
    price: "$249",
    tagline: "Build an empire around your expertise",
    streams: 28,
    category: "BRAND + BUILD + YIELD",
    time: "Full-time (leveraged)",
    year1: "$68,500–$215,500/year",
    roi: "23x–72x return",
    cta: "Unlock Full Platform →",
    badge: "BEST VALUE",
    accent: false,
    planKey: "enterprise",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Authors Bureau",
  applicationCategory: "BusinessApplication",
  description:
    "AI-powered platform that helps published authors turn one book into 28 revenue streams with courses, coaching, speaking, memberships, and more.",
  offers: [
    { "@type": "Offer", name: "Brand Package", price: "49", priceCurrency: "USD" },
    { "@type": "Offer", name: "Build Package", price: "99", priceCurrency: "USD" },
    { "@type": "Offer", name: "Yield Package", price: "249", priceCurrency: "USD" },
  ],
  creator: {
    "@type": "Person",
    name: "Pauline Teo",
    jobTitle: "Founder",
    url: "https://authorsbureau.com",
  },
};

export default function Index() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* ===== SECTION 1: HERO ===== */}
      <section
        className="relative flex min-h-[90vh] items-center justify-center overflow-hidden"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-primary/80" />
        <div className="container relative z-10 py-20 text-center">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-4xl">
            <motion.div variants={fadeUp} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm text-secondary">
              <Sparkles className="h-4 w-4" />
              🚀 The #1 AI-Powered Author Monetization Platform
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mb-6 font-heading text-4xl font-bold leading-tight text-primary-foreground md:text-6xl lg:text-7xl"
            >
              Turn Your Book Into{" "}
              <span className="text-gradient-gold">28 Revenue Streams</span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="mb-3 font-heading text-xl text-primary-foreground/90 md:text-2xl">
              Your book is more than a product. It's the foundation of a business empire.
            </motion.p>

            <motion.p variants={fadeUp} custom={2.5} className="mx-auto mb-4 max-w-2xl text-lg text-primary-foreground/70">
              Stop earning just royalties. Authors Bureau uses AI to transform your manuscript into courses, coaching packages, speaking kits, memberships, and 24 more income streams, automatically. No business experience needed.
            </motion.p>

            <motion.p variants={fadeUp} custom={3} className="mb-8 text-sm text-secondary font-semibold">
              Abby, your AI Business Consultant, builds everything for you.
            </motion.p>

            <motion.div variants={fadeUp} custom={3.5} className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold shadow-[var(--shadow-gold)] rounded-full px-8">
                <Link to="/auth">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" className="border-2 border-secondary/60 bg-transparent text-secondary hover:bg-secondary hover:text-secondary-foreground text-base font-semibold rounded-full px-8">
                <a href="#how-it-works">See How It Works ↓</a>
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/60">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-secondary" /> 28 Revenue Streams</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-secondary" /> AI-Powered</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-secondary" /> Free to Start</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-secondary" /> Built by a Bestselling Author</span>
            </motion.div>
            <motion.div variants={fadeUp} custom={4.5} className="mt-4">
              <Link to="/auth" className="text-sm text-primary-foreground/50 hover:text-secondary transition-colors underline">
                Already have an account? Sign in →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mx-auto max-w-3xl text-center">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-destructive">
              The Reality
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl mb-6">
              97% of Authors Earn Less Than{" "}
              <span className="text-destructive">$1,000 a Year</span> From Their Book
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed mb-6">
              Most authors spend years writing their book, only to discover that royalties barely cover the cost of publishing.
              The average self-published author earns just $1,000–$5,000 per year from book sales.
            </motion.p>
            <motion.p variants={fadeUp} custom={3} className="text-lg text-muted-foreground leading-relaxed mb-8">
              But the top 3% of authors? They don't rely on royalties. They build businesses around their books with courses, coaching, speaking, and memberships, earning{" "}
              <strong className="text-foreground">$50,000 to $500,000+ per year</strong> from the same book.
            </motion.p>
            <motion.p variants={fadeUp} custom={4} className="text-xl font-heading font-bold text-secondary">
              Authors Bureau was built to make you part of that top 3%.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ===== WHY AUTHORS BUREAU — Comparison Table ===== */}
      <section className="py-24 bg-muted/50 border-y border-border">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-16 text-center">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Why Authors Bureau
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl mb-4">
              One Platform <span className="text-gradient-gold">Replaces Everything</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Other platforms make you do the work. Authors Bureau does it for you.
              Abby reads your book, researches your market, and builds your entire business: courses, coaching packages, email sequences, sales pages, and more. You just review and publish.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-heading font-bold text-sm">What You Need</th>
                  <th className="text-left py-4 px-4 font-heading font-bold text-sm text-destructive">Without Authors Bureau</th>
                  <th className="text-left py-4 px-4 font-heading font-bold text-sm text-secondary">With Authors Bureau</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.need} className={`border-b border-border/50 ${i === comparisonRows.length - 1 ? "font-semibold bg-muted/50" : ""}`}>
                    <td className="py-3.5 px-4 text-sm font-medium">{row.need}</td>
                    <td className="py-3.5 px-4 text-sm text-muted-foreground">{row.without}</td>
                    <td className="py-3.5 px-4 text-sm text-secondary font-medium">{row.withAB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="mt-10 text-center">
            <Button asChild variant="outline" size="lg" className="rounded-full border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
              <Link to="/how-it-works">See All 28 Revenue Streams <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-muted/50 border-y border-border">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-16 text-center">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Your Monetization Universe
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl mb-4">
              One Book. 28 Revenue Streams.{" "}
              <span className="text-gradient-gold">Your Empire.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              Every non-fiction book contains enough expertise to power 28 different income streams.
              Most authors never discover them. Abby, your AI Business Consultant, finds all 28 and builds them for you automatically.
            </motion.p>
          </motion.div>

          {/* Flow Diagram Infographic */}
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            src="/images/journey-flow-diagram.webp"
            alt="How your 28 revenue streams connect — BRAND, BUILD, YIELD ecosystem"
            className="w-full max-w-4xl mx-auto rounded-2xl shadow-xl mb-10"
            loading="lazy"
          />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-center">
            <Button asChild variant="outline" size="lg" className="rounded-full border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
              <Link to="/how-it-works">Explore All 28 Revenue Streams <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 4: MEET THE FOUNDER ===== */}
      <section id="meet-the-founder" className="py-24">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="relative">
              <div className="rounded-2xl overflow-hidden bg-muted/30 shadow-lg max-h-[560px]">
                <img src={paulineFullPhoto} alt="Pauline Teo, Founder of Authors Bureau, international bestselling author and author monetization expert" className="w-full h-full object-cover object-top max-h-[560px]" loading="lazy" />
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
                Meet the Founder
              </motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl mb-6">
                Built by an Author, <span className="italic text-secondary">for Authors</span>
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed mb-8">
                Pauline built Authors Bureau because she knows firsthand that a book is just the beginning.
                The real business starts after you publish.
              </motion.p>

              <div className="space-y-5 mb-8">
                {[
                  { icon: Award, title: "International Bestselling Author", desc: 'Author of "Be SUCKcessful," Amazon Bestseller in Self-Help, Business Motivation & Personal Finance' },
                  { icon: Building2, title: "Built the Largest Financial Education Company in SG & MY", desc: "Former Executive Director. Led startup to ASX listing (ASX:8I, 2014), oversaw spin-off to second ASX listing (ASX:8VI, 2018)" },
                  { icon: GraduationCap, title: "25+ Years in Learning & Development", desc: "Master of Arts (Instructional Design & Technology), NTU Singapore. Mentored 10,000+ students" },
                  { icon: Mic, title: "Recognized Speaker & Entrepreneur", desc: "Prominent female speaker in the investing sector. Entrepreneur since 2011" },
                ].map((item, i) => (
                  <motion.div key={item.title} variants={fadeUp} custom={i + 3} className="flex gap-4 items-start border-b border-border/50 pb-4 last:border-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-sm italic">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeUp} custom={7} className="flex items-center gap-5 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-secondary" /><span className="font-semibold text-foreground">3</span> Books</div>
                <div className="flex items-center gap-1.5"><Mic className="h-4 w-4 text-secondary" />Speaker</div>
                <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-secondary" />Singapore</div>
              </motion.div>

              <motion.div variants={fadeUp} custom={8}>
                <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-none rounded-full">
                  <Link to="/authors/pauline-teo">View Full Profile</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 5: FEATURED AUTHORS ===== */}
      <DynamicMeetOurAuthors />

      {/* ===== SECTION 6: FREE TIER — BOOK PAGE SHOWCASE ===== */}
      <section className="py-24">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeUp} custom={0} className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5 text-sm font-semibold text-accent">
                <Sparkles className="h-4 w-4" />
                ABBY AI ANALYSIS
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl mb-4">
                Professional Book <span className="italic text-secondary">Pages</span>
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed mb-4">
                Every author starts here, free. Your professional book page is your foundation for everything that follows.
              </motion.p>
              <motion.p variants={fadeUp} custom={2.5} className="text-muted-foreground leading-relaxed mb-8">
                Every listed author gets a dedicated landing page for their book — designed to showcase your Amazon bestseller status, drive purchases, and build your reader community.
              </motion.p>

              <div className="space-y-4 mb-8">
                {[
                  "Amazon Bestseller badge & rankings showcase",
                  "Book details, chapters & reader reviews",
                  "Author bio with credentials & social links",
                  "Direct Amazon & retailer purchase links",
                ].map((item, i) => (
                  <motion.div key={item} variants={fadeUp} custom={i + 3} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-secondary" />
                    <span className="text-muted-foreground">{item}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeUp} custom={10}>
                <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-[var(--shadow-gold)] rounded-full px-8">
                  <Link to="/auth">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Browser Mockup */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}>
              <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-destructive/60" />
                    <div className="h-3 w-3 rounded-full bg-secondary/60" />
                    <div className="h-3 w-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="inline-block rounded-full bg-background border border-border px-4 py-1 text-xs text-muted-foreground">
                      authorsbureau.com/paulineteo/be-suckcessful
                    </span>
                  </div>
                </div>
                <div className="bg-primary p-8 text-primary-foreground">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img src={besuckcessfulCover} alt="Be SUCKcessful book cover — author monetization platform showcase" className="h-40 rounded-lg shadow-2xl object-contain" loading="lazy" />
                    <div className="text-center sm:text-left">
                      <h3 className="font-heading text-xl font-bold italic">Be SUCKcessful</h3>
                      <p className="text-sm text-primary-foreground/70 italic">We SUCK Before We SUCCEED</p>
                      <p className="text-xs text-primary-foreground/50 mt-1">by Pauline Teo</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-semibold text-secondary">⭐ #1 Best Seller</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-semibold text-secondary">⭐ #1 New Release</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-heading text-sm font-bold mb-2">About This Book</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    A raw, honest guide to embracing failure as the foundation for success. Pauline Teo shares her journey from setbacks to building a publicly listed company.
                  </p>
                  <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> 248 pages</span>
                    <span>Self-Help</span>
                    <span>⭐ 4.8/5</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg bg-secondary py-2.5 text-center text-sm font-semibold text-secondary-foreground">Buy on Amazon</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 7: HOW IT WORKS + Staircase Infographic ===== */}
      <section id="how-it-works" className="py-24 bg-muted/50 border-y border-border">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-16 text-center">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl">
              From Author to <span className="italic text-secondary">Authority</span> in 4 Steps
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Your book is the foundation. Abby does the rest. Here's how your journey unfolds:
            </motion.p>
          </motion.div>

          {/* Staircase Infographic */}
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            src="/images/journey-staircase.webp"
            alt="The ABBY Journey Framework — FREE to BRAND to BUILD to YIELD"
            className="w-full max-w-5xl mx-auto rounded-2xl shadow-xl mb-12"
            loading="lazy"
          />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Upload Your Book",
                tag: "ABBY AI ANALYSIS",
                desc: "Upload your manuscript and Abby analyzes your book, identifies your frameworks, and creates a personalized business plan showing which of the 28 revenue streams are the best fit for your topic and audience.",
              },
              {
                step: "2",
                title: "BUILD Your Products",
                tag: "BRAND PRODUCTS",
                desc: "Abby uses AI to create your first digital products: workbooks, online courses, email sequences, social media calendars, and your author website. All generated from your book content. You just review and approve.",
              },
              {
                step: "3",
                title: "SCALE Your Authority",
                tag: "BUILD AUTHORITY",
                desc: "Expand into audience-building channels: audiobooks, podcast tours, group coaching, affiliate programs, and media outreach. Abby creates everything including scripts, pitch kits, and follow-up sequences.",
              },
              {
                step: "4",
                title: "YIELD Your Empire",
                tag: "YIELD REVENUE",
                desc: "Scale into premium offerings: 1-on-1 coaching, consulting, masterminds, keynote speaking, training programs, retreats, certification programs, and more.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group rounded-2xl bg-card p-7 shadow-md hover:shadow-lg transition-all duration-300 border border-border/60 hover:border-secondary/30 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 ring-1 ring-secondary/20 font-heading text-xl font-bold text-secondary">
                    {item.step}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {item.tag}
                  </span>
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 11: TESTIMONIALS ===== */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="text-center mb-10">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary">
              Author Success Stories
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-2xl font-bold md:text-3xl">
              What Authors Are Saying
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "I went from earning $200/month in royalties to $4,500/month in course sales — all because Abby built my course from my manuscript in 2 hours.",
                name: "Sarah Chen",
                title: 'Author of "The Mindful Leader"',
              },
              {
                quote: "Within 3 weeks of joining, I had a full coaching programme, a lead magnet, and a webinar funnel. Abby did all the heavy lifting — I just reviewed and published.",
                name: "David Okonkwo",
                title: 'Author of "Resilient Teams"',
              },
              {
                quote: "I've been sitting on my manuscript for years not knowing how to monetise it. Authors Bureau showed me 28 ways and built half of them for me automatically.",
                name: "Maria Gonzalez",
                title: 'Author of "The Empathy Advantage"',
              },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <blockquote className="italic text-primary-foreground/80 text-sm leading-relaxed mb-4">
                  "{t.quote}"
                </blockquote>
                <p className="text-sm font-semibold text-primary-foreground">{t.name}</p>
                <p className="text-xs text-primary-foreground/50">{t.title}</p>
              </div>
            ))}
          </motion.div>

          <p className="text-center text-xs text-primary-foreground/30 mt-6">* Placeholder testimonials — real stories coming soon</p>
        </div>
      </section>

      {/* ===== SECTION 11b: PRICING PREVIEW ===== */}
      <section id="pricing" className="py-24 bg-muted/50 border-y border-border">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Simple Pricing
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl mb-4">
              Choose Your <span className="text-gradient-gold">Growth Path</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free with your ABBY consultation, then pick the plan that matches your ambition.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPaths.map((plan, i) => (
              <div
                key={plan.planKey}
                className={`relative rounded-2xl border p-6 bg-card flex flex-col ${
                  plan.accent ? "border-secondary shadow-lg ring-1 ring-secondary/20" : "border-border"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-widest bg-secondary text-secondary-foreground px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-heading text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <div className="space-y-2 mb-6 flex-1">
                  <p className="text-xs text-muted-foreground"><strong>{plan.streams}</strong> revenue streams</p>
                  <p className="text-xs text-muted-foreground">Year 1 potential: <strong className="text-foreground">{plan.year1}</strong></p>
                  <p className="text-xs text-secondary font-medium">{plan.roi}</p>
                </div>
                <Button
                  asChild
                  className={`w-full rounded-full ${plan.accent ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}`}
                >
                  <Link to="/pricing">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-center mt-8">
            <Button asChild variant="link" className="text-sm">
              <Link to="/pricing">Compare all features →</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 12: FINAL CTA ===== */}
      <section className="relative py-24 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl font-bold md:text-5xl text-primary-foreground mb-6">
              Your Book Deserves More Than{" "}
              <span className="text-gradient-gold">Royalties</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-primary-foreground/70 max-w-2xl mx-auto mb-10">
              Every day you wait is revenue you're leaving on the table. Upload your book, let Abby build your business,
              and start earning from all 28 revenue streams, not just one.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold shadow-[var(--shadow-gold)] rounded-full px-8">
                <Link to="/auth">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" className="border-2 border-secondary/60 bg-transparent text-secondary hover:bg-secondary hover:text-secondary-foreground text-base font-semibold rounded-full px-8">
                <Link to="/pricing">See Pricing Plans →</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
