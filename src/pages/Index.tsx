import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, Globe, Award, Building2, GraduationCap, Mic, MapPin, ChevronLeft, ChevronRight, CheckCircle2, Monitor } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import { authors } from "@/data/authors";
import BadgeDisplay from "@/components/BadgeDisplay";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";

import paulinePhoto from "@/assets/pauline-teo-headshot.jpg";
import paulineFullPhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista-headshot.jpg";
import feliciaPhoto from "@/assets/felicia-tan.png";
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
                <Link to="/join">Get Featured</Link>
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
              <div className="rounded-2xl overflow-hidden bg-muted/30 shadow-lg">
                <img
                  src={paulineFullPhoto}
                  alt="Pauline Teo — Founder of Authors Bureau"
                  className="w-full object-cover"
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
                AuthorsBureau.com was founded by <strong className="text-foreground">Pauline Teo</strong>, an international bestselling author and entrepreneur with over 25 years of experience in Learning & Development. She built this platform because she knows firsthand what authors need to turn their books into thriving businesses.
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
                    desc: "Masters in Instructional Design & Technology, NTU Singapore — Mentored 10,000+ students",
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

      {/* Featured Authors */}
      <section id="featured-authors" className="py-24" style={{ background: "var(--gradient-hero)" }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Featured Authors
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl text-primary-foreground">
              Meet Our Authors
            </motion.h2>
          </motion.div>

          <div className="relative px-6">
            {/* Carousel */}
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-8">
                {authors.map((author, i) => (
                  <motion.div
                    key={author.slug}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={i}
                    variants={fadeUp}
                    className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                  >
                    <Link
                      to={`/authors/${author.slug}`}
                      className="group block overflow-hidden rounded-2xl bg-card shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col border-b-4 border-secondary/60"
                    >
                      {/* Photo */}
                      <div className="relative h-72 bg-muted/30 overflow-hidden">
                        <img
                          src={photoMap[author.slug]}
                          alt={author.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/40 to-transparent" />
                        <div className="absolute top-3 right-3">
                          <BadgeDisplay level={author.badge} size="sm" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6 flex flex-col">
                        <h3 className="font-heading text-lg font-bold group-hover:text-secondary transition-colors mb-1">
                          {author.name}
                        </h3>
                        <p className="text-sm font-medium text-secondary/80 mb-3">{author.title}</p>
                        <p className="text-sm text-muted-foreground mb-4 flex-1 leading-relaxed">{author.shortBio}</p>

                        {/* Books */}
                        <div className="mt-4 flex items-center gap-3 pb-4 border-b border-border/50">
                          {author.books.slice(0, 3).map((book) => {
                            const cover = coverMap[book.slug];
                            return cover ? (
                              <img
                                key={book.slug}
                                src={cover}
                                alt={book.title}
                                className="h-16 rounded shadow-md object-contain hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div
                                key={book.slug}
                                className="flex h-16 w-12 items-center justify-center rounded bg-muted/80 shadow-md border border-border/50"
                              >
                                <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                              </div>
                            );
                          })}
                        </div>

                        {/* Genres */}
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {author.genres.slice(0, 3).map((g) => (
                            <span key={g} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-[var(--shadow-gold)] disabled:opacity-30 hover:bg-secondary/90 transition-colors"
              aria-label="Previous author"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-[var(--shadow-gold)] disabled:opacity-30 hover:bg-secondary/90 transition-colors"
              aria-label="Next author"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-border bg-muted/50 py-24">
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
              From Author to Authority
            </motion.h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: "Get Featured with a Professional Book Microsite for FREE",
                desc: "Published authors can apply for a free professional showcase with a dedicated book microsite. Books published through PublishNow.io also receive a verified badge.",
              },
              {
                icon: Users,
                title: "Showcase Your Work",
                desc: "Each book gets a professional microsite. Your author profile highlights your expertise, credentials, and story.",
              },
              {
                icon: Globe,
                title: "Grow Your Business",
                desc: "Offer coaching, sell courses, book speaking engagements, and host book launch events — all from your author profile.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group relative rounded-2xl bg-card p-10 text-center shadow-lg hover:shadow-xl transition-all duration-300 border-b-4 border-secondary/50 hover:border-secondary hover:-translate-y-1"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 ring-1 ring-secondary/20 group-hover:ring-secondary/40 transition-all">
                  <step.icon className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="mb-3 font-heading text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* The 4-Step Model - Author Monetization */}
          <div className="mt-16 border-t border-border pt-16">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="mb-16 text-center"
            >
              <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
                Author Monetization
              </motion.p>
              <motion.h3 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl">
                Turn Your Book Into a Business
              </motion.h3>
              <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground">
                All managed in one place.
              </motion.p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "1", title: "Digital Products", desc: "Courses, workbooks, audiobooks, and memberships powered by your book content." },
                { step: "2", title: "Coaching", desc: "1-on-1 and group coaching packages with built-in scheduling and payments." },
                { step: "3", title: "Speaking", desc: "Speaker profile, keynote topics, and booking calendar for events and podcasts." },
                { step: "4", title: "Events", desc: "Retreats, masterminds, certifications, and conferences." },
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
        </div>
      </section>

      {/* ==================== MICROSITE SHOWCASE ==================== */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left — Copy */}
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
                  "Newsletter signup & free chapter downloads",
                  "FAQ section & reader engagement tools",
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
                  <Link to="/create-microsite">
                    Get Your Microsite <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Right — Browser Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="inline-block rounded-full bg-background border border-border px-4 py-1 text-xs text-muted-foreground">
                      authorsbureau.com/books/be-suckcessful
                    </span>
                  </div>
                </div>

                {/* Microsite preview */}
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

                {/* Fake page body lines */}
                <div className="p-6 space-y-3">
                  <div className="h-3 rounded-full bg-muted w-full" />
                  <div className="h-3 rounded-full bg-muted w-5/6" />
                  <div className="h-3 rounded-full bg-muted w-4/6" />
                  <div className="flex gap-4 mt-6">
                    <div className="flex-1 rounded-full bg-secondary/20 py-2.5 text-center text-sm font-semibold text-secondary">
                      Buy on Amazon
                    </div>
                    <div className="flex-1 rounded-full border border-border py-2.5 text-center text-sm text-muted-foreground">
                      Get Free Chapter
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
