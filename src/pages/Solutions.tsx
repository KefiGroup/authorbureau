import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, ArrowRight, TrendingUp, Users, DollarSign, Loader2 } from "lucide-react";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

// Static genre configurations for SEO
const GENRE_CONFIG: Record<string, {
  title: string;
  description: string;
  heroSubtitle: string;
  painPoints: string[];
  topProducts: string[];
  cta: string;
  color: string;
}> = {
  "self-help": {
    title: "For Self-Help Authors",
    description: "Transform your self-help book into online courses, coaching programs, and digital products that generate passive income.",
    heroSubtitle: "Your self-help book has the power to change lives and build a thriving business.",
    painPoints: ["Low book royalties despite strong readership", "Readers want more but you have nothing to sell them", "No system to monetize your expertise beyond the book"],
    topProducts: ["Online Courses ($97-$497)", "1-on-1 Coaching ($150-$500/session)", "Companion Workbooks ($9.99-$24.99)", "Group Coaching Programs ($297-$997)"],
    cta: "Start building your self-help empire",
    color: "emerald",
  },
  "business": {
    title: "For Business Authors",
    description: "Turn your business book into corporate training, consulting packages, and premium speaking engagements.",
    heroSubtitle: "Your business book is the ultimate authority builder. Let's turn it into revenue.",
    painPoints: ["Companies want training but you don't have a program", "Your book proves expertise but you're not monetizing it", "Competitors are charging $10K+ for what your book teaches for $20"],
    topProducts: ["Corporate Training ($5,000-$25,000/day)", "Big Ticket Consulting ($2,500-$10,000)", "Keynote Speaking ($5,000-$15,000)", "Certification Programs ($2,500-$7,500)"],
    cta: "Build your business consulting empire",
    color: "violet",
  },
  "fiction": {
    title: "For Fiction Authors",
    description: "Build a loyal reader community, audiobook empire, and merchandise line around your fictional worlds.",
    heroSubtitle: "Your fictional world has unlimited monetization potential.",
    painPoints: ["Readers love your world but you only sell one book", "No way to build recurring revenue from fiction", "Audiobook production seems expensive and complex"],
    topProducts: ["Audiobooks ($14.99-$29.99)", "Monthly Reader Community ($9-$27/mo)", "Special Editions ($49-$199)", "Book Events & Signings"],
    cta: "Monetize your fictional universe",
    color: "amber",
  },
  "memoir": {
    title: "For Memoir Authors",
    description: "Your life story is your brand. Turn it into speaking engagements, retreats, and a thriving community.",
    heroSubtitle: "Your story isn't just a book. It's a movement waiting to happen.",
    painPoints: ["Your powerful story deserves a bigger platform", "Readers connect deeply but you can't sustain the conversation", "Speaking opportunities exist but you don't have materials"],
    topProducts: ["Keynote Speaking ($2,500-$15,000)", "Retreats & Workshops ($1,500-$5,000/person)", "Podcast Series (Brand Building)", "Social Media Content Calendar"],
    cta: "Turn your story into a speaking career",
    color: "rose",
  },
  "health": {
    title: "For Health & Wellness Authors",
    description: "Transform your health book into coaching programs, meal plans, home study courses, and wellness retreats.",
    heroSubtitle: "Your health book can become a complete wellness ecosystem.",
    painPoints: ["Readers want personalized guidance beyond the book", "Health courses on this topic sell for $99-$299 on competing platforms", "No system to capture and nurture your health-focused audience"],
    topProducts: ["Home Study Courses ($27-$97)", "Coaching Programs ($150-$500/session)", "Wellness Retreats ($1,500-$5,000)", "Monthly Membership ($9-$97/mo)"],
    cta: "Build your wellness business",
    color: "teal",
  },
  "cooking": {
    title: "For Cookbook Authors",
    description: "Turn your cookbook into meal planning courses, video tutorials, and a cooking community.",
    heroSubtitle: "Your recipes are just the beginning. Build a food empire.",
    painPoints: ["Cookbook royalties barely cover the cost of ingredients", "Readers want video demonstrations and meal plans", "Competitors charge $99+ for what your book teaches"],
    topProducts: ["Video Cooking Courses ($49-$197)", "Meal Plan Subscriptions ($9-$27/mo)", "Cooking Retreats ($500-$2,000)", "Companion Workbooks ($9.99-$14.99)"],
    cta: "Cook up a profitable business",
    color: "orange",
  },
  "parenting": {
    title: "For Parenting Authors",
    description: "Transform your parenting book into courses, coaching sessions, and a supportive community for parents.",
    heroSubtitle: "Parents need ongoing support. Give them more than a book.",
    painPoints: ["Parents want community and ongoing guidance", "Your expertise could help thousands more through courses", "Coaching in this niche commands premium rates"],
    topProducts: ["Online Parenting Courses ($47-$197)", "Group Coaching Cohorts ($297-$697)", "Monthly Community ($9-$47/mo)", "Home Study Programs ($27-$97)"],
    cta: "Help more families — and build a business",
    color: "sky",
  },
  "spirituality": {
    title: "For Spiritual Authors",
    description: "Turn your spiritual book into meditation courses, retreats, and a transformative community.",
    heroSubtitle: "Your spiritual wisdom can reach and transform more lives.",
    painPoints: ["Your message deserves a larger platform", "Retreats in this space command $2,000-$5,000 per person", "Readers want ongoing spiritual guidance"],
    topProducts: ["Meditation/Spiritual Courses ($47-$297)", "Retreats ($1,500-$5,000)", "Monthly Membership ($9-$47/mo)", "Certification Programs ($2,500-$7,500)"],
    cta: "Share your wisdom at scale",
    color: "purple",
  },
};

