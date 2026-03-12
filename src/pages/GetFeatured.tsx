import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, BookOpen, Users, Globe, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPublishNowAuthUrl } from "@/lib/publishnow-auth";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function GetFeatured() {
  useDocumentMeta({
    title: "Get Featured | Authors Bureau",
    description: "Apply to be a featured author on Authors Bureau. Get a free professional book microsite, author profile, and exposure to readers worldwide.",
  });

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-primary py-20 text-primary-foreground">
        <div className="container text-center">
          <motion.div initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm text-secondary">
              <Award className="h-4 w-4" />
              Featured Author Program
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-heading text-4xl font-bold md:text-5xl mb-4">
              Get <span className="text-gradient-gold">Featured</span> on Authors Bureau
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mx-auto max-w-2xl text-lg text-primary-foreground/70">
              Join our curated directory of published authors. Get a professional showcase, free book microsite, and connect with readers worldwide.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">Why Get Featured</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold">Benefits of Being a Featured Author</motion.h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Globe, title: "Professional Book Microsite", desc: "A dedicated landing page for your book with Amazon links, reviews, and purchase buttons — completely free." },
              { icon: Users, title: "Author Directory Listing", desc: "Appear in our searchable author directory. Readers, event organizers, and media can discover you." },
              { icon: BookOpen, title: "Book Showcase", desc: "Display your books with bestseller badges, ratings, and detailed descriptions to attract new readers." },
              { icon: Award, title: "Verified Author Badge", desc: "Books published through PublishNow.io receive a verified badge, building trust and credibility." },
              { icon: Globe, title: "SEO-Optimized Profile", desc: "Your profile and book pages are optimized for search engines, helping readers find you organically." },
              { icon: Users, title: "Service Inquiries", desc: "Receive speaking, coaching, and consulting inquiries directly through your profile page." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="rounded-2xl bg-card p-7 shadow-md border border-border/60 hover:border-secondary/30 transition-all"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 ring-1 ring-secondary/20">
                  <item.icon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Criteria */}
      <section className="py-20 bg-muted/50 border-y border-border">
        <div className="container max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">Requirements</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold">Selection Criteria</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-3 text-muted-foreground">
              We maintain a curated directory to ensure quality. Here's what we look for:
            </motion.p>
          </motion.div>

          <div className="space-y-4">
            {[
              "You must have at least one published book (self-published or traditionally published)",
              "Your book must be available for purchase on Amazon or another major retailer",
              "A complete author profile with bio, photo, and genre information",
              "Professional conduct and genuine expertise in your book's subject matter",
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="flex items-start gap-3 rounded-xl bg-card p-5 border border-border/60"
              >
                <CheckCircle2 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{item}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">The Process</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold">How to Apply</motion.h2>
          </motion.div>

          <div className="space-y-6">
            {[
              { step: "1", title: "Create Your Account", desc: "Sign up with your email. Your account is created automatically.", icon: Users },
              { step: "2", title: "Complete Your Profile", desc: "Add your author bio, photo, book details, and Amazon links through the dashboard.", icon: BookOpen },
              { step: "3", title: "Submit for Review", desc: "Once your profile is complete, submit it for review by our editorial team.", icon: Award },
              { step: "4", title: "Get Featured", desc: "Approved authors are listed in our directory within 2-3 business days. Featured placement is awarded to exceptional profiles.", icon: Clock },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="flex items-start gap-5 rounded-2xl bg-card p-6 border border-border/60"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 ring-1 ring-secondary/20 font-heading text-xl font-bold text-secondary">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={5}
            variants={fadeUp}
            className="mt-12 text-center"
          >
            <Button
              asChild
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-[var(--shadow-gold)] rounded-full px-10"
            >
              <a href={getPublishNowAuthUrl("/dashboard")} rel="noopener noreferrer">
                Apply Now <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Free to apply. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
