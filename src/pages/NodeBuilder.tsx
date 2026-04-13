import { useParams, useNavigate, Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isLegacyBpNode, getBpBuildRoute } from "@/lib/bpRoutes";
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

function getHubPath(nodeId: string): string {
  if (nodeId.startsWith("BP-")) return "/brand-products";
  if (nodeId.startsWith("BA-")) return "/build-authority";
  return "/yield-revenue";
}

function getHubLabel(nodeId: string): string {
  if (nodeId.startsWith("BP-")) return "Brand Products";
  if (nodeId.startsWith("BA-")) return "Build Authority";
  return "Yield Revenue";
}

export default function NodeBuilder() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("author_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAuthorId(data?.id || null);
        setLoading(false);
      });
  }, [user]);

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-5 w-40 mb-6" />
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // Redirect legacy BP-01..BP-05 to canonical dashboard routes,
  // preserving bookId / bookTitle / bookCoverUrl from query params.
  if (nodeId && isLegacyBpNode(nodeId)) {
    const route = getBpBuildRoute(nodeId, {
      bookId: searchParams.get("bookId") || undefined,
      bookTitle: searchParams.get("bookTitle") || undefined,
      bookCoverUrl: searchParams.get("bookCoverUrl") || undefined,
    });
    return <Navigate to={route} replace />;
  }

  const builders: Record<string, React.ComponentType<{ authorId: string | null }>> = {
    "BP-05": BP05Builder,
    "BP-06": BP06Builder, "BP-07": BP07Builder,
    "BP-08": BP08Builder, "BP-09": BP09Builder,
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
      <div className="min-h-screen bg-background">
        {/* Back link */}
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <Link
            to={getHubPath(nodeId!)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {getHubLabel(nodeId!)}
          </Link>
        </div>
        <Builder authorId={authorId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
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
  );
}
