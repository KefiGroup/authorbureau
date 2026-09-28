import { BookOpen, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
  activeCount: number;
}

export default function ReadingClubHero({ user, activeCount }: Props) {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-secondary/10 p-4">
            <BookOpen className="h-10 w-10 text-secondary" />
          </div>
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight lg:text-5xl mb-4">
          100-Day <span className="text-gradient-gold">Reading Challenge</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
          Pick any book. Commit to <strong>2 minutes of reading a day</strong> for 100 days.
          We'll be your accountability partner. It's a trust system.
        </p>
        <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto mb-8">
          Browse the catalog below, start a challenge, and log your daily reads. No pressure, just consistency.
        </p>

        {!user ? (
          <Button asChild size="lg">
            <Link to="/readers-bureau/auth">
              <LogIn className="mr-2 h-4 w-4" /> Sign In to Start a Challenge
            </Link>
          </Button>
        ) : activeCount > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary text-sm font-medium">
            <BookOpen className="h-4 w-4" /> You have {activeCount} active challenge{activeCount !== 1 ? "s" : ""}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">👇 Browse the catalog and start your first challenge!</p>
        )}
      </div>
    </section>
  );
}
