import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, BookOpen, Check } from "lucide-react";

type Mode = "master" | "book_specific";

const OPTIONS: Array<{ value: Mode; title: string; blurb: string; icon: typeof Mail }> = [
  {
    value: "master",
    title: "One welcome sequence for everything",
    blurb:
      "Every new subscriber gets the same welcome emails, whichever book brought them in. Best when all your books share one message.",
    icon: Mail,
  },
  {
    value: "book_specific",
    title: "A welcome sequence per book",
    blurb:
      "Readers get the welcome emails of the book they signed up through. If that book has none yet, they get your main sequence instead.",
    icon: BookOpen,
  },
];

export default function WelcomeFlowModeCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("master");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Mode | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.id) {
      setAuthorId(profile.id);
      const { data } = await supabase
        .from("author_email_settings")
        .select("welcome_flow_mode")
        .eq("author_id", profile.id)
        .maybeSingle();
      if (data?.welcome_flow_mode === "book_specific") setMode("book_specific");
      else setMode("master");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const choose = async (next: Mode) => {
    if (!authorId || next === mode) return;
    setSaving(next);
    const { error } = await supabase
      .from("author_email_settings")
      .upsert(
        { author_id: authorId, welcome_flow_mode: next },
        { onConflict: "author_id" },
      );
    setSaving(null);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setMode(next);
    toast({
      title: "Saved",
      description:
        next === "master"
          ? "New subscribers will get your main welcome sequence."
          : "New subscribers will get the welcome sequence of the book they joined through.",
    });
  };

  if (!user) return null;

  return (
    <Card className="border-secondary/20">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-heading font-semibold">Which welcome emails go out?</h3>
            <p className="text-sm text-muted-foreground">
              Choose what a new subscriber receives the moment they join your list.
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={loading || !authorId || saving !== null}
                onClick={() => choose(opt.value)}
                className={`text-left rounded-xl border p-4 transition-colors disabled:opacity-60 ${
                  active
                    ? "border-secondary bg-secondary/10"
                    : "border-border hover:border-secondary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-4 w-4 text-secondary" />
                  <span className="font-medium text-sm">{opt.title}</span>
                  {active && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      <Check className="h-3 w-3 mr-1" /> In use
                    </Badge>
                  )}
                  {saving === opt.value && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.blurb}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
