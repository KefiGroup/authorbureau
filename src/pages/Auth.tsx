import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PUBLISHNOW_URL = "https://publishnowinterface.lovable.app";

export default function Auth() {
  const { user, loading, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);

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

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-20">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] text-center space-y-6">
            <h1 className="font-heading text-2xl font-bold">Sign In to AI Marketing Studio</h1>
            <p className="text-sm text-muted-foreground">
              Authors Bureau uses your PublishNow account. Sign in through PublishNow, then navigate to the AI Marketing Studio from your dashboard.
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
              Don't have an account?{" "}
              <a href="/join" className="text-secondary font-medium hover:underline">
                Join as an Author
              </a>
            </p>
          </div>
        </div>
      </section>
      <Footer />

      {/* PublishNow iframe modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl h-[80vh] rounded-2xl overflow-hidden border border-border shadow-2xl bg-background">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 z-10 rounded-full bg-background/80 p-1.5 hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              src={PUBLISHNOW_URL}
              className="w-full h-full border-0"
              title="Sign in via PublishNow"
              allow="clipboard-write"
            />
          </div>
        </div>
      )}
    </div>
  );
}
