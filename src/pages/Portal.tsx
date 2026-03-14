import { Link } from "react-router-dom";
import { GraduationCap, BookHeart, Library, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Portal() {
  const { user } = useAuth();

  // If logged in and has purchases, redirect to reader-portal
  // For now, show a friendly "coming soon" page
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="max-w-lg mx-auto text-center px-4 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--accent))]/10 flex items-center justify-center mx-auto">
            <GraduationCap className="h-8 w-8 text-[hsl(var(--accent))]" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Readers Portal</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your personal hub for purchased courses, coaching sessions, memberships, and reading challenges is launching soon!
          </p>
          <p className="text-muted-foreground text-sm">
            In the meantime, explore the Reading Club and discover books from world-class authors.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to="/reading-club">
                <BookHeart className="h-4 w-4 mr-2" />
                Explore Reading Club
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/directory">
                <Library className="h-4 w-4 mr-2" />
                Browse Authors
              </Link>
            </Button>
          </div>
          {user && (
            <div className="pt-4 border-t border-border">
              <Link to="/reader-portal" className="text-sm text-secondary hover:underline inline-flex items-center gap-1">
                View My Purchases <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
