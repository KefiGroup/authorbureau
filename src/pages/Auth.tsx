import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, ArrowLeft, Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Step = "email" | "otp";

export default function Auth() {
  const { user, loading, isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) return (
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
  if (user) return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      setStep("otp");
      toast({ title: "Verification code sent!", description: `Check your inbox at ${email}` });
    }

    setSubmitting(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setSubmitting(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      toast({ title: error.message, variant: "destructive" });
      setOtp("");
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">

            {step === "email" && (
              <>
                <h1 className="mb-2 font-heading text-2xl font-bold text-center">Sign In</h1>
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  We'll send a verification code to your email
                </p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="your@email.com"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                    size="lg"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Send Verification Code
                  </Button>
                </form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <a href="/join" className="text-secondary font-medium hover:underline">
                    Join as an Author
                  </a>
                </p>
              </>
            )}

            {step === "otp" && (
              <>
                <h1 className="mb-2 font-heading text-2xl font-bold text-center">
                  Enter Verification Code
                </h1>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  We sent a code to {email}
                </p>

                <button
                  onClick={() => { setStep("email"); setOtp(""); }}
                  className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || otp.length < 6}
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full"
                    size="lg"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="mr-2 h-4 w-4" />
                    )}
                    Verify Code
                  </Button>
                </form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Or click the magic link in your email
                </p>
              </>
            )}

          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
