import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Contact() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  useDocumentMeta({
    title: "Contact — Authors Bureau | Get in Touch",
    description: "Have a question about Authors Bureau, your directory profile, or our 28 revenue streams? Reach our team — we usually reply within one business day.",
    ogTitle: "Contact — Authors Bureau",
    ogDescription: "Have a question about Authors Bureau? Reach our team — we usually reply within one business day.",
    ogImage: "https://authorsbureau.com/og-image.jpg",
    ogUrl: "https://authorsbureau.com/contact",
    canonical: "https://authorsbureau.com/contact",
    twitterCard: "summary_large_image",
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);

    // Simulate send
    setTimeout(() => {
      setSending(false);
      toast({
        title: "Message sent!",
        description: "We'll get back to you within 1–2 business days.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="py-24">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="mb-12 text-center">
            <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Get In Touch
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="font-heading text-3xl font-bold md:text-5xl mb-4">
              Contact Us
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-xl mx-auto">
              Have a question about getting featured, partnerships, or anything else? We'd love to hear from you.
            </motion.p>
          </motion.div>

          <div className="grid gap-12 md:grid-cols-5">
            {/* Contact Info */}
            <motion.div
              initial="hidden"
              animate="visible"
              className="md:col-span-2 space-y-6"
            >
              <motion.div variants={fadeUp} custom={3} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                  <Mail className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm">Email</h3>
                   <a href="mailto:support@authorsbureau.com" className="text-sm text-muted-foreground hover:text-secondary transition-colors">
                     support@authors-bureau.com
                   </a>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                  <MapPin className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm">Location</h3>
                  <p className="text-sm text-muted-foreground">Singapore</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial="hidden"
              animate="visible"
              className="md:col-span-3 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <motion.div variants={fadeUp} custom={3}>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required maxLength={100} placeholder="Your name" className="mt-1.5" />
              </motion.div>

              <motion.div variants={fadeUp} custom={4}>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required maxLength={255} placeholder="you@example.com" className="mt-1.5" />
              </motion.div>

              <motion.div variants={fadeUp} custom={5}>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" required maxLength={200} placeholder="How can we help?" className="mt-1.5" />
              </motion.div>

              <motion.div variants={fadeUp} custom={6}>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" required maxLength={2000} rows={5} placeholder="Tell us more…" className="mt-1.5" />
              </motion.div>

              <motion.div variants={fadeUp} custom={7}>
                <Button type="submit" disabled={sending} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-none w-full">
                  {sending ? "Sending…" : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
                </Button>
              </motion.div>
            </motion.form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
