import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email").max(255);

interface NewsletterSignupProps {
  bookId: string;
  authorName: string;
  authorId?: string;
}

export default function NewsletterSignup({ bookId, authorName, authorId }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({ title: "Invalid email", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("newsletter_signups" as any).insert({ book_id: bookId, email: result.data } as any);
      if (error) throw error;
      setSuccess(true);
      toast({ title: "You're subscribed! 📬", description: `You'll get updates from ${authorName}.` });

      // Auto-capture to CRM
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-auto-capture`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: result.data,
              name: result.data,
              source: "newsletter",
              source_detail: authorName,
              author_id: authorId,
            }),
          }
        );
      } catch (error) {
      console.error(error);
    }
    } catch (err) {
      toast({ title: "Something went wrong", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-secondary mx-auto mb-3" />
        <h3 className="font-heading text-lg font-bold mb-1">You're on the list!</h3>
        <p className="text-sm text-muted-foreground">We'll send you updates about this book and more from {authorName}.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
          <Mail className="h-5 w-5 text-secondary" />
        </div>
        <h3 className="font-heading text-lg font-bold">Stay Updated</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Get notified about new releases and updates from {authorName}.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
            maxLength={255}
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          By subscribing, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>,{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>, and to receive newsletters from {authorName} and promotional materials from Authors Bureau.
        </p>
      </form>
    </div>
  );
}
