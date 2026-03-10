import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, Globe, Award, Building2, GraduationCap, Mic, MapPin, ChevronLeft, ChevronRight, CheckCircle2, Monitor, Search, Globe2, Play, UserCheck, Calendar, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import BadgeDisplay from "@/components/BadgeDisplay";
import DynamicMeetOurAuthors from "@/components/DynamicMeetOurAuthors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";

import paulinePhoto from "@/assets/pauline-teo-headshot.jpg";
import paulineFullPhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista-headshot.jpg";
import feliciaPhoto from "@/assets/felicia-tan-headshot.png";
import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import hiCover from "@/assets/hemispheric-intelligence-cover.png";
import viWomenCover from "@/assets/value-investing-women-cover.png";
import investBuffettCover from "@/assets/invest-like-buffett-cover.jpg";
import tobabywithlove from "@/assets/to-baby-with-love-cover.png";
import lostandfound from "@/assets/lost-and-found-cover.png";
import giftfromheaven from "@/assets/gift-from-heaven-cover.png";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
  "felicia-tan": feliciaPhoto,
};

const coverMap: Record<string, string> = {
  "be-suckcessful": besuckcessfulCover,
  "hemispheric-intelligence": hiCover,
  "value-investing-for-women": viWomenCover,
  "invest-like-buffett": investBuffettCover,
  "to-baby-with-love": tobabywithlove,
  "lost-and-found": lostandfound,
  "a-gift-from-heaven": giftfromheaven,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function Index() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative flex min-h-[85vh] items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-primary/70" />
        <div className="container relative z-10 py-20 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-3xl"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm text-secondary">
              <BookOpen className="h-4 w-4" />
              The Author Showcase Platform
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mb-6 font-heading text-4xl font-bold leading-tight text-primary-foreground md:text-6xl"
            >
              Where Published Authors Are{" "}
              <span className="text-gradient-gold">Discovered</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mb-10 max-w-xl text-lg text-primary-foreground/70"
            >
              Every author gets a professional showcase. Offer your services, coaching, courses, book speaking engagements, and host book launch events — all from your Authors Bureau.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold shadow-none"
              >
                <Link to="/directory">
                  Browse Authors <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border-2 border-secondary bg-transparent text-secondary hover:bg-secondary hover:text-secondary-foreground text-base font-semibold"
              >
                <Link to="/get-featured">Get Featured</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Meet the Founder */}
      <section id="meet-the-founder" className="py-24">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Photo */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden bg-muted/30 shadow-lg max-h-[560px]">
                <img
                  src={paulineFullPhoto}
                  alt="Pauline Teo — Founder of Authors Bureau"
                  className="w-full h-full object-cover object-top max-h-[560px]"
                />
              </div>
              <div className="absolute top-4 right-4">
                <BadgeDisplay level="ab-verified" size="sm" />
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
                Meet the Founder
              </motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl mb-6">
                Built by an Author, <span className="italic text-secondary">for Authors</span>
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed mb-8">
                Authors Bureau.com was founded by <strong className="text-foreground">Pauline Teo</strong>, an international bestselling author and entrepreneur with over 25 years of experience in Learning & Development. She built this platform because she knows firsthand what authors need to turn their books into thriving businesses.
              </motion.p>

              <div className="space-y-5 mb-8">
                {[
                  {
                    icon: Award,
                    title: "International Bestselling Author",
                    desc: 'Author of "Be SUCKcessful" — Amazon Bestseller in Self-Help, Business Motivation & Personal Finance',
                  },
                  {
                    icon: Building2,
                    title: "Built the Largest Financial Education Company in SG & MY",
                    desc: "Former Executive Director — Led startup to ASX listing (ASX:8I, 2014), oversaw spin-off to second ASX listing (ASX:8VI, 2018)",
                  },
                  {
                    icon: GraduationCap,
                    title: "25+ Years in Learning & Development",
                    desc: "Master of Arts (Instructional Design & Technology), NTU Singapore — Mentored 10,000+ students",
                  },
                  {
                    icon: Mic,
                    title: "Recognized Speaker & Entrepreneur",
                    desc: "Prominent female speaker in the investing sector — Entrepreneur since 2011",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    variants={fadeUp}
                    custom={i + 3}
                    className="flex gap-4 items-start border-b border-border/50 pb-4 last:border-0"
                  >
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
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-secondary" />
                  <span className="font-semibold text-foreground">3</span> Books
                </div>
                <div className="flex items-center gap-1.5">
                  <Mic className="h-4 w-4 text-secondary" />
                  Speaker
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-secondary" />
                  Singapore
                </div>
              </motion.div>

              <motion.div variants={fadeUp} custom={8}>
                <Button
                  asChild
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-none rounded-full"
                >
                  <Link to="/authors/pauline-teo">View Full Profile</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Authors - Dynamic from Database */}
      <DynamicMeetOurAuthors />

      {/* ==================== HOW IT WORKS — 6 Platform Cards ==================== */}
      <section id="how-it-works" className="border-y border-border bg-muted/50 py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Why Authors Bureau
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl">
              One Platform, <span className="italic text-secondary">Everything</span> You Need
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop juggling six different tools. Authors Bureau replaces them all with a single, integrated platform where your book is the center of everything.
            </motion.p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Search, title: "Author Discovery", desc: "Replaces: Amazon Author Central, Goodreads" },
              { icon: Globe2, title: "Book Landing Page", desc: "Replaces: Carrd, Leadpages, WordPress" },
              { icon: Play, title: "Course Offering", desc: "Replaces: Teachable, Kajabi" },
              { icon: UserCheck, title: "Coaching CRM", desc: "Replaces: Calendly + Stripe" },
              { icon: Mic, title: "Speaking Bureau", desc: "Replaces: eSpeakers, SpeakerHub" },
              { icon: Calendar, title: "Event Management", desc: "Replaces: Eventbrite, Meetup" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group rounded-2xl bg-card p-8 shadow-md hover:shadow-lg transition-all duration-300 border border-border/60 hover:border-secondary/30"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 ring-1 ring-secondary/20 group-hover:ring-secondary/40 transition-all">
                  <item.icon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="mb-1 font-heading text-lg font-bold italic">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== STEP 1: FROM AUTHOR TO AUTHORITY ==================== */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16 text-center"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5 text-sm font-semibold text-accent">
              <Sparkles className="h-4 w-4" />
              FREE TIER
            </motion.div>
            <motion.p variants={fadeUp} custom={0.5} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Step 1 · How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl">
              From Author to <span className="italic text-secondary">Authority</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1.5} className="mt-3 text-muted-foreground">
              Everything you need to get discovered — completely free.
            </motion.p>
          </motion.div>

          {/* Get Featured Card */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="mb-16 rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-10 md:p-14 text-primary-foreground text-center shadow-xl"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/20 ring-1 ring-secondary/30">
              <BookOpen className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="font-heading text-2xl md:text-3xl font-bold mb-4">
              Get Featured with a Professional Book Microsite for <span className="text-secondary">FREE</span>
            </h3>
            <p className="text-primary-foreground/70 max-w-2xl mx-auto text-lg leading-relaxed">
              Published authors can apply for a free professional showcase with a dedicated book microsite. Books published through PublishNow.io also receive a verified badge.
            </p>
            <div className="mt-8">
              <Button
                asChild
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-[var(--shadow-gold)] rounded-full px-8"
              >
                <Link to="/auth">
                  Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Your Book, Your Page — Microsite Showcase */}
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
                Your Book, Your Page
              </motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl mb-4">
                Professional Book <span className="italic text-secondary">Microsites</span>
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed mb-8">
                Every listed author gets a dedicated landing page for their book — designed to showcase your Amazon bestseller status, drive purchases, and build your reader community. <strong className="text-foreground">Completely free.</strong>
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
                <Button
                  asChild
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-[var(--shadow-gold)] rounded-full px-8"
                >
                  <Link to="/auth">
                    Get Featured <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Browser Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-destructive/60" />
                    <div className="h-3 w-3 rounded-full bg-secondary/60" />
                    <div className="h-3 w-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="inline-block rounded-full bg-background border border-border px-4 py-1 text-xs text-muted-foreground">
                      authorsbureau.com/books/be-suckcessful
                    </span>
                  </div>
                </div>
                <div className="bg-primary p-8 text-primary-foreground">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img
                      src={besuckcessfulCover}
                      alt="Be SUCKcessful book cover"
                      className="h-40 rounded-lg shadow-2xl object-contain"
                    />
                    <div className="text-center sm:text-left">
                      <h3 className="font-heading text-xl font-bold italic">Be SUCKcessful</h3>
                      <p className="text-sm text-primary-foreground/70 italic">We SUCK Before We SUCCEED</p>
                      <p className="text-xs text-primary-foreground/50 mt-1">by Pauline Teo</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                          ⭐ #1 Best Seller
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                          ⭐ #1 New Release
                        </span>
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
                    <div className="flex-1 rounded-lg bg-secondary py-2.5 text-center text-sm font-semibold text-secondary-foreground">
                      Buy on Amazon
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS — 4 Steps ==================== */}
      <section className="py-24 bg-muted/50 border-y border-border">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl">
              From Book to <span className="italic text-secondary">Business</span> in 4 Steps
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Your book is the foundation. Abby, your AI Business Consultant, helps you build everything else.
            </motion.p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Analyze Your Book", desc: "Upload your manuscript and let Abby, your AI Business Consultant, generate a comprehensive business plan tailored to your book." },
              { step: "2", title: "Build Your Products", desc: "Use our AI-powered studios to instantly create a suite of digital products, from workbooks to online courses, all based on your book's content." },
              { step: "3", title: "Launch Your Microsite", desc: "Activate your professional author microsite, a central hub to showcase your brand, sell your products, and connect with your audience." },
              { step: "4", title: "Grow Your Business", desc: "Use our CRM, revenue dashboard, and marketing tools to grow your audience and build a sustainable author business." },
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
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 ring-1 ring-secondary/20 font-heading text-xl font-bold text-secondary">
                  {item.step}
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
