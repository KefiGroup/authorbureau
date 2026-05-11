import { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldCheck, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/shared-backend";
import { adminApi } from "@/lib/admin-api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AdminAuth() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [magicLinkProcessing, setMagicLinkProcessing] = useState(false);
  const { toast } = useToast();

  const redirectTo = (() => {
    const r = new URLSearchParams(location.search).get("redirect");
    if (r && r.startsWith("/")) return r;
    return "/admin";
  })();

  // Magic link handling
  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.replace("#", ""));
    const authToken = params.get("auth_token");
    if (!authToken) return;

    setMagicLinkProcessing(true);
    (async () => {
      try {
        const data = await adminApi.verifyToken(authToken);
        const tokenHash = data?.token_hash;
        if (!tokenHash) throw new Error("No token_hash returned.");

        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: data?.type || "email" });
        if (error) throw error;
        sessionStorage.setItem("ab_admin_auth", "true");

        window.history.replaceState(null, "", location.pathname);
        navigate("/admin", { replace: true });
      } catch (err) {
        toast({ title: err.message || "Admin magic link failed", variant: "destructive" });
      } finally {
        setMagicLinkProcessing(false);
      }
    })();
  }, [location.hash, location.pathname, navigate, toast]);

  if (loading || magicLinkProcessing) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="py-20">
          <div className="container max-w-md flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user && !isAdmin) return <Navigate to="/dashboard" replace />;

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.requestCode(email.trim());
      setSent(true);
    } catch (err) {
      toast({ title: err.message || "Failed to send code", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      const data = await adminApi.verify(email.trim(), otp);

      const tokenHash = data?.token_hash;
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: data?.type || "email" });
        if (error) throw error;
        sessionStorage.setItem("ab_admin_auth", "true");
        navigate("/admin", { replace: true });
        return;
      }

      // Fallback: session tokens
      const accessToken = data?.access_token || data?.session?.access_token;
      const refreshToken = data?.refresh_token || data?.session?.refresh_token;
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        sessionStorage.setItem("ab_admin_auth", "true");
        navigate("/admin", { replace: true });
        return;
      }

      throw new Error("Login succeeded but no session was returned.");
    } catch (err) {
      toast({ title: err.message || "Verification failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold">Admin Sign In</h1>
                <p className="text-sm text-muted-foreground">Authors Bureau administration</p>
              </div>
            </div>

            {sent ? (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">We sent a code to <strong>{email}</strong></p>

                <button onClick={() => { setSent(false); setOtp(""); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg border-primary/50" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || verifying}
                  className="w-full font-semibold rounded-full"
                  size="lg"
                >
                  {verifying && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {verifying ? "Verifying..." : "Verify Code"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">Or click the magic link in your email</p>
              </div>
            ) : (
              <form onSubmit={handleContinue} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Admin email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-lg border border-primary/50 bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full font-semibold rounded-full" size="lg">
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {submitting ? "Sending..." : "Continue"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Only authorized administrators can sign in here.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
