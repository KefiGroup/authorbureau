import { useState, useEffect, useCallback } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Mail, KeyRound, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { establishSharedSession, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function friendlyError(status: number, serverMsg?: string): string {
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status === 401) return serverMsg?.toLowerCase().includes("credential") ? "Invalid credentials." : "Invalid or expired code.";
  if (status === 400 && serverMsg) return serverMsg;
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return serverMsg || "Something went wrong.";
}

async function authFetch(body: Record<string, unknown>) {
  const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/user-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, source_platform: "authorsbureau" }),
  });
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
type FlowState = "email" | "otp" | "password-login";

export default function ReaderAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const redirectTo = new URLSearchParams(location.search).get("redirect") || "/readers-bureau";

  const [mode, setMode] = useState<SignInMode>("password");
  const [flow, setFlow] = useState<FlowState>("password-login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authLoadingFallback, setAuthLoadingFallback] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  useEffect(() => {
    if (!loading) {
      setAuthLoadingFallback(false);
      return;
    }
    const timeout = setTimeout(() => setAuthLoadingFallback(true), 2500);
    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading && !authLoadingFallback) {
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

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await authFetch({ action: "request_code", email: email.trim() });
      setFlow("otp");
      setResendCooldown(60);
    } catch (err) {
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
    } catch (err) {
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
      const data = await authFetch({ action: "verify", email: email.trim(), code });
      if (data && data.success === false) throw new Error(data.error || "Verification failed.");
      if (data?.session_data?.access_token) {
        await establishSharedSession(data.session_data);
      } else if (data?.authUrl) {
        window.location.href = data.authUrl;
        return;
      } else {
        setOtp("");
        throw new Error("Invalid or expired code. Please request a new one.");
      }
    } catch (err) {
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
      const data = await authFetch({ action: "password_login", email: email.trim(), password });
      if (data && data.success === false) throw new Error(data.error || "Sign-in failed.");
      if (data?.session_data?.access_token) {
        await establishSharedSession(data.session_data);
      } else if (data?.authUrl) {
        window.location.href = data.authUrl;
        return;
      } else {
        throw new Error("Sign-in verified but no session was returned.");
      }
    } catch (err) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setFlow(mode === "code" ? "email" : "password-login");
    setOtp("");
    setPassword("");
  };

  const switchMode = (newMode: SignInMode) => {
    setMode(newMode);
    setFlow(newMode === "code" ? "email" : "password-login");
    setOtp("");
    setPassword("");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-secondary" />
              </div>
              <h1 className="font-heading text-2xl font-bold">Sign In to Readers Bureau</h1>
              <p className="text-sm text-muted-foreground">
                New here? Just enter your email — we'll create your reader account automatically.
              </p>
            </div>

            {(flow === "email" || flow === "password-login") && (
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

            {/* Email Code: enter email */}
            {flow === "email" && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <Label htmlFor="reader-email">Email address</Label>
                  <Input
                    id="reader-email"
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
                  {submitting ? "Sending…" : "Send Sign-In Code"}
                </Button>
              </form>
            )}

            {/* Verify OTP */}
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
                <div className="text-center">
                  <button
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || submitting}
                    className="text-sm font-medium text-secondary hover:underline disabled:text-muted-foreground"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>
              </div>
            )}

            {/* Password login */}
            {flow === "password-login" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <Label htmlFor="reader-pw-email">Email address</Label>
                  <Input
                    id="reader-pw-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="reader-pw">Password</Label>
                  <Input
                    id="reader-pw"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
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
                  {submitting ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Are you an author?{" "}
                <Link to="/auth" className="text-secondary hover:underline font-medium">
                  Sign in to Authors Dashboard →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
