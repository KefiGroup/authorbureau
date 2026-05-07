import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CopyrightCaption } from "@/components/ui/copyright-caption";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

import staircaseImg from "@/assets/abby_journey_staircase_v6.webp";
import frameworkImg from "@/assets/how_28_revenue_streams_connect_v2.webp";

const FLOW_DIAGRAM_IMAGE = "/images/journey-flow-diagram.webp";
const COMPARISON_IMAGE = "/images/journey-comparison.webp";
const THREE_PATHS_IMAGE = "/images/journey-three-paths.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const accordionData = [
  {
    title: "Workbook vs. Home Study vs. Online Course: What's the Difference?",
    items: [
      { term: "Workbook", desc: "A downloadable PDF exercise book ($19-$47). Think of it like a homework packet." },
      { term: "Home Study", desc: "A self-paced multimedia kit with videos, worksheets, and templates ($97-$497). Think of it like a box set." },
      { term: "Online Course", desc: "A structured learning experience with modules, quizzes, and community ($97-$997). Think of it like a semester of school." },
    ],
  },
  {
    title: "1-on-1 Coaching vs. Group Coaching vs. Mastermind: What's the Difference?",
    items: [
      { term: "1-on-1 Coaching", desc: "Private sessions with one client ($150-$500/hr). Like a personal trainer." },
      { term: "Group Coaching", desc: "One coach, 10-30 students in live group calls ($97-$497/mo). Like a group fitness class." },
      { term: "Mastermind", desc: "A peer group of 5-12 high-achievers who meet regularly ($5K-$25K/yr). Like a private advisory board." },
    ],
  },
  {
    title: "Keynote vs. In-House Speaker vs. Training Program: What's the Difference?",
    items: [
      { term: "In-House Speaker", desc: "A customized presentation for a company's team ($2K-$10K). Like a corporate workshop." },
      { term: "Training Program", desc: "A multi-session skills program for organizations ($5K-$50K). Like a corporate university course." },
    ],
  },
];

const pricingCards = [
  {
    title: "The Side Hustler",
    price: "$49/mo",
    tier: "BRAND",
    streams: "9 Brand Products · 4-8 hrs/week",
    revenue: "Projected: $5,500-$15,500 in Year 1",
    desc: "Create digital products from your book that sell on autopilot while you keep your day job.",
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    badge: null,
  },
  {
    title: "The Serious Author",
    price: "$199/mo",
    tier: "BRAND + BUILD",
    streams: "18 revenue streams · 15-25 hrs/week",
    revenue: "Projected: $19,000-$55,000 in Year 1",
    desc: "Passive income from Brand Products plus active audience building with Build Authority tools.",
    border: "border-orange-500",
    bg: "bg-orange-500/10",
    badge: "MOST POPULAR",
  },
  {
    title: "The Empire Builder",
    price: "$499/mo",
    tier: "BRAND + BUILD + YIELD",
    streams: "All 28 revenue streams · Full-time (leveraged)",
    revenue: "Projected: $68,500-$215,500 in Year 1",
    desc: "Your book is the entry point to a multi-million dollar business with premium Yield Revenue services.",
    border: "border-[hsl(45,50%,54%)]",
    bg: "bg-[hsl(45,50%,54%)]/10",
    badge: "BEST VALUE",
  },
];

