import { useState, useEffect, useCallback } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { fetchWithTimeout } from "@/lib/get-active-token";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── Unified session helper ───
async function establishSession(sessionData: { access_token: string; refresh_token: string }) {
  await supabase.auth.signOut({ scope: "local" });
  const { error } = await supabase.auth.setSession({
    access_token: sessionData.access_token,
    refresh_token: sessionData.refresh_token,
  });
  if (error) throw error;
}

// ─── Error mapping ───
function friendlyError(status: number, serverMsg?: string): string {
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status === 401) return serverMsg?.toLowerCase().includes("credential") ? "Invalid credentials." : "Invalid or expired code.";
  if (status === 400 && serverMsg) return serverMsg;
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return serverMsg || "Something went wrong.";
}

// Detect network-layer failures (offline, CORS, Safari ITP, aborted fetches, timeouts)
// where we should fall back to the local Supabase auth client.
function isNetworkLikeError(err: any): boolean {
  if (!err) return false;
  const name = String(err?.name || "").toLowerCase();
  const msg = String(err?.message || "").toLowerCase();
  return (
    err instanceof TypeError ||
    name === "aborterror" ||
    name === "timeouterror" ||
    msg.includes("failed to fetch") ||
    msg.includes("operation was aborted") ||
    msg.includes("aborted") ||
    msg.includes("network") ||
    msg.includes("load failed")
  );
}

async function authFetch(body: Record<string, unknown>) {
  const res = await fetchWithTimeout(
    `${SHARED_BACKEND_URL}/functions/v1/user-auth`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, source_platform: "authorsbureau" }),
    },
    12000
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data?.authUrl) {
      window.location.href = data.authUrl;
      return data;
    }
    throw new Error(friendlyError(res.status, data?.error || data?.message));
  }
  return data;
}

type SignInMode = "code" | "password";
type FlowState = "email" | "otp" | "password-enter" | "forgot-email" | "forgot-reset";

