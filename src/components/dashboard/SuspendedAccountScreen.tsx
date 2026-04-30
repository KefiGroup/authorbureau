import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Pause, Mail, LogOut } from "lucide-react";

interface Props {
  reason?: string | null;
  suspendedAt?: string | null;
}

export default function SuspendedAccountScreen({ reason, suspendedAt }: Props) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-8 space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Pause className="h-7 w-7 text-amber-700" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Account paused</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your Authors Bureau dashboard access is currently paused
            {suspendedAt && ` since ${new Date(suspendedAt).toLocaleDateString()}`}.
            Your public author site and existing book pages remain live for your readers.
          </p>
        </div>
        {reason && (
          <div className="text-left rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Reason from admin</p>
            <p className="text-sm">{reason}</p>
          </div>
        )}
        <div className="space-y-2">
          <Button asChild className="w-full">
            <a href="mailto:support@authorsbureau.com">
              <Mail className="h-4 w-4 mr-2" /> Contact support@authorsbureau.com
            </a>
          </Button>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}
