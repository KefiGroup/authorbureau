import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, Circle, Mail, Info, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { callMarketingHubState } from "@/lib/marketing-hub-state";

type EmailSettings = {
  sender_name?: string;
  reply_to_email?: string;
  domain_verified?: boolean;
  verification_sent_at?: string | null;
  verified_at?: string | null;
};

export default function SettingsTab({ authorId }: { authorId: string | null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [savedReplyTo, setSavedReplyTo] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [verificationSentAt, setVerificationSentAt] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const applySettings = (s: EmailSettings) => {
    setSenderName(s.sender_name || "");
    setReplyTo(s.reply_to_email || "");
    setSavedReplyTo(s.reply_to_email || "");
    setVerified(!!s.domain_verified);
    setVerifiedAt(s.verified_at ?? null);
    setVerificationSentAt(s.verification_sent_at ?? null);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await callMarketingHubState<{ settings: EmailSettings }>("email_settings");
      applySettings(result?.settings ?? {});
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const senderNameSaved = !!senderName.trim();
  const replyToSaved = !!savedReplyTo && emailRegex.test(savedReplyTo);
  const emailSent = !!verificationSentAt;

  const handleSave = async () => {
    if (!senderName.trim()) {
      toast({ title: "Sender name required", description: "Please enter a sender name.", variant: "destructive" });
      return;
    }
    if (!replyTo.trim()) {
      toast({ title: "Reply-to email required", description: "Please enter a reply-to email address.", variant: "destructive" });
      return;
    }
    if (!emailRegex.test(replyTo.trim())) {
      toast({ title: "Invalid email", description: "Please enter a valid reply-to email address.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await callMarketingHubState<{ settings: EmailSettings }>("save_email_settings", {
        sender_name: senderName,
        reply_to_email: replyTo,
      });
      applySettings(result?.settings ?? {});
      toast({ title: "Settings saved", description: "Your email settings have been updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!replyToSaved) {
      toast({ title: "Save your reply-to email first", description: "We need a saved email address to send the confirmation to.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const result = await callMarketingHubState<{ sent_to: string; sent_at: string; already_verified?: boolean }>("send_verification_email");
      if (result?.already_verified) {
        toast({ title: "Already verified", description: "Your sender email is already confirmed." });
        await loadSettings();
        return;
      }
      setVerificationSentAt(result?.sent_at ?? new Date().toISOString());
      toast({
        title: "Confirmation email sent",
        description: `Check ${result?.sent_to ?? savedReplyTo} for a verification link.`,
      });
    } catch (e: any) {
      toast({ title: "Couldn't send email", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const StepRow = ({ done, title, hint }: { done: boolean; title: string; hint?: string }) => (
    <div className="flex items-start gap-3">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-foreground" : "text-foreground"}`}>{title}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Sender Identity */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold">Sender Identity</h3>
          <p className="text-sm text-muted-foreground mt-1">How your name appears in subscriber inboxes.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sender">Sender name <span className="text-destructive">*</span></Label>
          <Input id="sender" required value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name or brand" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reply">Reply-to email <span className="text-destructive">*</span></Label>
          <Input id="reply" type="email" required value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="you@yourdomain.com" />
          <p className="text-xs text-muted-foreground">Replies from your subscribers will go here.</p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save sender details
        </Button>
      </div>

      {/* Sending Status */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Sending Status</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your emails are sent through Authors Bureau's managed delivery — no DNS setup needed. We just need to confirm you own the reply-to inbox.
            </p>
          </div>
          {verified ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full whitespace-nowrap">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full whitespace-nowrap">
              <Circle className="h-3.5 w-3.5" /> Pending
            </span>
          )}
        </div>

        {/* Checklist */}
        <div className="space-y-3 rounded-lg bg-muted/40 p-4">
          <StepRow done={senderNameSaved} title="Sender name set" />
          <StepRow done={replyToSaved} title="Reply-to email saved" />
          <StepRow
            done={verified}
            title="Reply-to email confirmed"
            hint={
              verified
                ? verifiedAt
                  ? `Confirmed on ${new Date(verifiedAt).toLocaleDateString()}`
                  : "Confirmed"
                : emailSent
                  ? `We sent a confirmation link to ${savedReplyTo}. Click it to finish setup.`
                  : "Click the button below to send a one-click confirmation link."
            }
          />
        </div>

        {/* Action */}
        {!verified && (
          <div className="space-y-2">
            <Button
              onClick={handleSendVerification}
              disabled={sending || !replyToSaved}
              className="w-full sm:w-auto"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : emailSent ? (
                <Send className="h-4 w-4 mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {emailSent ? "Resend confirmation email" : "Send confirmation email"}
            </Button>
            {!replyToSaved && (
              <p className="text-xs text-amber-600">
                Save a valid reply-to email above first.
              </p>
            )}
            {replyToSaved && (
              <p className="text-xs text-muted-foreground">
                We'll email <span className="font-medium text-foreground">{savedReplyTo}</span> with a one-click verification link.
              </p>
            )}
          </div>
        )}

        {/* What does verified mean? */}
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
          What does "verified" mean?
        </button>
        {showInfo && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
            Verification confirms you own the reply-to inbox. This way, replies from your subscribers actually reach you, and email providers (Gmail, Outlook) trust your messages so they land in the inbox instead of spam. There's no DNS or domain setup — just one click on the link we email you.
          </div>
        )}
      </div>
    </div>
  );
}
