import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const GENRES = [
  { slug: "self-help", label: "Self-Help", emoji: "🧠", desc: "Courses, coaching, workbooks" },
  { slug: "business", label: "Business", emoji: "💼", desc: "Training, consulting, keynotes" },
  { slug: "fiction", label: "Fiction", emoji: "📖", desc: "Audiobooks, communities, events" },
  { slug: "memoir", label: "Memoir", emoji: "✍️", desc: "Speaking, retreats, podcasts" },
  { slug: "health", label: "Health & Wellness", emoji: "🏃", desc: "Courses, coaching, retreats" },
  { slug: "cooking", label: "Cookbooks", emoji: "🍳", desc: "Meal plans, video courses" },
  { slug: "parenting", label: "Parenting", emoji: "👶", desc: "Programs, coaching, community" },
  { slug: "spirituality", label: "Spirituality", emoji: "🙏", desc: "Meditation, retreats, certification" },
];

export default function SolutionsIndex() {
  useDocumentMeta({
    title: "Solutions for Authors | Authors Bureau — Turn Any Book Into a Business",
    description: "Discover how authors in every genre — self-help, business, fiction, memoir, health — are turning their books into thriving businesses with AI-powered tools.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-secondary/15 text-secondary border-0">
            <Sparkles className="h-3 w-3 mr-1" /> For Every Genre
          </Badge>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Solutions for Authors
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No matter your genre, your book contains intellectual property worth far more than royalties.
            See how authors like you are building six-figure businesses from a single book.
          </p>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GENRES.map(g => (
            <Link key={g.slug} to={`/solutions/${g.slug}`}>
              <Card className="p-5 border-border bg-card hover:border-secondary/40 hover:shadow-md transition-all group h-full">
                <span className="text-3xl mb-3 block">{g.emoji}</span>
                <h2 className="font-heading font-bold text-base mb-1 group-hover:text-secondary transition-colors">
                  {g.label}
                </h2>
                <p className="text-xs text-muted-foreground mb-3">{g.desc}</p>
                <span className="text-xs text-secondary flex items-center gap-1">
                  Explore <ArrowRight className="h-3 w-3" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <BookOpen className="h-8 w-8 text-secondary mx-auto mb-4" />
          <h2 className="font-heading text-2xl font-bold mb-3">Don't See Your Genre?</h2>
          <p className="text-muted-foreground text-sm mb-6">
            The ABBY Framework works for any book. Sign up free and let Abby AI analyze your specific book and genre.
          </p>
          <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full">
            <Link to="/auth">Get Your Free Analysis <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
