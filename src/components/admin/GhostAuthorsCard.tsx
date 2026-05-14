import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, RefreshCw, Ghost } from "lucide-react";

interface Ghost {
  author_profile_id: string;
  pen_name: string | null;
  author_slug: string | null;
  best_email: string | null;
  book_count: number;
}

export default function GhostAuthorsCard() {
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-list-ghost-authors", { body: {} });
    if (error) toast({ title: "Failed to load ghosts", description: error.message, variant: "destructive" });
    setGhosts(((data as { ghosts?: Ghost[] })?.ghosts) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sendInvite = async (g: Ghost) => {
    if (!g.best_email) {
      toast({ title: "No email on file", description: "Add owner_email to one of the author's books first.", variant: "destructive" });
      return;
    }
    setInvitingId(g.author_profile_id);
    const { data, error } = await supabase.functions.invoke("admin-invite-ghost-author", {
      body: { author_profile_id: g.author_profile_id },
    });
    setInvitingId(null);
    if (error || !data?.success) {
      toast({ title: "Invite failed", description: error?.message || data?.message, variant: "destructive" });
      return;
    }
    toast({ title: data.message || `Invite sent to ${g.best_email}` });
  };

  const runBackfill = async () => {
    setBackfilling(true);
    const { data, error } = await supabase.functions.invoke("backfill-stripe-subscribers-to-crm", { body: {} });
    setBackfilling(false);
    if (error || !data?.success) {
      toast({ title: "Backfill failed", description: error?.message || data?.message, variant: "destructive" });
      return;
    }
    toast({ title: data.message || "Backfill complete" });
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ghost profiles…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-amber-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Ghost className="h-4 w-4 text-amber-600" />
          Ghost author profiles
          <Badge variant="secondary">{ghosts.length}</Badge>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={runBackfill} disabled={backfilling}>
          {backfilling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Backfill Stripe → CRM
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {ghosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ghost profiles. Every author profile has a valid login.</p>
        ) : (
          <div className="space-y-2">
            {ghosts.map((g) => (
              <div key={g.author_profile_id} className="flex items-center justify-between gap-3 text-sm border rounded-md px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{g.pen_name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {g.best_email || "no email on file"} · {g.book_count} book{g.book_count === 1 ? "" : "s"}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendInvite(g)}
                  disabled={invitingId === g.author_profile_id || !g.best_email}
                >
                  {invitingId === g.author_profile_id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Mail className="h-3 w-3 mr-1" />
                  )}
                  Send claim invite
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
