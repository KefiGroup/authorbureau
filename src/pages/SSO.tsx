import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const controller = new AbortController();

    if (!token) {
      setError("No SSO token provided.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${SHARED_BACKEND_URL}/functions/v1/sso-handoff`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "validate",
              token,
              source_platform: "authorsbureau",
            }),
            signal: controller.signal,
          }
        );

        const data = await res.json();

        if (!res.ok || !data.session_data) {
          throw new Error(data.error || "SSO validation failed");
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session_data.access_token,
          refresh_token: data.session_data.refresh_token,
        });

        if (sessionError) throw sessionError;

        navigate("/dashboard", { replace: true });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("SSO error:", err);
        setError(err instanceof Error ? err.message : "SSO authentication failed");
      }
    })();

    return () => controller.abort();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-heading text-xl font-bold">Sign-In Failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild>
            <Link to="/auth">Sign In Normally</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
