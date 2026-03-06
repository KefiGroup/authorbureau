import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Globe, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Sparkles, Loader2, Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Node {
  id: string;
  label: string;
  icon: typeof BookOpen;
  description: string;
  status: "live" | "coming-soon" | "planned";
  buildOrder?: number;
}

interface StepConfig {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  nodes: Node[];
}

const stepConfigs: Record<string, StepConfig> = {
  "step-1": {
    id: "step-1", label: "A · Analyze", subtitle: "Digital Products",
    color: "text-blue-600", bgColor: "bg-blue-500/10",
    gradientFrom: "from-blue-500", gradientTo: "to-blue-600",
    nodes: [
      { id: "social-media", label: "Social Media", icon: Share2, description: "90-day AI content calendar", status: "live", buildOrder: 1 },
      { id: "workbooks", label: "Workbooks", icon: FileText, description: "Companion workbook PDFs", status: "live", buildOrder: 2 },
      { id: "webinars", label: "Webinars", icon: Video, description: "Webinar scripts + slide decks", status: "live", buildOrder: 3 },
      { id: "podcast-script", label: "Podcast Scripts", icon: Podcast, description: "Episode scripts from book chapters", status: "planned", buildOrder: 4 },
      { id: "courses", label: "Online Courses", icon: GraduationCap, description: "8-12 module structured courses", status: "coming-soon", buildOrder: 5 },
      { id: "audiobook", label: "Audiobook", icon: Headphones, description: "AI-generated audiobook scripts", status: "coming-soon", buildOrder: 6 },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, description: "Self-paced study guide", status: "coming-soon", buildOrder: 7 },
      { id: "memberships", label: "Monthly Memberships", icon: CreditCard, description: "3-tier membership system", status: "planned", buildOrder: 8 },
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Affiliate tracking links", status: "planned", buildOrder: 9 },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "AI-generated conversion sequences", status: "planned", buildOrder: 10 },
    ],
  },
  "step-2": {
    id: "step-2", label: "B · Build", subtitle: "Coaching & Consulting",
    color: "text-amber-600", bgColor: "bg-amber-500/10",
    gradientFrom: "from-amber-500", gradientTo: "to-amber-600",
    nodes: [
      { id: "coaching-1on1", label: "1-on-1 Coaching", icon: UserCheck, description: "6/12-session coaching programs", status: "live" },
      { id: "group-coaching", label: "Group Coaching", icon: Users, description: "8-week group coaching curriculum", status: "coming-soon" },
      { id: "big-ticket", label: "Big Ticket", icon: Trophy, description: "Premium consulting packages", status: "planned" },
      { id: "revenue-sharing", label: "Revenue Sharing / JV", icon: Handshake, description: "Partnership matching + contracts", status: "planned" },
      { id: "coaching-membership", label: "Coaching Membership", icon: CreditCard, description: "Monthly coaching tier", status: "planned" },
    ],
  },
  "step-3": {
    id: "step-3", label: "B · Broadcast", subtitle: "Speaking",
    color: "text-rose-500", bgColor: "bg-rose-500/10",
    gradientFrom: "from-rose-500", gradientTo: "to-rose-600",
    nodes: [
      { id: "keynotes", label: "Keynotes", icon: Mic, description: "3-5 keynote topics with slide decks", status: "live" },
      { id: "podcast-guest", label: "Podcast Pitches", icon: Podcast, description: "Podcast pitch kit", status: "planned" },
      { id: "corporate-training", label: "Corporate Training", icon: Building2, description: "Corporate training programs", status: "planned" },
      { id: "jvs-speaking", label: "Joint Ventures", icon: Handshake, description: "JV proposals for co-hosting", status: "planned" },
      { id: "book-sales-events", label: "Book Sales at Events", icon: BookOpen, description: "QR code order pages", status: "planned" },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, description: "Special edition proposals", status: "planned" },
      { id: "in-house-speaker", label: "In-House Speaker", icon: Presentation, description: "Corporate speaker profile", status: "planned" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Fundraising event templates", status: "planned" },
      { id: "conventions", label: "Conventions", icon: Calendar, description: "Conference submission generator", status: "planned" },
    ],
  },
  "step-4": {
    id: "step-4", label: "Y · Yield", subtitle: "Seminars & Events",
    color: "text-emerald-500", bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600",
    nodes: [
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, description: "2-3 day retreat programs", status: "planned" },
      { id: "certification", label: "Certification Programs", icon: ShieldCheck, description: "Multi-module curriculum + exam", status: "planned" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, description: "Quarterly mastermind groups", status: "planned" },
      { id: "exhibitors", label: "Exhibitors / JV", icon: Megaphone, description: "Exhibitor prospectus", status: "planned" },
    ],
  },
};

