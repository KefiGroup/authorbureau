import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";
import { getSharedSession } from "@/lib/shared-backend";

async function waitForToken(maxMs = 6000): Promise<string | null> {
  const start = Date.now();
  // Try cached/getSession path repeatedly while shared-auth restores from storage.
  while (Date.now() - start < maxMs) {
    const t = await getActiveToken();
    if (t) return t;
    // Nudge restore from sessionStorage fallback.
    await getSharedSession().catch(() => null);
    await new Promise((r) => setTimeout(r, 250));
  }
  // Last attempt with force refresh.
  return await getActiveToken({ forceRefresh: true });
}

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

      const token = await waitForToken();
      if (!token) {
        setStatus("error");
        setMessage("Your sign-in session expired during the redirect. Please sign in again, then click Connect.");
        return;
      }

      try {
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
        const data = await res.json().catch(() => ({}));

        // Two-step Facebook flow: ask the author which Page to connect.
        if (data?.needs_page_selection && data?.temp_token && Array.isArray(data?.pages)) {
          try {
            sessionStorage.setItem(
              `social_pick_pages_${data.temp_token}`,
              JSON.stringify({ platform: data.platform || platform, pages: data.pages, ts: Date.now() }),
            );
          } catch (_) {}
          setStatus("success");
          setMessage("Almost done — choose your Facebook Page…");
          const qs = new URLSearchParams({
            social: "pick-page",
            platform: data.platform || platform,
            token: data.temp_token,
          }).toString();
          setTimeout(() => navigate(`/connect-settings?${qs}`), 600);
          return;
        }

        if (!res.ok || !data.success) {
          setStatus("error");
          setMessage(data.error || `Connection failed (HTTP ${res.status}).`);
          return;
        }
        setStatus("success");
        setMessage(`Connected ${platform} as ${data.account_name}`);
        const qs = new URLSearchParams({
          social: "connected",
          platform,
          account: data.account_name || "",
        }).toString();
        setTimeout(() => navigate(`/connect-settings?${qs}`), 1200);
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Connection failed.");
      }
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
