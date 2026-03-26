import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BP01Builder from "@/components/dashboard/builders/bp01/BP01Builder";
import BP02Builder from "@/components/dashboard/builders/bp02/BP02Builder";
import BP03Builder from "@/components/dashboard/builders/bp03/BP03Builder";
import BP04Builder from "@/components/dashboard/builders/bp04/BP04Builder";
import BP05Builder from "@/components/dashboard/builders/bp05/BP05Builder";

export default function NodeBuilder() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (nodeId === "BP-01") {
    return <BP01Builder authorId={authorId} />;
  }

  if (nodeId === "BP-02") {
    return <BP02Builder authorId={authorId} />;
  }

  if (nodeId === "BP-03") {
    return <BP03Builder authorId={authorId} />;
  }

  if (nodeId === "BP-04") {
    return <BP04Builder authorId={authorId} />;
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
