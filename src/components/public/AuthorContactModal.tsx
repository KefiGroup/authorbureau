import { useState } from "react";
import { X, Send, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { autoEnrollSubscriber } from "@/lib/email-sequence-hook";

interface AuthorContactModalProps {
  open: boolean;
  onClose: () => void;
  authorName: string;
  authorId: string;
  vars: {
    primary: string;
    primaryText: string;
    accent: string;
    accentText: string;
    cardBg: string;
    cardBorder: string;
    headingText: string;
    bodyText: string;
    mutedText: string;
    secondaryBg: string;
  };
  headingFont: string;
  bodyFont: string;
}

export default function AuthorContactModal({
  open,
  onClose,
  authorName,
  authorId,
  vars: v,
  headingFont,
  bodyFont,
}: AuthorContactModalProps) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  

  if (!open) return null;

  const firstName = authorName.split(" ")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      // 1. Capture lead into CRM via edge function
      await supabase.functions.invoke("crm-auto-capture", {
        body: {
          email: form.email,
          name: form.name,
          source: "contact_form",
          source_detail: `Message: ${form.message.slice(0, 200)}`,
          author_id: authorId,
          message: form.message,
        },
      });

      // 2. Save to mailing list + auto-enroll into matching sequences
      await autoEnrollSubscriber({
        email: form.email.toLowerCase().trim(),
        name: form.name || null,
        userId: authorId,
        source: "contact_form",
      });

      setSent(true);
    } catch (err) {
      console.error("Contact form error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setForm({ name: "", email: "", message: "" });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ fontFamily: bodyFont }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: v.primary }}
        >
          <h2
            className="text-lg font-bold"
            style={{ color: v.primaryText, fontFamily: headingFont }}
          >
            Message {firstName}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: v.primaryText }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          /* Success State */
          <div className="px-6 py-12 text-center flex flex-col items-center gap-3">
            <CheckCircle className="h-12 w-12" style={{ color: v.accent }} />
            <h3
              className="text-xl font-bold"
              style={{ color: v.headingText, fontFamily: headingFont }}
            >
              Message Sent!
            </h3>
            <p className="text-sm" style={{ color: v.mutedText }}>
              {firstName} will get back to you soon. You'll also start receiving newsletters and updates from {firstName}. Thank you for reaching out.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: v.accent, color: v.accentText }}
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-sm" style={{ color: v.mutedText }}>
              Send a message to {authorName}. They&apos;ll receive it directly.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: v.headingText }}>
                Your Name *
              </label>
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-shadow focus:ring-2"
                style={{
                  background: v.secondaryBg,
                  color: v.bodyText,
                  border: `1px solid ${v.cardBorder}`,
                  // @ts-ignore
                  "--tw-ring-color": v.accent,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: v.headingText }}>
                Your Email *
              </label>
              <input
                required
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="jane@example.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-shadow focus:ring-2"
                style={{
                  background: v.secondaryBg,
                  color: v.bodyText,
                  border: `1px solid ${v.cardBorder}`,
                  // @ts-ignore
                  "--tw-ring-color": v.accent,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: v.headingText }}>
                Message *
              </label>
              <textarea
                required
                maxLength={2000}
                rows={4}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder={`Hi ${firstName}, I'd love to connect about...`}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-shadow focus:ring-2 resize-none"
                style={{
                  background: v.secondaryBg,
                  color: v.bodyText,
                  border: `1px solid ${v.cardBorder}`,
                  // @ts-ignore
                  "--tw-ring-color": v.accent,
                }}
              />
            </div>

            <p className="text-[10px] leading-tight" style={{ color: v.mutedText }}>
              By submitting, you agree to our{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a>,{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>, and to receive communications from {firstName} and promotional materials from Authors Bureau.
            </p>

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: v.accent, color: v.accentText }}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
