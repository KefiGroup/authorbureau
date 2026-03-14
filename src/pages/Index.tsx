import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BookOpen, Users, Globe, Award, Building2, GraduationCap,
  Mic, MapPin, CheckCircle2, Sparkles, ChevronDown, Zap, TrendingUp,
  Star, Shield, Pen, Rocket, DollarSign, BookHeart, Library,
  Video, MessageSquare, Calendar, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import DynamicMeetOurAuthors from "@/components/DynamicMeetOurAuthors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import paulineFullPhoto from "@/assets/pauline-teo.jpeg";
import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import { getPublishNowAuthUrl } from "@/lib/publishnow-auth";

const SIGNUP_URL = getPublishNowAuthUrl("/dashboard");

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Authors Bureau",
  applicationCategory: "BusinessApplication",
  description:
    "AI-powered platform that helps published authors turn one book into 28 revenue streams with courses, coaching, speaking, memberships, and more.",
  offers: [
    { "@type": "Offer", name: "Side Hustler", price: "49", priceCurrency: "USD" },
    { "@type": "Offer", name: "Serious Business", price: "199", priceCurrency: "USD" },
    { "@type": "Offer", name: "Enterprise Builder", price: "499", priceCurrency: "USD" },
  ],
  creator: {
    "@type": "Person",
    name: "Pauline Teo",
    jobTitle: "Founder",
    url: "https://authorsbureau.com",
  },
};

