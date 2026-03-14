import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Flame, Trophy, ArrowRight, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface PortalContext {
  readerProfile: { id: string; display_name: string | null } | null;
  user: { id: string; email?: string };
}

export default function PortalHome() {
  useDocumentMeta({
    title: "Readers Portal | Authors Bureau",
    description: "Your personal hub for reading challenges, courses, and more.",
  });

  const { readerProfile } = useOutletContext<PortalContext>();
  const [activeChallenges, setActiveChallenges] = useState(0);
  const [totalBadges, setTotalBadges] = useState(0);

  useEffect(() => {
    if (!readerProfile) return;
    Promise.all([
      supabase.from("reading_challenges").select("id", { count: "exact", head: true }).eq("reader_id", readerProfile.id).eq("status", "active"),
      supabase.from("reader_badges").select("id", { count: "exact", head: true }).eq("reader_id", readerProfile.id),
    ]).then(([challenges, badges]) => {
      setActiveChallenges(challenges.count || 0);
      setTotalBadges(badges.count || 0);
    });
  }, [readerProfile]);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Welcome back, {readerProfile?.display_name || "Reader"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening in your reading journey.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[hsl(var(--accent))]/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-[hsl(var(--accent))]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeChallenges}</p>
            <p className="text-xs text-muted-foreground">Active Challenges</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Flame className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{readerProfile?.display_name ? "0" : "–"}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalBadges}</p>
            <p className="text-xs text-muted-foreground">Badges Earned</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/portal/reading-club"
          className="group bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--accent))]/20 transition-colors">
              <BookOpen className="h-6 w-6 text-[hsl(var(--accent))]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Reading Club</h3>
              <p className="text-sm text-muted-foreground">Browse books & log today's reading</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[hsl(var(--accent))] transition-colors" />
        </Link>

        <Link
          to="/portal/library"
          className="group bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
              <Library className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">My Library</h3>
              <p className="text-sm text-muted-foreground">Access purchased content</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary transition-colors" />
        </Link>
      </div>

      {/* Coming soon sections */}
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <p className="text-muted-foreground text-sm">
          🎯 AI-powered recommendations, course player, and coaching sessions are coming soon!
        </p>
      </div>
    </div>
  );
}
