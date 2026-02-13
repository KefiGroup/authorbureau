import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, Globe, Award, Building2, GraduationCap, Mic, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
                <BadgeDisplay level="publishnow-verified" size="sm" />
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
      <section id="featured-authors" className="py-24">
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
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl">
              Meet Our Authors
            </motion.h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {authors.map((author, i) => (
              <motion.div
                key={author.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Link
                  to={`/authors/${author.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 h-full flex flex-col"
                >
                  {/* Photo - Full Height */}
                  <div className="relative h-64 bg-muted/50 overflow-hidden">
                    <img
                      src={photoMap[author.slug]}
                      alt={author.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <BadgeDisplay level={author.badge} size="sm" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 flex flex-col">
                    <h3 className="font-heading text-lg font-bold group-hover:text-secondary transition-colors mb-1">
                      {author.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">{author.title}</p>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{author.shortBio}</p>

                    {/* Books */}
                    <div className="mt-4 flex items-center gap-3 pb-4 border-b border-border/50">
                      {author.books.slice(0, 3).map((book) => {
                        const cover = coverMap[book.slug];
                        return cover ? (
                          <img
                            key={book.slug}
                            src={cover}
                            alt={book.title}
                            className="h-16 rounded shadow-md object-contain"
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
                        <span key={g} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
                title: "Get Featured for Free",
                desc: "Published authors can apply for a free professional showcase. Books published through PublishNow.io also receive a verified badge.",
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
                className="relative rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10">
                  <step.icon className="h-7 w-7 text-secondary" />
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
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
                  className="rounded-xl border border-border bg-muted/50 p-6"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 font-heading text-lg font-bold text-secondary">
                    {item.step}
                  </div>
                  <h3 className="mb-2 font-heading text-lg font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