// Fallback for unknown genres
const DEFAULT_CONFIG = {
  title: "For Authors",
  description: "Transform your book into a multi-stream business with AI-powered tools.",
  heroSubtitle: "Your book is not the business. Your book is the HOOK.",
  painPoints: ["Low book royalties don't reflect the value of your expertise", "Readers want more from you but you have nothing to sell", "Building digital products seems overwhelming and expensive"],
  topProducts: ["Online Courses ($97-$497)", "Companion Workbooks ($9.99-$24.99)", "Coaching Programs ($150-$500/session)", "Speaking Engagements ($2,500-$15,000)"],
  cta: "Start building your author business",
  color: "secondary",
};

export default function Solutions() {
  const { genre } = useParams<{ genre: string }>();
  const normalizedGenre = (genre || "").toLowerCase().replace(/-/g, " ").replace(/\bfor\b/g, "").trim().replace(/\s+/g, "-");
  const config = GENRE_CONFIG[normalizedGenre] || DEFAULT_CONFIG;

  const [marketData, setMarketData] = useState<any>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);

  useDocumentMeta({
    title: `${config.title} | Authors Bureau — Turn Your Book Into a Business`,
    description: config.description,
  });

  // Fetch market data on mount
  useEffect(() => {
    if (!genre) return;
    setLoadingMarket(true);
    supabase.functions.invoke("market-research", {
      body: { bookTitle: `${genre} book`, genre: normalizedGenre.replace(/-/g, " "), keywords: [normalizedGenre.replace(/-/g, " ")] },
    }).then(({ data }) => {
      if (data && !data.error) setMarketData(data);
    }).catch(() => {})
    .finally(() => setLoadingMarket(false));
  }, [genre]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-background to-primary/5" />
        <div className="relative max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-secondary/15 text-secondary border-0">
            <Sparkles className="h-3 w-3 mr-1" /> ABBY Framework
          </Badge>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            {config.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {config.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full">
              <Link to="/auth">
                {config.cta} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link to="/faq">Learn How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold mb-8 text-center">Sound Familiar?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {config.painPoints.map((point, i) => (
              <Card key={i} className="p-6 border-border bg-card">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <span className="text-destructive font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground">{point}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products You Could Build */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold mb-2 text-center">
            What You Could Build
          </h2>
          <p className="text-muted-foreground text-center mb-8 text-sm">
            Real products. Real prices. Built by AI from your book in minutes.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {config.topProducts.map((product, i) => (
              <Card key={i} className="p-4 border-border bg-card flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-secondary" />
                </div>
                <span className="text-sm font-medium">{product}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Market Intelligence */}
      {(loadingMarket || marketData) && (
        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6 justify-center">
              <TrendingUp className="h-5 w-5 text-secondary" />
              <h2 className="font-heading text-2xl font-bold">Live Market Intelligence</h2>
            </div>
            <p className="text-muted-foreground text-center mb-8 text-sm">
              Real-time data from Amazon, Gumroad, and market research — updated for {normalizedGenre.replace(/-/g, " ")} authors.
            </p>

            {loadingMarket ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Researching the market...</span>
              </div>
            ) : marketData ? (
              <div className="space-y-6">
                {marketData.marketIntelligence && (
                  <Card className="p-6 border-secondary/20 bg-card">
                    <h3 className="font-heading font-bold mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-secondary" />
                      Market Analysis
                    </h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <MarkdownRenderer content={marketData.marketIntelligence} />
                    </div>
                    {marketData.marketCitations?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-1">Sources</p>
                        <div className="flex flex-wrap gap-1">
                          {marketData.marketCitations.slice(0, 5).map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-secondary/70 hover:text-secondary truncate max-w-[200px]">
                              [{i + 1}]
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {marketData.pricingIntelligence && (
                  <Card className="p-6 border-border bg-card">
                    <h3 className="font-heading font-bold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-secondary" />
                      Pricing Benchmarks
                    </h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <MarkdownRenderer content={marketData.pricingIntelligence} />
                    </div>
                  </Card>
                )}

                {marketData.competitorProducts?.length > 0 && (
                  <Card className="p-6 border-border bg-card">
                    <h3 className="font-heading font-bold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      Competitor Products Found
                    </h3>
                    <div className="space-y-3">
                      {marketData.competitorProducts.map((p: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground/60 shrink-0">{i + 1}.</span>
                          <div>
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-secondary">
                              {p.title}
                            </a>
                            {p.snippet && <p className="text-xs text-muted-foreground mt-0.5">{p.snippet}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <BookOpen className="h-10 w-10 text-secondary mx-auto mb-4" />
          <h2 className="font-heading text-3xl font-bold mb-3">
            Ready to Turn Your Book Into a Business?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join Authors Bureau and let Abby AI analyze your book, research your market, and build your personalized monetization plan in minutes.
          </p>
          <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-8">
            <Link to="/auth">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
