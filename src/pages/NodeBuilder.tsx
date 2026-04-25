import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RequireStripeConnected from "@/components/dashboard/RequireStripeConnected";
import BP01Builder from "@/components/dashboard/builders/bp01/BP01Builder";
import BP02Builder from "@/components/dashboard/builders/bp02/BP02Builder";
import BP03Builder from "@/components/dashboard/builders/bp03/BP03Builder";
import BP04Builder from "@/components/dashboard/builders/bp04/BP04Builder";
import BP05Builder from "@/components/dashboard/builders/bp05/BP05Builder";
import BP06Builder from "@/components/dashboard/builders/bp06/BP06Builder";
import BP07Builder from "@/components/dashboard/builders/bp07/BP07Builder";
import BP08Builder from "@/components/dashboard/builders/bp08/BP08Builder";
import BP09Builder from "@/components/dashboard/builders/bp09/BP09Builder";
import BA10Builder from "@/components/dashboard/builders/ba10/BA10Builder";
import BA11Builder from "@/components/dashboard/builders/ba11/BA11Builder";
import BA12Builder from "@/components/dashboard/builders/ba12/BA12Builder";
import BA13Builder from "@/components/dashboard/builders/ba13/BA13Builder";
import BA14Builder from "@/components/dashboard/builders/ba14/BA14Builder";
import BA15Builder from "@/components/dashboard/builders/ba15/BA15Builder";
import BA16Builder from "@/components/dashboard/builders/ba16/BA16Builder";
import BA17Builder from "@/components/dashboard/builders/ba17/BA17Builder";
import BA18Builder from "@/components/dashboard/builders/ba18/BA18Builder";
import YR19Builder from "@/components/dashboard/builders/yr19/YR19Builder";
import YR20Builder from "@/components/dashboard/builders/yr20/YR20Builder";
import YR21Builder from "@/components/dashboard/builders/yr21/YR21Builder";
import YR22Builder from "@/components/dashboard/builders/yr22/YR22Builder";
import YR23Builder from "@/components/dashboard/builders/yr23/YR23Builder";
import YR24Builder from "@/components/dashboard/builders/yr24/YR24Builder";
import YR25Builder from "@/components/dashboard/builders/yr25/YR25Builder";
import YR26Builder from "@/components/dashboard/builders/yr26/YR26Builder";
import YR27Builder from "@/components/dashboard/builders/yr27/YR27Builder";
import YR28Builder from "@/components/dashboard/builders/yr28/YR28Builder";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

function getHubPath(nodeId: string, bookId: string | null, from: string | null): string {
  if (from === "marketing-hub") return "/marketing-hub?tab=sequences";
  // Prefer the Book Hub tab the user came from when a book is in scope.
  if (bookId) {
    if (nodeId.startsWith("BP-")) return `/book-hub/${bookId}?tab=revenue-streams`;
    if (nodeId.startsWith("BA-")) return `/book-hub/${bookId}?tab=marketing-channels`;
    return `/book-hub/${bookId}?tab=authority-builders`;
  }
  // No active book — go back to dashboard rather than the legacy
  // /brand-products etc. routes that just bounce here.
  return "/dashboard";
}

function getHubLabel(nodeId: string, bookId: string | null, from: string | null): string {
  if (from === "marketing-hub") return "Marketing Hub";
  if (bookId) {
    if (nodeId.startsWith("BP-")) return "Book Hub · Brand";
    if (nodeId.startsWith("BA-")) return "Book Hub · Build";
    return "Book Hub · Yield";
  }
  return "Dashboard";
}

export default function NodeBuilder() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId");
  const from = searchParams.get("from");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setAuthorId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from("author_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[NodeBuilder] Failed to load author profile:", error.message);
        }
        let id = data?.id || null;
        if (!id) {
          // Fallback: shared backend
          const { data: sp } = await sharedSupabase
            .from("author_profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          id = sp?.id || null;
        }
        setAuthorId(id);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-5 w-40 mb-6" />
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const builders: Record<string, React.ComponentType<{ authorId: string | null; bookId?: string | null }>> = {
    "BP-01": BP01Builder, "BP-02": BP02Builder, "BP-03": BP03Builder,
    "BP-04": BP04Builder, "BP-05": BP05Builder, "BP-06": BP06Builder,
    "BP-07": BP07Builder, "BP-08": BP08Builder, "BP-09": BP09Builder,
    "BA-10": BA10Builder, "BA-11": BA11Builder, "BA-12": BA12Builder,
    "BA-13": BA13Builder, "BA-14": BA14Builder, "BA-15": BA15Builder,
    "BA-16": BA16Builder, "BA-17": BA17Builder, "BA-18": BA18Builder,
    "YR-19": YR19Builder, "YR-20": YR20Builder, "YR-21": YR21Builder,
    "YR-22": YR22Builder, "YR-23": YR23Builder, "YR-24": YR24Builder,
    "YR-25": YR25Builder, "YR-26": YR26Builder, "YR-27": YR27Builder,
    "YR-28": YR28Builder,
  };

  const Builder = nodeId ? builders[nodeId] : null;

  if (Builder) {
    return (
      <DashboardLayout>
        {/* Back link */}
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <Link
            to={getHubPath(nodeId!, bookId, from)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {getHubLabel(nodeId!, bookId, from)}
          </Link>
        </div>
        <Builder authorId={authorId} bookId={bookId} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-2">Coming Soon</h1>
        <p className="text-muted-foreground mb-6">
          The builder for node {nodeId} is not available yet.
        </p>
        <button
          onClick={() => navigate("/brand-products")}
          className="text-primary underline"
        >
          Back to Brand Products
        </button>
      </div>
    </DashboardLayout>
  );
}
