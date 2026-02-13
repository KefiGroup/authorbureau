import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authors } from "@/data/authors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";

import paulinePhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista.jpg";
import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import hiCover from "@/assets/hemispheric-intelligence-cover.png";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
};

const coverMap: Record<string, string> = {
  "be-suckcessful": besuckcessfulCover,
  "hemispheric-intelligence": hiCover,
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
              Every author gets a professional showcase. Featured authors access
              tools to sell courses, offer coaching, book speaking engagements,
              and run events — all from one platform.
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
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base"
              >
                <Link to="/join">Get Featured</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Authors */}
      <section className="py-24">
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

          <div className="grid gap-8 md:grid-cols-2">
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
                  className="group block overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex-shrink-0 p-6">
                      <img
                        src={photoMap[author.slug]}
                        alt={author.name}
                        className="mx-auto h-32 w-32 rounded-xl object-cover sm:mx-0"
                      />
                    </div>
                    <div className="flex-1 p-6 pt-0 sm:pl-0 sm:pt-6">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                          {author.badge === "publishnow-verified" ? "✦ PublishNow Verified" : author.badge}
                        </span>
                      </div>
                      <h3 className="font-heading text-xl font-bold group-hover:text-secondary transition-colors">
                        {author.name}
                      </h3>
                      <p className="mb-3 text-sm text-muted-foreground">{author.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{author.shortBio}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {author.genres.map((g) => (
                          <span key={g} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-border bg-muted/50 py-24">
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
                title: "Get Featured",
                desc: "Apply to be listed or publish through PublishNow.io for an auto-generated showcase with a verified badge.",
              },
              {
                icon: Users,
                title: "Showcase Your Work",
                desc: "Each book gets a professional microsite. Your author profile highlights your expertise, credentials, and story.",
              },
              {
                icon: Globe,
                title: "Grow Your Business",
                desc: "Sell courses, offer coaching, book speaking engagements, and run events — all from your author profile.",
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
        </div>
      </section>

      {/* Books Showcase */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Latest Books
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl">
              Bestselling Books by Our Authors
            </motion.h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2">
            {authors.map((author) => {
              const book = author.books[0];
              return (
                <motion.div
                  key={book.slug}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={0}
                  variants={fadeUp}
                >
                  <Link
                    to={`/books/${book.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] sm:flex-row"
                  >
                    <div className="flex items-center justify-center bg-muted/50 p-8 sm:w-48">
                      <img
                        src={coverMap[book.slug]}
                        alt={book.title}
                        className="h-56 rounded-lg object-contain shadow-lg transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {book.badges.map((b) => (
                          <span key={b} className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                            {b}
                          </span>
                        ))}
                      </div>
                      <h3 className="font-heading text-xl font-bold group-hover:text-secondary transition-colors">
                        {book.title}
                      </h3>
                      <p className="mb-2 text-sm italic text-muted-foreground">{book.subtitle}</p>
                      <p className="mb-4 text-sm text-muted-foreground line-clamp-3">{book.description}</p>
                      <p className="text-sm font-medium text-foreground">by {author.name}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The 4-Step Model */}
      <section className="border-y border-border bg-primary py-24 text-primary-foreground">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Author Monetization
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-4xl">
              Turn Your Book Into a Business
            </motion.h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Digital Products", desc: "Courses, workbooks, audiobooks, and memberships powered by your book content." },
              { step: "2", title: "Coaching", desc: "1-on-1 and group coaching packages with built-in scheduling and payments." },
              { step: "3", title: "Speaking", desc: "Speaker profile, keynote topics, and booking calendar for events and podcasts." },
              { step: "4", title: "Events", desc: "Retreats, masterminds, certifications, and conferences — all managed in one place." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary font-heading text-lg font-bold text-secondary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-primary-foreground/70">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="rounded-2xl border border-border bg-card p-12 text-center shadow-[var(--shadow-card)]"
          >
            <motion.h2 variants={fadeUp} custom={0} className="mb-4 font-heading text-3xl font-bold md:text-4xl">
              Ready to Be Discovered?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mb-8 max-w-lg text-muted-foreground">
              Whether you're already published or ready to write your first book,
              there's a path for you.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold shadow-none"
              >
                <Link to="/join">Apply as an Author</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-base"
              >
                <a href="https://publishnow.io" target="_blank" rel="noopener noreferrer">
                  Start Writing on PublishNow.io
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
