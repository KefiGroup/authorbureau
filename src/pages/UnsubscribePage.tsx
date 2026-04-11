import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = "loading" | "valid" | "already" | "invalid" | "confirming" | "done" | "error";

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        setStatus("valid");
      } catch { setStatus("error"); }
    })();
  }, [token]);

  const handleConfirm = async () => {
    setStatus("confirming");
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      setStatus("done");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">Email Preferences</h1>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Validating your request…</p>
          </div>
        )}

        {status === "valid" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Click the button below to unsubscribe from future emails from Authors Bureau.
            </p>
            <Button onClick={handleConfirm} variant="destructive" size="lg">
              Confirm Unsubscribe
            </Button>
          </div>
        )}

        {status === "confirming" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Processing…</p>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="text-foreground font-medium">You've been unsubscribed.</p>
            <p className="text-sm text-muted-foreground">You will no longer receive emails from Authors Bureau.</p>
          </div>
        )}

        {status === "already" && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-amber-500" />
            <p className="text-foreground font-medium">Already unsubscribed</p>
            <p className="text-sm text-muted-foreground">This email address has already been unsubscribed.</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-foreground font-medium">Invalid or expired link</p>
            <p className="text-sm text-muted-foreground">This unsubscribe link is no longer valid.</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-foreground font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground">Please try again later or contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
}
