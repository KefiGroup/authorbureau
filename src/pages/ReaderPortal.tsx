import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { BookOpen, Clock, Loader2, LogOut, ExternalLink, GraduationCap, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Purchase {
  id: string;
  product_id: string;
  product_type: string;
  product_title: string;
  author_id: string;
  created_at: string;
  amount: number;
  currency: string;
}

interface AuthorInfo {
  pen_name: string | null;
  author_slug: string | null;
  photo_url: string | null;
}

const PRODUCT_ICON_MAP: Record<string, any> = {
  homestudy: BookOpen,
  home_study_courses: BookOpen,
  onlinecourse: GraduationCap,
  courses: GraduationCap,
  audiobook: Headphones,
  audiobooks: Headphones,
};

export default function ReaderPortal() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [loading, setLoading] = useState(true);

  useDocumentMeta({
    title: "Reader Portal | Authors Bureau",
    description: "Access your purchased courses, home studies, and learning materials.",
  });

  useEffect(() => {
    if (!user) return;
    loadPurchases();
  }, [user]);

  async function loadPurchases() {
    setLoading(true);

    // Get user email from shared backend
    const { data: sessionData } = await sharedSupabase.auth.getSession();
    const email = sessionData?.session?.user?.email;
    if (!email) {
      setLoading(false);
      return;
    }

    // Query purchases by customer email using service-side
    // Since purchases table uses RLS, we query via edge function
    const { data, error } = await supabase.functions.invoke("reader-purchases", {
      body: { email },
      headers: sessionData?.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : undefined,
    });

    if (error || !data?.purchases) {
      setLoading(false);
      return;
    }

    setPurchases(data.purchases);

    // Load author info for each unique author
    const authorIds = [...new Set(data.purchases.map((p: Purchase) => p.author_id))] as string[];
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("author_profiles_public" as any)
        .select("user_id, pen_name, author_slug, photo_url")
        .in("user_id", authorIds);

      if (profiles) {
        const authorMap: Record<string, AuthorInfo> = {};
        profiles.forEach((p: any) => {
          authorMap[p.user_id] = { pen_name: p.pen_name, author_slug: p.author_slug, photo_url: p.photo_url };
        });
        setAuthors(authorMap);
      }
    }

    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/reader-portal" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-5xl flex items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground">Reader Portal</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Library</h1>
          <p className="text-muted-foreground mt-1">Access your purchased courses and learning materials.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">No purchases yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              When you purchase a course or home study program from an author, it will appear here.
            </p>
            <Link
              to="/directory"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-medium py-2.5 px-5 rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Browse Authors
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {purchases.map((purchase) => {
              const author = authors[purchase.author_id];
              const IconComponent = PRODUCT_ICON_MAP[purchase.product_type] || BookOpen;
              const productRoute = purchase.product_type === "home_study_courses" ? "homestudy"
                : purchase.product_type === "courses" ? "onlinecourse"
                : purchase.product_type === "audiobooks" ? "audiobook"
                : purchase.product_type;

              return (
                <div
                  key={purchase.id}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Product card header */}
                  <div className="bg-primary/5 p-6 flex items-center justify-center">
                    <IconComponent className="h-12 w-12 text-primary/60" />
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {purchase.product_title}
                    </h3>

                    {author && (
                      <p className="text-sm text-muted-foreground">
                        by {author.pen_name || "Author"}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Purchased {new Date(purchase.created_at).toLocaleDateString()}
                    </div>

                    <Link
                      to={`/reader-portal/${purchase.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-2"
                    >
                      Access Content
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
