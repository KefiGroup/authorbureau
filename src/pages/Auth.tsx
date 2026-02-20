import { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth, ADMIN_EMAILS } from "@/hooks/useAuth";
import { Loader2, ExternalLink, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Auth() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [magicLinkProcessing, setMagicLinkProcessing] = useState(false);
  const { toast } = useToast();

  // Magic link handling: check for auth_token in URL hash on load
  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;

    // Hash can be "#/?auth_token=..." or "#?auth_token=..." — normalize before parsing
    const cleanHash = hash.replace(/^#\/?/, "");
    const params = new URLSearchParams(cleanHash);
    const authToken = params.get("auth_token");
    if (!authToken) return;

    setMagicLinkProcessing(true);

    (async () => {
      try {
        const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/user-auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify_token",
            token: authToken,
            source_platform: "authorsbureau",
          }),
        });

        const data = await res.json().catch(() => ({}));
        console.log("[Auth] verify_token response:", res.status, JSON.stringify(data));

        if (!res.ok) {
          throw new Error(data?.error || data?.message || "Magic link verification failed");
        }

        const tokenHash = data?.token_hash;
        const type = data?.type || "email";

        if (!tokenHash) {
          throw new Error("No token_hash returned from magic link verification.");
        }

        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (otpError) throw otpError;

        // Clear hash from URL
        window.history.replaceState(null, "", location.pathname);
        // After verifyOtp, user state hasn't updated yet — use supabase to get the session email
        // Don't navigate — let the useAuth listener + the `if (user)` redirect handle it automatically
      } catch (err: any) {
        console.error("[Auth] magic link error:", err);
        toast({ title: err.message || "Magic link sign-in failed", variant: "destructive" });
      } finally {
        setMagicLinkProcessing(false);
      }
    })();
  }, [location.hash]);

  if (loading || magicLinkProcessing) return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      </section>
      <Footer />
    </div>
  );
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Request code via shared backend edge function
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/user-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          action: "request_code",
          source_platform: "authorsbureau",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Failed to send verification code.");
      }

      setSent(true);
    } catch (err: any) {
      toast({ title: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Verify code via shared backend, then use token_hash with supabase.auth.verifyOtp
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);

    try {
      const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/user-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          action: "verify",
          code: otp,
          source_platform: "authorsbureau",
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("[Auth] verify response:", res.status, JSON.stringify(data));

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Verification failed (${res.status})`);
      }

      // Use token_hash + type to call supabase.auth.verifyOtp
      const tokenHash = data?.token_hash;
      const type = data?.type || "email";

      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (otpError) throw otpError;
        // Don't navigate here — let the useAuth listener + the `if (user)` redirect handle it
        return;
      }

      // Fallback: try session tokens directly (access_token/refresh_token)
      const accessToken = data?.access_token || data?.session?.access_token || data?.session_data?.access_token;
      const refreshToken = data?.refresh_token || data?.session?.refresh_token || data?.session_data?.refresh_token;

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        // Don't navigate here — let the useAuth listener + the `if (user)` redirect handle it
        return;
      }

      console.error("[Auth] No token_hash or session tokens in verify response. Keys:", Object.keys(data));
      throw new Error("Login succeeded but no session was returned. Please try again or contact support.");
    } catch (err: any) {
      console.error("[Auth] verify error:", err);
      toast({ title: err.message || "Verification failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleBack = () => {
    setSent(false);
    setOtp("");
  };

  const handleClose = () => {
    setShowModal(false);
    setEmail("");
    setSent(false);
    setOtp("");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] text-center space-y-6">
            <h1 className="font-heading text-2xl font-bold">Sign In to Authors Bureau</h1>
            <p className="text-sm text-muted-foreground">
              Authors Bureau uses your PublishNow account. Sign in with the email you registered on PublishNow.
            </p>

            <Button
              onClick={() => setShowModal(true)}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Sign In via PublishNow
            </Button>

            <p className="text-xs text-muted-foreground">
              Want to get featured?{" "}
              <button onClick={() => setShowModal(true)} className="text-secondary font-medium hover:underline">
                Sign in to get started
              </button>
            </p>
          </div>
        </div>
      </section>
      <Footer />

      {/* Sign-in modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            {sent ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-heading text-xl font-bold">Enter Verification Code</h2>
                  <p className="text-sm text-muted-foreground mt-1">We sent a code to {email}</p>
                </div>

                <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 text-lg border-secondary/50" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-lg border-secondary/50" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-lg border-secondary/50" />
                      <InputOTPSlot index={3} className="h-12 w-12 text-lg border-secondary/50" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-lg border-secondary/50" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-lg border-secondary/50" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || verifying}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                  size="lg"
                >
                  {verifying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {verifying ? "Verifying..." : "Verify Code"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Or click the magic link in your email
                </p>
              </div>
            ) : (
              <form onSubmit={handleContinue} className="space-y-5">
                <div>
                  <h2 className="font-heading text-xl font-bold">Sign In</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter your email to continue</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-lg border border-secondary/50 bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                  size="lg"
                >
                  {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {submitting ? "Sending..." : "Continue"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