interface BookSummary {
  id: string;
  title: string;
  cover_image_url: string | null;
  slug: string;
}

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

interface Props {
  stepId: string;
}

export default function PortfolioStepView({ stepId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const step = stepConfigs[stepId];

  useEffect(() => {
    async function fetchBooks() {
      if (!user) return;
      setLoading(true);
      try {
        const token = await getActiveToken();
        if (!token) { setLoading(false); return; }
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setBooks(result.books || []);
      } catch (err) {
        console.error("Failed to fetch books:", err);
      }
      setLoading(false);
    }
    fetchBooks();
  }, [user]);

  if (!step) return null;

  const stepIndex = Object.keys(stepConfigs).indexOf(stepId);

  const tabMap: Record<string, string> = {
    "step-1": "automate",
    "step-2": "build",
    "step-3": "broadcast",
    "step-4": "yield",
  };

  return (
    <div className="max-w-6xl space-y-8">
      {/* Step Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} flex items-center justify-center text-white font-bold text-xl shadow-md`}>
          {stepIndex + 1}
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${step.color}`}>
            {step.label}
          </p>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{step.subtitle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Portfolio view — all {step.subtitle.toLowerCase()} across your books
          </p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs font-medium rounded-full px-3 py-1.5 ${step.bgColor} ${step.color}`}>
            {step.nodes.length} product types
          </span>
        </div>
      </div>

      {/* Product Type Overview */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Available Product Types</h3>
        <div className="flex flex-wrap gap-2">
          {step.nodes.map((node) => {
            const Icon = node.icon;
            const statusColor = node.status === "live"
              ? "bg-green-500/10 text-green-700 border-green-500/20"
              : node.status === "coming-soon"
              ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
              : "bg-muted text-muted-foreground border-border";
            return (
              <span key={node.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${statusColor}`}>
                <Icon className="h-3.5 w-3.5" />
                {node.label}
                {node.status === "live" && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
              </span>
            );
          })}
        </div>
      </div>

      {/* Per-Book Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-bold">By Book</h3>
          <p className="text-xs text-muted-foreground">
            Click a book to manage its {step.subtitle.toLowerCase()}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading books...
          </div>
        ) : books.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">No books yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Add a book first, then come back here to see your {step.subtitle.toLowerCase()} portfolio.
            </p>
            <Button onClick={() => navigate("/dashboard?section=my-books")} variant="outline">
              <Plus className="h-4 w-4 mr-1.5" /> Add Your First Book
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {books.map((book) => (
              <motion.div
                key={book.id}
                className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:border-muted-foreground/20 transition-all cursor-pointer"
                onClick={() => navigate(`/dashboard/book/${book.id}?tab=${tabMap[stepId]}`)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-4">
                  {/* Book Cover */}
                  <div className="h-16 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-sm border border-border">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-bold text-base truncate">{book.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      No {step.subtitle.toLowerCase()} products yet — click to start building
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      Manage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
          <strong>All Books View:</strong> This page shows {step.subtitle.toLowerCase()} across all your books.
          To build or manage products for a specific book, go to <strong>My Books Hub</strong> and click into it.
        </p>
      </div>
    </div>
  );
}