export default function Auth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const redirectTo = new URLSearchParams(location.search).get("redirect") || "/dashboard";

  const [mode, setMode] = useState<SignInMode>("code");
  const [flow, setFlow] = useState<FlowState>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkProcessing, setMagicLinkProcessing] = useState(false);
  const [authLoadingFallback, setAuthLoadingFallback] = useState(false);

  // Resend timer
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // ─── Magic link handling ───
  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const cleanHash = hash.replace(/^#\/?/, "");
    const params = new URLSearchParams(cleanHash);
    const authToken = params.get("auth_token");
    if (!authToken) return;

    setMagicLinkProcessing(true);
    (async () => {
      try {
        const data = await authFetch({ action: "verify_token", token: authToken });
        if (data?.session_data) {
          await establishSession(data.session_data);
        } else if (data?.authUrl) {
          window.location.href = data.authUrl;
          return;
        } else {
          throw new Error("No session returned from magic link.");
        }
        window.history.replaceState(null, "", location.pathname);
      } catch (err: any) {
        toast({ title: err.message || "Magic link sign-in failed", variant: "destructive" });
      } finally {
        setMagicLinkProcessing(false);
      }
    })();
  }, [location.hash, location.pathname, toast]);

  // Fail-safe
  useEffect(() => {
    if (!loading) { setAuthLoadingFallback(false); return; }
    const timeout = setTimeout(() => setAuthLoadingFallback(true), 2500);
    return () => clearTimeout(timeout);
  }, [loading]);

  if ((loading && !authLoadingFallback) || magicLinkProcessing) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="py-20">
          <div className="container max-w-md flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-sm text-muted-foreground">Preparing sign in...</p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }
  if (user) return <Navigate to={redirectTo} replace />;

  // ─── Continue: step 1 → step 2 based on mode ───
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (mode === "password") {
      // Just show the password field
      setFlow("password-enter");
      return;
    }

    // Email Code mode: send OTP
    setSubmitting(true);
    try {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      try {
        await authFetch({ action: "request_code", email: email.trim() });
        setFlow("otp");
        setResendCooldown(60);
      } catch (networkErr: any) {
        const msg = (networkErr?.message || "").toLowerCase();
        if (isNetworkLikeError(networkErr) || msg.includes("no account") || msg.includes("sign up") || msg.includes("invalid action")) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: crypto.randomUUID(),
            options: { emailRedirectTo: `${window.location.origin}/auth` },
          });
          if (signUpError) {
            const { error } = await supabase.auth.signInWithOtp({
              email: email.trim(),
              options: { emailRedirectTo: `${window.location.origin}/auth` },
            });
            if (error) throw error;
            toast({ title: "We sent you a sign-in link to your email." });
          } else {
            toast({ title: "Account created! Check your email for a confirmation link to get started." });
          }
          setResendCooldown(60);
        } else {
          throw networkErr;
        }
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setSubmitting(true);
    try {
      await authFetch({ action: "request_code", email: email.trim() });
      setResendCooldown(60);
      toast({ title: "New code sent to your email." });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = codeOverride ?? otp;
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      try {
        const data = await authFetch({ action: "verify", email: email.trim(), code });
        if (data && data.success === false) {
          throw new Error(data.error || "Verification failed. Please try again.");
        }
        if (data?.session_data?.access_token) {
          await establishSession(data.session_data);
        } else if (data?.authUrl) {
          window.location.href = data.authUrl;
          return;
        } else {
          throw new Error("Sign-in verified but no session was returned. Please try the magic link in your email instead.");
        }
      } catch (primaryErr: any) {
        const msg = primaryErr?.message || "";
        const { data: localAuth, error: localErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code,
          type: "email",
        });
        if (localErr || !localAuth?.session) {
          setOtp("");
          throw new Error(isNetworkLikeError(primaryErr)
            ? "Verification service is temporarily unavailable. Please click the magic link in your email instead."
            : msg || "Invalid or expired code. Please request a new one.");
        }
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      try {
        const data = await authFetch({ action: "password_login", email: email.trim(), password });
        if (data && data.success === false) {
          throw new Error(data.error || "Sign-in failed. Please try again.");
        }
        if (data?.session_data?.access_token) {
          await establishSession(data.session_data);
        } else if (data?.authUrl) {
          window.location.href = data.authUrl;
          return;
        } else {
          throw new Error("Sign-in verified but no session was returned.");
        }
      } catch (networkErr: any) {
        if (isNetworkLikeError(networkErr)) {
          const { data: directAuth, error: directAuthError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (directAuthError) throw directAuthError;
          if (!directAuth?.session) throw new Error("Sign-in failed. Please try again.");
        } else {
          throw networkErr;
        }
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await authFetch({ action: "forgot_password", email: email.trim() });
      setFlow("forgot-reset");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !password || password !== confirmPassword) return;
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const data = await authFetch({
        action: "reset_password",
        email: email.trim(),
        code: otp,
        password,
      });
      if (data && data.success === false) {
        throw new Error(data.error || "Password reset failed. Please try again.");
      }
      if (data?.session_data?.access_token) {
        await establishSession(data.session_data);
        toast({ title: "Password reset successfully!" });
      } else if (data?.authUrl) {
        window.location.href = data.authUrl;
        return;
      } else {
        throw new Error("Password reset succeeded but no session was returned.");
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setFlow("email");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
  };

  const switchMode = (newMode: SignInMode) => {
    setMode(newMode);
    setFlow("email");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
  };

  // ─── Render ───
  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] space-y-6">
            <div className="text-center">
              <h1 className="font-heading text-2xl font-bold">Sign In</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your email to continue</p>
            </div>

            {/* Mode toggle — only show on initial email step */}
            {flow === "email" && (
              <Tabs value={mode} onValueChange={(v) => switchMode(v as SignInMode)} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="code" className="gap-1.5">
                    <Mail className="h-4 w-4" /> Email Code
                  </TabsTrigger>
                  <TabsTrigger value="password" className="gap-1.5">
                    <KeyRound className="h-4 w-4" /> Password
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* ─── Step 1: Email + Continue (both modes) ─── */}
            {flow === "email" && (
              <form onSubmit={handleContinue} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus
                    className="mt-1.5"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                  size="lg"
                >
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {submitting ? "Continuing…" : "Continue"}
                </Button>
              </form>
            )}

            {/* ─── Step 2a: Email Code → OTP ─── */}
            {flow === "otp" && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-heading text-lg font-bold">Enter Verification Code</h2>
                  <p className="text-sm text-muted-foreground mt-1">We sent a 6-character code to <strong>{email}</strong></p>
                </div>

                <button onClick={resetFlow} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      if (value.length === 6 && !submitting) void handleVerifyOtp(value);
                    }}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg border-secondary/50" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={() => void handleVerifyOtp()}
                  disabled={otp.length !== 6 || submitting}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                  size="lg"
                >
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {submitting ? "Verifying…" : "Verify Code"}
                </Button>

                <div className="text-center space-y-1">
                  <button
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || submitting}
                    className="text-sm font-medium text-secondary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
                  </button>
                  <p className="text-xs text-muted-foreground">Or click the magic link in your email</p>
                </div>
              </div>
            )}

            {/* ─── Step 2b: Password → enter password ─── */}
            {flow === "password-enter" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <h2 className="font-heading text-lg font-bold">Enter Password</h2>
                  <p className="text-sm text-muted-foreground mt-1">Sign in as <strong>{email}</strong></p>
                </div>

                <button type="button" onClick={resetFlow} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div>
                  <Label htmlFor="pw-password">Password</Label>
                  <Input
                    id="pw-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoFocus
                    className="mt-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => setFlow("forgot-email")}
                    className="text-xs text-secondary hover:underline mt-1.5"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                  size="lg"
                >
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {submitting ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            )}

            {/* ─── Forgot password: enter email ─── */}
            {flow === "forgot-email" && (
              <form onSubmit={handleForgotEmail} className="space-y-4">
                <div>
                  <h2 className="font-heading text-lg font-bold">Reset Your Password</h2>
                  <p className="text-sm text-muted-foreground mt-1">We'll send a reset code to your email.</p>
                </div>

                <button type="button" onClick={resetFlow} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </button>

                <div>
                  <Label htmlFor="forgot-email">Email address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1.5"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                  size="lg"
                >
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {submitting ? "Sending…" : "Send Reset Code"}
                </Button>
              </form>
            )}

            {/* ─── Forgot password: enter code + new password ─── */}
            {flow === "forgot-reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <h2 className="font-heading text-lg font-bold">Set New Password</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter the 6-character code sent to <strong>{email}</strong> and your new password.</p>
                </div>

                <button type="button" onClick={() => setFlow("forgot-email")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg border-secondary/50" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div>
                  <Label htmlFor="new-pw">New password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-pw">Confirm password</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="mt-1.5"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={otp.length !== 6 || !password || password !== confirmPassword || submitting}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                  size="lg"
                >
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {submitting ? "Resetting…" : "Reset Password & Sign In"}
                </Button>
              </form>
            )}

            {/* Bottom link */}
            <div className="text-center pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <span className="text-secondary font-medium">Sign up — just enter your email above.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
