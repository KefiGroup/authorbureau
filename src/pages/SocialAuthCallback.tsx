import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";

export default function SocialAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting your account…");

  useEffect(() => {
    (async () => {
      const code = params.get("code");
      const state = params.get("state");
      const errorParam = params.get("error_description") || params.get("error");
      if (errorParam) {
        setStatus("error");
        setMessage(errorParam);
        return;
      }
      if (!code || !state) {
        setStatus("error");
        setMessage("Missing OAuth code or state.");
        return;
      }
      let platform = "";
      try {
        platform = JSON.parse(atob(state)).p;
      } catch {
        setStatus("error");
        setMessage("Invalid state.");
        return;
      }
      const token = await getActiveToken({ forceRefresh: true });
      if (!token) {
        setStatus("error");
        setMessage("Please sign in first.");
        return;
      }

      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-connect-callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state, platform, origin: window.location.origin }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || "Connection failed.");
        return;
      }
      setStatus("success");
      setMessage(`Connected ${platform} as ${data.account_name}`);
      setTimeout(() => navigate("/connect-settings"), 1500);
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md w-full text-center">
        {status === "loading" && <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-4" />}
        {status === "success" && <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-4" />}
        {status === "error" && <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-4" />}
        <p className="text-sm">{message}</p>
        {status === "error" && (
          <Button className="mt-4" onClick={() => navigate("/connect-settings")}>
            Back to Connect Settings
          </Button>
        )}
      </Card>
    </div>
  );
}