export default function Index() {
  const { data: stats } = useQuery({
    queryKey: ["homepage-stats"],
    queryFn: async () => {
      const [authorsRes, booksRes, readersRes] = await Promise.all([
        supabase.from("author_profiles").select("id", { count: "exact", head: true }),
        supabase.from("books").select("id", { count: "exact", head: true }).not("published_at", "is", null),
        supabase.from("reading_club_members").select("id", { count: "exact", head: true }),
      ]);
      return {
        authors: authorsRes.count ?? 0,
        books: booksRes.count ?? 0,
        readers: readersRes.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatStat = (n: number) => (n > 10 ? `${n}+` : "Growing");

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* ===== HERO: AUDIENCE SPLIT ===== */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden" style={{ background: "#0B1D3A" }}>
        {/* Subtle sparkle dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#C5A55A]/30"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ opacity: [0.1, 0.6, 0.1], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>

        <div className="container relative z-10 py-16 md:py-20">
          {/* Top: Headline */}
          <motion.div initial="hidden" animate="visible" className="text-center mb-12 md:mb-16">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4"
            >
              One Book. <span style={{ color: "#C5A55A" }}>Infinite Possibilities.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-white/80 text-lg md:text-xl max-w-[700px] mx-auto leading-relaxed"
            >
              The world's first AI-powered platform that helps authors monetize their books
              and readers access transformative content.
            </motion.p>
          </motion.div>

          {/* Bottom: Two Cards */}
          <motion.div initial="hidden" animate="visible" className="grid md:grid-cols-2 gap-6 max-w-[1000px] mx-auto">
            {/* Author Card */}
            <motion.div
              variants={fadeUp}
              custom={2}
              className="bg-background rounded-[20px] p-8 md:p-10 border-t-4 shadow-[0_20px_60px_rgba(0,0,0,0.15)] hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(0,0,0,0.2)] transition-all duration-300"
              style={{ borderTopColor: "#C5A55A" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(197,165,90,0.12)" }}>
                  <Pen className="h-6 w-6" style={{ color: "#C5A55A" }} />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground">I'm an Author</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Turn your book into a business with 28 revenue streams
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "AI-powered writing & publishing studio",
                  "28 revenue stream builders (courses, coaching, memberships...)",
                  "Your own branded author page & sales pages",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#C5A55A" }} />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="w-full font-semibold text-base py-5 rounded-xl" style={{ backgroundColor: "#C5A55A", color: "#0B1D3A" }}>
                <Link to={SIGNUP_URL}>
                  Start Building Your Empire <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground/60 mt-3">
                Free to start · No credit card required
              </p>
            </motion.div>

            {/* Reader Card */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="bg-background rounded-[20px] p-8 md:p-10 border-t-4 shadow-[0_20px_60px_rgba(0,0,0,0.15)] hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(0,0,0,0.2)] transition-all duration-300"
              style={{ borderTopColor: "#4A9E8E" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(74,158,142,0.12)" }}>
                  <BookOpen className="h-6 w-6" style={{ color: "#4A9E8E" }} />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground">I'm a Reader</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Access courses, coaching, and communities from world-class authors
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Buy books and take author-created courses",
                  "Join coaching programs & exclusive memberships",
                  "Track your reading with the 100-Day Challenge",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#4A9E8E" }} />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="w-full font-semibold text-base py-5 rounded-xl text-white" style={{ backgroundColor: "#4A9E8E" }}>
                <Link to="/reading-club">
                  Explore as a Reader <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground/60 mt-3">
                Browse 1000+ authors · Free to join
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 1: HOW IT WORKS SUMMARY ===== */}
      <section className="py-20 bg-background">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-14">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl font-bold md:text-4xl mb-4">
              How It Works
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps from book to business
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", icon: BookOpen, title: "Write Your Book", desc: "Use our AI Writing Studio to go from idea to published book in days, not months.", color: "#C5A55A" },
              { step: "2", icon: Rocket, title: "Build Your Empire", desc: "ABBY, your AI consultant, creates a personalized business plan with 28 revenue streams.", color: "#6366F1" },
              { step: "3", icon: DollarSign, title: "Earn & Grow", desc: "Readers buy your books, courses, coaching, and memberships from your branded pages.", color: "#4A9E8E" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="text-center space-y-4"
              >
                <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon className="h-7 w-7" style={{ color: item.color }} />
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Step {item.step}
                </div>
                <h3 className="font-heading text-xl font-bold">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-center mt-12">
            <Link to="/how-it-works" className="text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors inline-flex items-center gap-1">
              See How It Works <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 2: ABBY JOURNEY FRAMEWORK ===== */}
      <section className="py-20" style={{ backgroundColor: "#FDF6EC" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              The ABBY Journey Framework
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl mb-4">
              One Book. 28 Revenue Streams. <span className="text-gradient-gold">Your Empire.</span>
            </motion.h2>
          </motion.div>

          <motion.img
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            src="/images/journey-staircase.webp"
            alt="The ABBY Journey Framework — FREE to BUILD to BRIDGE to YIELD"
            className="w-full max-w-[900px] mx-auto rounded-2xl shadow-xl mb-12"
            loading="lazy"
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10"
          >
            {[
              { label: "BUILD", value: "8", sub: "Revenue Streams", color: "#C5A55A" },
              { label: "BRIDGE", value: "8", sub: "Revenue Streams", color: "#6366F1" },
              { label: "YIELD", value: "12", sub: "Revenue Streams", color: "#4A9E8E" },
              { label: "Total", value: "$68K-$215K", sub: "Projected Annual Revenue", color: "#C5A55A" },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i} className="bg-background rounded-xl p-4 text-center shadow-sm border border-border">
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: stat.color }}>{stat.label}</p>
                <p className="text-2xl font-heading font-bold">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full px-8">
              <Link to={SIGNUP_URL}>Start Your Journey <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground max-w-3xl mx-auto">
            * Projected revenue based on industry benchmarks from Teachable, Udemy, ICF Coach, National Speakers Association, and mastermind.com reports.
            Individual results vary based on book topic, audience size, and effort invested.
          </p>
        </div>
      </section>

      {/* ===== SECTION 3: FEATURED AUTHORS ===== */}
      <DynamicMeetOurAuthors />

      {/* ===== SECTION 4: READING CLUB TEASER ===== */}
      <section className="py-20" style={{ background: "#0B1D3A" }}>
        <div className="container text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-[#4A9E8E] font-semibold mb-6">
              <BookHeart className="h-4 w-4" />
              For Readers
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl text-white mb-4">
              The 100-Day Reading Challenge
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-white/80 text-lg max-w-2xl mx-auto mb-10">
              Pick any book. Commit to 2 minutes a day. We'll be your accountability partner.
            </motion.p>

            {/* Mini preview cards */}
            <motion.div variants={fadeUp} custom={3} className="flex justify-center gap-4 flex-wrap mb-10">
              {[
                { label: "Track Progress", icon: TrendingUp },
                { label: "Join Community", icon: Users },
                { label: "Earn Badges", icon: Trophy },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
                  <f.icon className="h-4 w-4 text-[#4A9E8E]" />
                  <span className="text-sm text-white/80 font-medium">{f.label}</span>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} custom={4}>
              <Button asChild size="lg" className="rounded-full text-white font-semibold px-8" style={{ backgroundColor: "#4A9E8E" }}>
                <Link to="/reading-club">Join the Challenge <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 5: AUTHORS vs READERS COMPARISON ===== */}
      <section className="py-20 bg-background">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-14">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl font-bold md:text-4xl mb-4">
              Two Portals. One Platform.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Whether you create content or consume it, Authors Bureau has a home for you.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Authors Portal */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
              className="rounded-2xl border border-border bg-card p-8 space-y-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(197,165,90,0.12)" }}>
                  <Rocket className="h-5 w-5" style={{ color: "#C5A55A" }} />
                </div>
                <h3 className="font-heading text-xl font-bold">Authors Portal</h3>
              </div>
              {[
                "AI Writing Studio",
                "AI Publishing Studio",
                "28 Revenue Stream Builders",
                "Branded Author Pages",
                "Sales Analytics Dashboard",
                "ABBY AI Business Consultant",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#C5A55A" }} />
                  {item}
                </div>
              ))}
              <Button asChild className="w-full mt-4 font-semibold rounded-xl" style={{ backgroundColor: "#C5A55A", color: "#0B1D3A" }}>
                <Link to={SIGNUP_URL}>Start as an Author <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>

            {/* Readers Portal */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              className="rounded-2xl border border-border bg-card p-8 space-y-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(74,158,142,0.12)" }}>
                  <GraduationCap className="h-5 w-5" style={{ color: "#4A9E8E" }} />
                </div>
                <h3 className="font-heading text-xl font-bold">Readers Portal</h3>
              </div>
              {[
                "My Library (purchased books)",
                "My Courses (enrolled courses with progress)",
                "My Coaching (booked sessions)",
                "My Memberships (active communities)",
                "My Events (webinars, workshops, retreats)",
                "100-Day Reading Challenge",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#4A9E8E" }} />
                  {item}
                </div>
              ))}
              <Button asChild className="w-full mt-4 font-semibold rounded-xl text-white" style={{ backgroundColor: "#4A9E8E" }}>
                <Link to="/reading-club">Join as a Reader <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 6: SOCIAL PROOF / STATS ===== */}
      <section className="py-16" style={{ backgroundColor: "#FDF6EC" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { stat: "Growing", label: "Authors" },
              { stat: "Growing", label: "Books Published" },
              { stat: "28", label: "Revenue Streams" },
              { stat: "Growing", label: "Readers" },
            ].map((item, i) => (
              <motion.div key={item.label} variants={fadeUp} custom={i} className="py-6">
                <p className="text-3xl md:text-4xl font-heading font-bold text-secondary">{item.stat}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 7: FINAL CTA ===== */}
      <section className="relative py-24 overflow-hidden" style={{ background: "#0B1D3A" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, backgroundColor: "#C5A55A", opacity: 0.2 }}
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 4, repeat: Infinity, delay: Math.random() * 3 }}
            />
          ))}
        </div>
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl font-bold md:text-5xl text-white mb-6">
              Your Book Deserves More Than <span style={{ color: "#C5A55A" }}>Just a Shelf</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
              Whether you're writing your first chapter or monetizing your tenth book, Authors Bureau is your home.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="rounded-full font-semibold text-base px-8" style={{ backgroundColor: "#C5A55A", color: "#0B1D3A" }}>
                <Link to={SIGNUP_URL}>I'm an Author - Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" className="rounded-full font-semibold text-base px-8 text-white" style={{ backgroundColor: "#4A9E8E" }}>
                <Link to="/reading-club">I'm a Reader - Explore <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
