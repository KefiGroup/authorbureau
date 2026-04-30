import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, BookOpen, ArrowRight, Award, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { supabase } from "@/lib/shared-backend";
import { useToast } from "@/hooks/use-toast";
import { getPublishNowAuthUrl } from "@/lib/publishnow-auth";
import { Link, useNavigate } from "react-router-dom";

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
  const [loading, setLoading] = useState(false);

  useDocumentMeta({
    title: "Join Authors Bureau — Apply for the Author Directory",
    description: "Apply to join the Authors Bureau directory. Get a profile, lead magnets, and AI-powered tools to turn your published book into 28 revenue streams.",
    ogTitle: "Join Authors Bureau",
    ogDescription: "Apply to join the Authors Bureau directory and turn your book into 28 revenue streams.",
    ogImage: "https://authorsbureau.com/og-image.jpg",
    ogUrl: "https://authorsbureau.com/join",
    canonical: "https://authorsbureau.com/join",
    twitterCard: "summary_large_image",
  });
  const { toast } = useToast();
  const publishNowAuthUrl = getPublishNowAuthUrl("/dashboard");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const fullName = (formData.get("full_name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const websiteUrl = (formData.get("website_url") as string)?.trim() || null;
    const amazonBookUrl = (formData.get("amazon_book_url") as string).trim();

    if (!fullName || !email || !amazonBookUrl) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("author_applications").insert({
      full_name: fullName.slice(0, 200),
      email: email.slice(0, 255),
      website_url: websiteUrl?.slice(0, 500),
      amazon_book_url: amazonBookUrl.slice(0, 500),
      bio: null,
      genres: null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      window.location.href = publishNowAuthUrl;
    }, 1200);

  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-4 py-2 text-sm text-secondary mb-4">
            <Sparkles className="h-4 w-4" />
            Join the Platform
          </div>
          <h1 className="mb-4 font-heading text-4xl font-bold">
            Join Authors <span className="italic text-secondary">Bureau</span>
          </h1>
          <p className="mx-auto max-w-lg text-primary-foreground/70">
            Apply to be featured in our directory. Get a professional author
            profile and book pages.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-5xl">
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
                "Book pages for each title",
                "Listed in searchable directory",
                "Offer courses and digital products",
                "Coaching and speaking tools",
                "Cross-promotion with PublishNow.io",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  custom={i + 1}
                  className="mb-3 flex items-start gap-3"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </motion.div>
              ))}

              {/* Badge Tiers */}
              <motion.div variants={fadeUp} custom={8} className="mt-8 space-y-3">
                <h3 className="font-heading text-sm font-bold">Badge Tiers</h3>
                {(["listed", "verified", "featured", "ab-verified"] as const).map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <BadgeDisplay level={level} size="sm" />
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} custom={9} className="mt-8 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
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
                  className="rounded-2xl border border-secondary/20 bg-secondary/5 p-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="mb-2 font-heading text-xl font-bold">Application Submitted!</h3>
                  <p className="text-muted-foreground">
                    Great — now redirecting you to secure sign up.
                  </p>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]"
                >
                  <h2 className="font-heading text-xl font-bold">Author Application</h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Full Name *</label>
                      <input
                        required
                        name="full_name"
                        type="text"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Email *</label>
                      <input
                        required
                        name="email"
                        type="email"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Website or LinkedIn</label>
                      <input
                        name="website_url"
                        type="url"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                        placeholder="https://"
                      />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Amazon Book URL</label>
                      <input
                        required
                        name="amazon_book_url"
                        type="url"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                        placeholder="https://amazon.com/dp/..."
                      />
                  </div>


                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-[var(--shadow-gold)] rounded-full"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Award className="mr-2 h-5 w-5" />
                    )}
                    {loading ? "Submitting..." : "Submit & Continue Sign Up"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to={publishNowAuthUrl} className="text-secondary font-medium hover:underline">
                      Sign In
                    </Link>
                  </p>
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
