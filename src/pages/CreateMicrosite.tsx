import { motion } from "framer-motion";
import { BookOpen, ArrowRight, CheckCircle2, Monitor, Sparkles, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function CreateMicrosite() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-primary py-20 text-primary-foreground">
        <div className="container text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-4 py-2 text-sm text-secondary mb-6">
            <Monitor className="h-4 w-4" />
            Free for All Authors
          </div>
          <h1 className="mb-4 font-heading text-4xl md:text-5xl font-bold leading-tight">
            Your Book Deserves Its Own <span className="italic text-secondary">Landing Page</span>
          </h1>
          <p className="mx-auto max-w-lg text-primary-foreground/70 text-lg">
            Create a professional book microsite in minutes. Showcase your bestseller status, drive sales, and grow your readership — completely free.
          </p>
        </div>
      </section>

      {/* Two Paths */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-2">
            {/* Path 1: PublishNow.io */}
            <motion.div variants={fadeUp} custom={0}>
              <div className="rounded-2xl border border-secondary/30 bg-card p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow h-full flex flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 mb-5">
                  <Rocket className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-heading text-xl font-bold mb-2">I Use PublishNow.io</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  Your books are already in our shared system. Sign in to your Authors Bureau dashboard and your books will be ready to turn into microsites.
                </p>
                <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Link to="/auth">
                    Sign In to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Path 2: New Author */}
            <motion.div variants={fadeUp} custom={1}>
              <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow h-full flex flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-5">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold mb-2">I Have a Published Book</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  Sign in and add your books via Amazon import or manual entry. Create your microsite in minutes with our guided setup.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>

          {/* Branding */}
          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="visible"
            className="text-center mt-8 text-xs text-muted-foreground/60 font-medium uppercase tracking-widest"
          >
            <Sparkles className="inline h-3 w-3 mr-1 text-secondary/50" />
            Powered by PublishNow.io AI Marketing Studio
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/50 py-16">
        <div className="container max-w-4xl text-center">
          <h2 className="font-heading text-2xl font-bold mb-3">
            Every Microsite Includes
          </h2>
          <p className="text-muted-foreground mb-10">All free. No hidden fees. No subscriptions.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Amazon Bestseller badges",
              "Book description & details",
              "Author bio & credentials",
              "Purchase links",
              "Genre & category tags",
              "Mobile-responsive design",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-left">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-secondary" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
