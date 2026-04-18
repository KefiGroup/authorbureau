import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { callMarketingHubState } from "@/lib/marketing-hub-state";

export default function SettingsTab({ authorId }: { authorId: string | null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [verified, setVerified] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await callMarketingHubState<{ settings: any }>("email_settings");
      const s = result?.settings ?? {};
      setSenderName(s.sender_name || "");
      setReplyTo(s.reply_to_email || "");
      setVerified(!!s.domain_verified);
    } catch (e: any) {
      toast({ title: "Couldn't load settings", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId]);

  const handleSave = async () => {
    if (!senderName.trim()) {
      toast({ title: "Sender name required", description: "Please enter a sender name.", variant: "destructive" });
      return;
    }
    if (!replyTo.trim()) {
      toast({ title: "Reply-to email required", description: "Please enter a reply-to email address.", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(replyTo.trim())) {
      toast({ title: "Invalid email", description: "Please enter a valid reply-to email address.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await callMarketingHubState<{ settings: any }>("save_email_settings", {
        sender_name: senderName,
        reply_to_email: replyTo,
      });
      const s = result?.settings ?? {};
      setSenderName(s.sender_name || senderName);
      setReplyTo(s.reply_to_email || "");
      setVerified(!!s.domain_verified);
      toast({ title: "Settings saved", description: "Your email settings have been updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold">Sender Identity</h3>
          <p className="text-sm text-muted-foreground mt-1">How your name appears in subscriber inboxes.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sender">Sender name</Label>
          <Input id="sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name or brand" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reply">Reply-to email</Label>
          <Input id="reply" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="you@yourdomain.com" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Sending Domain</h3>
          {verified ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="text-xs text-amber-600">Pending</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Your emails are sent through Authors Bureau's managed delivery. No DNS setup needed.
        </p>
        {!verified && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => { window.location.href = "/account-settings?tab=connections"; }}
          >
            Verify domain & connections
          </Button>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save settings
      </Button>
    </div>
  );
}
