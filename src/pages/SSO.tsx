import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

async function setSessionWithRetry(accessToken: string, refreshToken: string, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) return;
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("abort") && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 500 * attempt));
      continue;
    }
    throw error;
  }
}

export default function SSO() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No SSO token provided.");
      return;
    }

    let cancelled = false;

    async function run(attempt = 1) {
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
          }
        );

        const data = await res.json();
        if (!res.ok || !data.session_data) {
          throw new Error(data.error || "SSO validation failed");
        }

        if (cancelled) return;

        await setSessionWithRetry(
          data.session_data.access_token,
          data.session_data.refresh_token,
        );

        if (!cancelled) navigate("/dashboard", { replace: true });
      } catch (err) {
        if (cancelled) return;
        const isRetryable =
          err instanceof TypeError ||
          (err instanceof Error && err.message?.toLowerCase().includes("abort"));
        if (attempt < 3 && isRetryable) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          if (!cancelled) return run(attempt + 1);
          return;
        }
        setError(
          err instanceof Error ? err.message : "SSO authentication failed"
        );
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

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
