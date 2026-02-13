import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 } as const,
  }),
};

export default function Join() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container text-center">
          <h1 className="mb-4 font-heading text-4xl font-bold">Join Authors Bureau</h1>
          <p className="mx-auto max-w-lg text-primary-foreground/70">
            Apply to be featured in our directory. Get a professional author
            profile and book microsites.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Benefits */}
            <motion.div
              initial="hidden"
              animate="visible"
              className="lg:col-span-2"
            >
              <motion.h2 variants={fadeUp} custom={0} className="mb-6 font-heading text-2xl font-bold">
                Why Join?
              </motion.h2>
              {[
                "Professional author profile page",
                "Book microsites for each title",
                "Listed in searchable directory",
                "Sell courses and digital products",
                "Coaching and speaking tools",
                "Cross-promotion with PublishNow.io",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  custom={i + 1}
                  className="mb-3 flex items-start gap-3"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </motion.div>
              ))}

              <motion.div variants={fadeUp} custom={8} className="mt-8 rounded-xl border border-border bg-muted/50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-secondary" />
                  <h3 className="font-heading font-bold text-sm">Write with PublishNow.io</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Don't have a book yet? PublishNow.io takes you from idea to
                  published in 7 days with AI-powered writing and publishing tools.
                </p>
                <a
                  href="https://publishnow.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"
                >
                  Start Writing <ArrowRight className="h-3 w-3" />
                </a>
              </motion.div>
            </motion.div>

            {/* Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-success/30 bg-success/5 p-12 text-center"
                >
                  <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-success" />
                  <h3 className="mb-2 font-heading text-xl font-bold">Application Submitted!</h3>
                  <p className="text-muted-foreground">
                    We'll review your application and get back to you within 48 hours.
                  </p>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]"
                >
                  <h2 className="font-heading text-xl font-bold">Author Application</h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Email</label>
                      <input
                        required
                        type="email"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Website or LinkedIn</label>
                    <input
                      type="url"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="https://"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Amazon Book URL</label>
                    <input
                      required
                      type="url"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="https://amazon.com/dp/..."
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Tell us about yourself</label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="Share your author journey, credentials, and what you hope to achieve..."
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Genres / Topics</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="e.g., Personal Development, Finance, AI"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-none"
                  >
                    Submit Application
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
