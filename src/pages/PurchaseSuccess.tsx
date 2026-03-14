import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function PurchaseSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [data, setData] = useState<any>(null);

  useDocumentMeta({ title: "Purchase Confirmed | Authors Bureau" });

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    async function verify() {
      try {
        // Get token for auth
        const { data: sessionData } = await sharedSupabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const { data: result, error } = await supabase.functions.invoke("verify-purchase", {
          body: { sessionId },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (error || !result?.verified) {
          setStatus("error");
          return;
        }

        setData(result);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    }

    verify();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Confirming your purchase...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Purchase Confirmed!</h1>
            <p className="text-muted-foreground">
              You've successfully purchased <strong>{data?.productTitle}</strong>.
              A confirmation email has been sent to <strong>{data?.customerEmail}</strong>.
            </p>

            <div className="bg-muted/50 rounded-xl p-6 text-left space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                What's next?
              </h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Sign in to your <strong>Readers Bureau</strong> with the email you used to purchase</li>
                <li>Access your content anytime from your personal library</li>
                <li>Start learning and transforming!</li>
              </ol>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/reader-portal"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to Reader Portal
                <ArrowRight className="h-4 w-4" />
              </Link>
              {data?.authorSlug && data?.bookSlug && (
                <Link
                  to={`/${data.authorSlug}/${data.bookSlug}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to book page
                </Link>
              )}
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              We couldn't verify your purchase. If you were charged, please contact support and we'll sort it out.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
            >
              Go Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
