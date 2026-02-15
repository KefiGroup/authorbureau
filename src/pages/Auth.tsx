import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Auth() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const { isAdmin } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <h1 className="mb-6 font-heading text-2xl font-bold text-center">
              Sign In
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <label className="mb-1.5 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
                  placeholder="••••••••"
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
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a
                href="/join"
                className="text-secondary font-medium hover:underline"
              >
                Join as an Author
              </a>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
