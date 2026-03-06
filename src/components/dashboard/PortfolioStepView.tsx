import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Sparkles, Loader2, Plus, DollarSign, Radio, Award,
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
}

interface CategoryConfig {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIcon: typeof DollarSign;
  nodes: Node[];
}

const categoryConfigs: Record<string, CategoryConfig> = {
  "revenue-streams": {
    id: "revenue-streams", label: "Revenue Streams", subtitle: "Products & services you sell",
    color: "text-emerald-600", bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600",
    headerIcon: DollarSign,
    nodes: [
      { id: "workbooks", label: "Workbooks", icon: FileText, description: "Companion workbook PDFs", status: "live" },
      { id: "audiobook", label: "Audiobook", icon: Headphones, description: "AI-narrated audiobook", status: "coming-soon" },
      { id: "courses", label: "Online Courses", icon: GraduationCap, description: "8-12 module structured courses", status: "coming-soon" },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, description: "Self-paced study guide", status: "coming-soon" },
      { id: "webinars", label: "Webinars", icon: Video, description: "Webinar scripts + slide decks", status: "live" },
      { id: "memberships", label: "Monthly Memberships", icon: CreditCard, description: "3-tier membership system", status: "planned" },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "Conversion sequences", status: "planned" },
      { id: "certification", label: "Certification Programs", icon: ShieldCheck, description: "Curriculum + exam + certificates", status: "planned" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, description: "Quarterly mastermind groups", status: "planned" },
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, description: "2-3 day retreat programs", status: "planned" },
    ],
  },
  "marketing-channels": {
    id: "marketing-channels", label: "Marketing Channels", subtitle: "How you reach your audience",
    color: "text-violet-600", bgColor: "bg-violet-500/10",
    gradientFrom: "from-violet-500", gradientTo: "to-violet-600",
    headerIcon: Radio,
    nodes: [
      { id: "social-media", label: "Social Media", icon: Share2, description: "90-day AI content calendar", status: "live" },
      { id: "podcast-script", label: "Podcast Scripts", icon: Podcast, description: "Episode scripts from book", status: "planned" },
      { id: "podcast-guest", label: "Podcast Pitches", icon: Podcast, description: "Get booked as a guest", status: "planned" },
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Affiliate tracking links", status: "planned" },
      { id: "book-sales-events", label: "Book Sales at Events", icon: BookOpen, description: "QR code order pages", status: "planned" },
      { id: "conventions", label: "Conventions", icon: Calendar, description: "Conference submission generator", status: "planned" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Fundraising event templates", status: "planned" },
      { id: "jvs", label: "Joint Ventures", icon: Handshake, description: "JV proposals + partnership matching", status: "planned" },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, description: "Signed copies, bundles", status: "planned" },
    ],
  },
  "authority-builders": {
    id: "authority-builders", label: "Authority Builders", subtitle: "Build credibility & premium positioning",
    color: "text-sky-600", bgColor: "bg-sky-500/10",
    gradientFrom: "from-sky-500", gradientTo: "to-sky-600",
    headerIcon: Award,
    nodes: [
      { id: "coaching-1on1", label: "1-on-1 Coaching", icon: UserCheck, description: "6/12-session coaching programs", status: "live" },
      { id: "group-coaching", label: "Group Coaching", icon: Users, description: "8-week group curriculum", status: "coming-soon" },
      { id: "big-ticket", label: "Big Ticket Consulting", icon: Trophy, description: "Premium packages ($5K–$25K)", status: "planned" },
      { id: "coaching-membership", label: "Coaching Membership", icon: CreditCard, description: "Monthly coaching tier", status: "planned" },
      { id: "keynotes", label: "Keynotes", icon: Mic, description: "3-5 keynote topics + slide decks", status: "live" },
      { id: "corporate-training", label: "Corporate Training", icon: Building2, description: "Corporate training programs", status: "planned" },
      { id: "in-house-speaker", label: "In-House Speaker", icon: Presentation, description: "Speaker profile + booking", status: "planned" },
      { id: "revenue-sharing", label: "Revenue Sharing / JV", icon: Handshake, description: "Partnership matching", status: "planned" },
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
  categoryId: string;
}

export default function PortfolioStepView({ categoryId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const category = categoryConfigs[categoryId];

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

  if (!category) return null;

  const HeaderIcon = category.headerIcon;

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo} flex items-center justify-center text-white shadow-md`}>
          <HeaderIcon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{category.label}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {category.subtitle} — portfolio view across all your books
          </p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs font-medium rounded-full px-3 py-1.5 ${category.bgColor} ${category.color}`}>
            {category.nodes.length} product types
          </span>
        </div>
      </div>

      {/* Product Type Overview */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Available Products</h3>
        <div className="flex flex-wrap gap-2">
          {category.nodes.map((node) => {
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
            Click a book to manage its products
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
              Add a book first, then come back to manage your {category.label.toLowerCase()}.
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
                onClick={() => navigate(`/dashboard/book/${book.id}?tab=${categoryId}`)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-sm border border-border">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-bold text-base truncate">{book.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      No {category.label.toLowerCase()} products yet — click to start building
                    </p>
                  </div>
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
          <strong>All Books View:</strong> This shows {category.label.toLowerCase()} across all your books.
          To build or manage products for a specific book, go to <strong>My Books Hub</strong> and click into it.
        </p>
      </div>
    </div>
  );
}
