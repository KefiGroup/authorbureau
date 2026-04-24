import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import logoWithText from "@/assets/logo-with-text.webp";

type Stage = "waiting" | "connecting" | "session" | "success" | "error" | "timeout";

const STAGE_CONFIG: Record<"connecting" | "session" | "success", { label: string; progress: number }> = {
  connecting: { label: "Connecting…", progress: 33 },
  session: { label: "Setting up your session…", progress: 66 },
  success: { label: "You're in!", progress: 100 },
};

function friendlyError(raw: string): { title: string; body: string } {
  const lower = raw.toLowerCase();
  if (lower.includes("expired") || lower.includes("invalid") || lower.includes("sso validation failed")) {
    return {
      title: "This sign-in link has expired",
      body: "Please try again. Sign-in links can only be used once.",
    };
  }
  if (lower.includes("no sso token")) {
    return {
      title: "No sign-in link found",
      body: "It looks like you arrived here without a sign-in link. Please use email sign-in below.",
    };
  }
  if (raw.includes("TypeError") || lower.includes("fetch") || lower.includes("network")) {
    return {
      title: "Connection problem",
      body: "We couldn't reach our servers. Please check your internet connection and try again.",
    };
  }
  return {
    title: "Sign-in failed",
    body: raw,
  };
}

export default function SSO() {
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const [stage, setStage] = useState<Stage>("waiting");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const hasRun = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const retry = useCallback(() => {
    hasRun.current = false;
    setStage("waiting");
    setError(null);
    setRetryKey((k) => k + 1);
  }, []);

  // Skip if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (loading || hasRun.current || user) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No SSO token provided.");
      setStage("error");
      return;
    }

    let cancelled = false;

    // 15s timeout
    timeoutRef.current = setTimeout(() => {
      if (!cancelled && stage !== "success" && stage !== "error") {
        setStage("timeout");
      }
    }, 15000);

    async function run(attempt = 1) {
      try {
        if (cancelled) return;
        setStage("connecting");

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
        setStage("session");

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session_data.access_token,
          refresh_token: data.session_data.refresh_token,
        });
        if (sessionError) throw sessionError;

        if (cancelled) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStage("success");

        const redirectTo = params.get("redirect") || "/dashboard";
        setTimeout(() => {
          if (!cancelled) navigate(redirectTo, { replace: true });
        }, 600);
      } catch (err) {
        if (cancelled) return;
        if (attempt < 3 && err instanceof TypeError) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          if (!cancelled) return run(attempt + 1);
          return;
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setError(err instanceof Error ? err.message : "SSO authentication failed");
        setStage("error");
      }
    }

    run();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, navigate, retryKey]);

  const isLoading = stage === "waiting" || stage === "connecting" || stage === "session";
  const isSuccess = stage === "success";
  const isError = stage === "error";
  const isTimeout = stage === "timeout";
  const currentConfig = stage === "connecting" || stage === "session" || stage === "success"
    ? STAGE_CONFIG[stage]
    : null;

  const errorInfo = error ? friendlyError(error) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <motion.img
          src={logoWithText}
          alt="Authors Bureau"
          className="h-10 mx-auto"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        />

        <AnimatePresence mode="wait">
          {/* Loading states */}
          {isLoading && (
            <motion.div
              key="loading"
              className="space-y-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Loader2 className="h-9 w-9 animate-spin text-secondary mx-auto" />
              <p className="text-sm font-medium text-foreground">
                {currentConfig?.label ?? "Preparing…"}
              </p>
              <Progress value={currentConfig?.progress ?? 10} className="h-1.5 mx-auto max-w-[240px]" />
            </motion.div>
          )}

          {/* Success state */}
          {isSuccess && (
            <motion.div
              key="success"
              className="space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">You're in!</p>
              <Progress value={100} className="h-1.5 mx-auto max-w-[240px]" />
            </motion.div>
          )}

          {/* Timeout state */}
          {isTimeout && (
            <motion.div
              key="timeout"
              className="space-y-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <RefreshCw className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Taking longer than expected</p>
                <p className="text-xs text-muted-foreground">
                  The connection seems slow. You can try again or sign in with email.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button size="sm" onClick={retry}>
                  Try Again
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/auth">Sign In with Email</Link>
                </Button>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {isError && errorInfo && (
            <motion.div
              key="error"
              className="space-y-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{errorInfo.title}</p>
                <p className="text-xs text-muted-foreground">{errorInfo.body}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button size="sm" onClick={retry}>
                  Try Again
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/auth">Sign In with Email</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