export default function HowItWorks() {
  useDocumentMeta({
    title: "How It Works — Authors Bureau | The ABBY Framework",
    description: "See how the ABBY Framework turns your published book into 28 revenue streams across Brand, Build, and Yield phases — guided by your AI Business Advisor.",
    ogTitle: "How It Works — Authors Bureau",
    ogDescription: "See how the ABBY Framework turns your published book into 28 revenue streams — guided by your AI Business Advisor.",
    ogImage: "https://authorsbureau.com/og-image.jpg",
    ogUrl: "https://authorsbureau.com/how-it-works",
    canonical: "https://authorsbureau.com/how-it-works",
    twitterCard: "summary_large_image",
  });

  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-[hsl(228,34%,16%)] text-white py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(228,34%,16%)] via-[hsl(228,34%,12%)] to-[hsl(228,34%,8%)]" />
        <div className="container relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
          >
            One Book. 28 Revenue Streams.{" "}
            <span className="text-[hsl(45,50%,54%)]">Your Empire.</span>
          </motion.h1>
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={1}
            className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto"
          >
            Authors Bureau turns your published book into a complete business, powered by Abby, your AI business advisor.
          </motion.p>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={2}
            className="mt-8"
          >
            <Button asChild size="lg" className="bg-[hsl(45,50%,54%)] hover:bg-[hsl(45,50%,46%)] text-[hsl(228,34%,16%)] font-bold text-base px-8 rounded-xl">
              <Link to="/auth?redirect=%2Fdashboard%3Fsection%3Dbuild-business">Get Your Free Business Plan <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* The Journey - Staircase */}
      <section className="py-20 md:py-28 bg-[hsl(38,60%,96%)]">
        <div className="container max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              From Published Author to Business Owner
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              Most authors earn less than $23,000/year from their books alone (Authors Guild, 2024). Authors Bureau changes that by unlocking 28 revenue streams from a single manuscript, and Abby, your AI advisor, builds everything for you.
            </motion.p>
          </motion.div>
          <motion.img
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            src={frameworkImg} alt="How Your 28 Revenue Streams Connect: Brand, Build, Yield"
            className="w-full rounded-2xl shadow-xl"
            loading="lazy"
          />
          <CopyrightCaption />
        </div>
      </section>

      {/* The B-B-Y Framework */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              The Brand-Build-Yield Framework
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              Your 28 revenue streams are organized into three strategic tiers. Each tier builds on the last: Brand your products, Build your authority, then Yield premium revenue.
            </motion.p>
          </motion.div>
          <motion.img
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            src={staircaseImg} alt="The ABBY Journey Framework: Brand, Build, Yield staircase"
            className="w-full rounded-2xl shadow-xl"
            loading="lazy"
          />
          <CopyrightCaption />

          {/* 28 Revenue Streams Explained */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 space-y-10"
          >
            <div>
              <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1">Brand Products - 9 revenue streams</h3>
              <p className="text-sm text-muted-foreground mb-4">Build your foundation with products that attract, nurture, and monetize readers.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { name: "Email Marketing", desc: "Build and nurture your audience with welcome sequences, campaigns, and follow-up automation." },
                  { name: "Lead Magnets", desc: "Turn reader interest into subscribers with free, valuable downloads tied to your book." },
                  { name: "Social Media", desc: "Create consistent content that keeps your ideas visible and brings readers into your world." },
                  { name: "Website / Microsite", desc: "Give every reader a clear home base for your profile, books, and published offers." },
                  { name: "Webinars", desc: "Use presentations and live sessions to educate your audience and invite the next step." },
                  { name: "Workbook", desc: "Package your core ideas into a practical companion readers can use and share." },
                  { name: "Home Study Course", desc: "Expand your book into a guided self-paced learning experience." },
                  { name: "Special Editions", desc: "Offer premium versions of your book for committed readers and collectors." },
                  { name: "Book Sales", desc: "Create direct sales opportunities through events, campaigns, and your public pages." },
                ].map((s) => (
                  <div key={s.name} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1">Build Authority - 9 revenue streams</h3>
              <p className="text-sm text-muted-foreground mb-4">Scale your reach with premium content, partnerships, and audience growth tools.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { name: "Online Course", desc: "Turn your expertise into a structured teaching product with modules and outcomes." },
                  { name: "Audiobook", desc: "Extend your reach and accessibility with an audio edition of your ideas." },
                  { name: "Membership", desc: "Create recurring value through ongoing content, community, and access." },
                  { name: "Group Coaching", desc: "Lead readers through a shared transformation in a scalable live format." },
                  { name: "Podcast Tour", desc: "Build authority by getting your message in front of aligned audiences." },
                  { name: "Media & PR", desc: "Increase visibility with interviews, press angles, and media positioning." },
                  { name: "Affiliates", desc: "Let partners and advocates help distribute your products and offers." },
                  { name: "Bundles", desc: "Increase customer value by guiding readers to the next best offer." },
                  { name: "JV Partnerships", desc: "Create aligned partnerships where growth and outcomes are shared." },
                ].map((s) => (
                  <div key={s.name} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1">Yield Revenue - 10 revenue streams</h3>
              <p className="text-sm text-muted-foreground mb-4">Unlock premium high-ticket services, events, and long-term business growth.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { name: "1-on-1 Coaching", desc: "Offer personalized transformation through one-on-one client work." },
                  { name: "Big Ticket Consulting", desc: "Solve higher-level business or leadership problems using your expertise." },
                  { name: "Speaking", desc: "Turn your ideas into talks that open doors to stages and partnerships." },
                  { name: "Corporate Training", desc: "Deliver structured programs for organizations that want implementation." },
                  { name: "Mastermind", desc: "Create premium peer groups around your methodology and guidance." },
                  { name: "Retreats", desc: "Design immersive experiences that deepen trust and create transformation." },
                  { name: "Certification", desc: "License your framework so others can teach or use it." },
                  { name: "Conference", desc: "Host larger events that expand your authority and create income layers." },
                  { name: "Fundraising", desc: "Use your message to mobilize mission-aligned supporters." },
                  { name: "Sponsors", desc: "Create strategic event and partnership revenue beyond direct sales." },
                ].map((s) => (
                  <div key={s.name} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Everything Connects + Frameworks */}
      <section className="py-20 md:py-28 bg-[hsl(38,60%,96%)]">
        <div className="container max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-6">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Everything Connects. Everything Flows.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              When you build a course, Abby automatically creates the email sequence to sell it, the social media posts to promote it, and the sales page to convert visitors. Every product feeds into the next.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="mt-14 rounded-2xl border border-border bg-card p-8 md:p-10 shadow-lg"
          >
            <motion.h3 variants={fadeUp} custom={0} className="font-heading text-2xl md:text-3xl font-bold text-foreground text-center">
              The Frameworks Behind Abby
            </motion.h3>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mt-3 max-w-2xl mx-auto text-center text-sm">
              Abby's recommendations are not AI guesswork. They are grounded in frameworks from McKinsey, Harvard, the International Coaching Federation, and the world's leading pricing and marketing strategists.
            </motion.p>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mt-8">
              {[
                { icon: "💼", title: "Business Strategy", frameworks: ["McKinsey SCQ", "Lean Startup", "Business Maturity Model"] },
                { icon: "🎓", title: "Learning Design", frameworks: ["Bloom's Taxonomy", "Kolb's Cycle", "ADDIE Model"] },
                { icon: "📊", title: "Pricing", frameworks: ["Value Ladder", "Market Benchmarks", "Price Psychology"] },
                { icon: "📣", title: "Marketing", frameworks: ["Know-Like-Trust-Buy", "Content Pillars", "Webinar Model"] },
                { icon: "🎤", title: "Coaching & Speaking", frameworks: ["GROW Model (ICF)", "Signature Talk", "Mastermind Principle"] },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i}
                  className="rounded-xl border border-border bg-background p-5 shadow-sm hover:shadow-md transition-shadow text-center"
                >
                  <span className="text-2xl">{card.icon}</span>
                  <h4 className="font-heading font-semibold text-sm text-foreground mt-2 mb-2">{card.title}</h4>
                  <ul className="space-y-1">
                    {card.frameworks.map(fw => (
                      <li key={fw} className="text-xs text-muted-foreground">{fw}</li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-6">
              <Link to="/methodology" className="text-sm font-medium text-[hsl(45,50%,40%)] hover:underline">
                Read the full methodology →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What Authors Are Confused About */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              What Authors Are Confused About
            </motion.h2>
          </motion.div>

          <motion.img
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            src={COMPARISON_IMAGE} alt="Product comparison guide"
            className="w-full rounded-2xl shadow-xl mb-2"
            loading="lazy"
          />
          <CopyrightCaption className="mb-10" />

          <div className="space-y-3 max-w-3xl mx-auto">
            {accordionData.map((acc, ai) => (
              <div key={ai} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenAccordion(openAccordion === ai ? null : ai)}
                  className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>{acc.title}</span>
                  {openAccordion === ai ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {openAccordion === ai && (
                  <div className="px-5 pb-4 space-y-2">
                    {acc.items.map((item, ii) => (
                      <div key={ii} className="text-sm">
                        <span className="font-semibold text-foreground">{item.term}:</span>{" "}
                        <span className="text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 bg-[hsl(228,34%,16%)] text-white">
        <div className="container text-center max-w-2xl mx-auto">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="font-heading text-3xl md:text-4xl font-bold"
          >
            Your Book Deserves More Than Royalties
          </motion.h2>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={1}
            className="mt-8"
          >
            <Button asChild size="lg" className="bg-[hsl(45,50%,54%)] hover:bg-[hsl(45,50%,46%)] text-[hsl(228,34%,16%)] font-bold text-lg px-10 py-6 rounded-xl">
              <Link to="/auth?redirect=%2Fdashboard%3Fsection%3Dbuild-business">Get Your Free Business Plan <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </motion.div>
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={2}
            className="mt-4 text-sm text-white/50"
          >
            No credit card required. Upload your book and let Abby show you what's possible.
          </motion.p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
