import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, CheckCircle2, Loader2, Monitor, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 } as const,
  }),
};

interface MicrositeFormData {
  bookTitle: string;
  subtitle: string;
  description: string;
  authorName: string;
  authorBio: string;
  amazonUrl: string;
  genre: string;
  badges: string;
  price: string;
}

export default function CreateMicrosite() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState<MicrositeFormData>({
    bookTitle: "",
    subtitle: "",
    description: "",
    authorName: "",
    authorBio: "",
    amazonUrl: "",
    genre: "",
    badges: "",
    price: "",
  });

  const update = (field: keyof MicrositeFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const badgeList = form.badges
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-4 py-2 text-sm text-secondary mb-4">
            <Monitor className="h-4 w-4" />
            Free for All Authors
          </div>
          <h1 className="mb-4 font-heading text-4xl font-bold">
            Create Your Book <span className="italic text-secondary">Microsite</span>
          </h1>
          <p className="mx-auto max-w-lg text-primary-foreground/70">
            Fill in your book details below and get a professional landing page — completely free. Showcase your bestseller status, drive sales, and grow your readership.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Form */}
            <motion.div initial="hidden" animate="visible" className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl font-bold">Book Details</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="lg:hidden"
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    {showPreview ? "Edit" : "Preview"}
                  </Button>
                </div>

                <div className={`space-y-5 ${showPreview ? "hidden lg:block" : ""}`}>
                  {/* Book Title & Subtitle */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Book Title *</Label>
                      <Input
                        value={form.bookTitle}
                        onChange={(e) => update("bookTitle", e.target.value)}
                        placeholder="e.g. Be SUCKcessful"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Subtitle</Label>
                      <Input
                        value={form.subtitle}
                        onChange={(e) => update("subtitle", e.target.value)}
                        placeholder="e.g. We SUCK Before We SUCCEED"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="mb-1.5 block">Book Description *</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Tell readers what your book is about..."
                      rows={4}
                    />
                  </div>

                  {/* Author Info */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Author Name *</Label>
                      <Input
                        value={form.authorName}
                        onChange={(e) => update("authorName", e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Genre</Label>
                      <Input
                        value={form.genre}
                        onChange={(e) => update("genre", e.target.value)}
                        placeholder="e.g. Self-Help, Finance"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 block">Author Bio</Label>
                    <Textarea
                      value={form.authorBio}
                      onChange={(e) => update("authorBio", e.target.value)}
                      placeholder="Brief bio about yourself..."
                      rows={3}
                    />
                  </div>

                  {/* Amazon & Price */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Amazon Book URL *</Label>
                      <Input
                        value={form.amazonUrl}
                        onChange={(e) => update("amazonUrl", e.target.value)}
                        placeholder="https://amazon.com/dp/..."
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Price</Label>
                      <Input
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        placeholder="e.g. $9.99"
                      />
                    </div>
                  </div>

                  {/* Badges */}
                  <div>
                    <Label className="mb-1.5 block">Bestseller Badges</Label>
                    <Input
                      value={form.badges}
                      onChange={(e) => update("badges", e.target.value)}
                      placeholder="e.g. #1 Best Seller, #1 New Release (comma-separated)"
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-[var(--shadow-gold)] rounded-full"
                    onClick={() => {
                      if (!form.bookTitle || !form.authorName || !form.amazonUrl) {
                        toast({ title: "Please fill in required fields (Book Title, Author Name, Amazon URL)", variant: "destructive" });
                        return;
                      }
                      toast({
                        title: "Microsite Preview Ready!",
                        description: "Your microsite preview is shown on the right. To publish, submit your author application.",
                      });
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="mr-2 h-5 w-5" />
                    Preview My Microsite
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Ready to go live?{" "}
                    <Link to="/join" className="text-secondary font-medium hover:underline">
                      Submit your author application
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Live Preview */}
            <motion.div
              initial="hidden"
              animate="visible"
              className={`lg:col-span-2 ${!showPreview ? "hidden lg:block" : ""}`}
            >
              <motion.div variants={fadeUp} custom={0} className="sticky top-24">
                <h3 className="font-heading text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                  Live Preview
                </h3>
                <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-muted/50">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-[10px] text-muted-foreground">
                        authorsbureau.com/books/{form.bookTitle ? form.bookTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 30) : "your-book"}
                      </span>
                    </div>
                  </div>

                  {/* Hero */}
                  <div className="bg-primary p-6 text-primary-foreground">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-20 h-28 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-secondary/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-heading text-base font-bold truncate">
                          {form.bookTitle || "Your Book Title"}
                        </h4>
                        {(form.subtitle || !form.bookTitle) && (
                          <p className="text-xs text-primary-foreground/60 italic truncate">
                            {form.subtitle || "Your subtitle goes here"}
                          </p>
                        )}
                        <p className="text-[10px] text-primary-foreground/40 mt-0.5">
                          by {form.authorName || "Author Name"}
                        </p>
                        {badgeList.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {badgeList.map((badge) => (
                              <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                                ⭐ {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4">
                    {/* About the book */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-secondary" />
                        <span className="text-xs font-bold">About the Book</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
                        {form.description || "Your book description will appear here. Tell readers about your story, your message, and why they should read it."}
                      </p>
                    </div>

                    {/* Genre */}
                    {form.genre && (
                      <div className="flex flex-wrap gap-1">
                        {form.genre.split(",").map((g) => (
                          <span key={g.trim()} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {g.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price */}
                    {form.price && (
                      <p className="text-[10px] text-muted-foreground">
                        Available from {form.price}
                      </p>
                    )}

                    {/* CTA buttons */}
                    <div className="flex gap-2 pt-2">
                      <div className="flex-1 rounded-full bg-secondary/20 py-2 text-center text-[10px] font-semibold text-secondary">
                        Buy on Amazon
                      </div>
                      <div className="flex-1 rounded-full border border-border py-2 text-center text-[10px] text-muted-foreground">
                        Get Free Chapter
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  This is a preview. <Link to="/join" className="text-secondary hover:underline">Apply to publish →</Link>
                </p>
              </motion.div>
            </motion.div>
          </div>
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
