import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/shared-backend";
import { useToast } from "@/hooks/use-toast";

interface ServiceInquiryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName: string;
  authorSlug: string;
  serviceType: string;
}

export default function ServiceInquiryForm({ open, onOpenChange, authorName, authorSlug, serviceType }: ServiceInquiryFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;

    setLoading(true);
    try {
      // Save to database
      const { error: dbError } = await supabase.from("service_inquiries").insert({
        author_slug: authorSlug,
        service_type: serviceType,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        message: form.message.trim() || null,
      });

      if (dbError) throw dbError;

      // Send email notification
      await supabase.functions.invoke("send-service-inquiry-email", {
        body: {
          authorName,
          authorSlug,
          serviceType,
          fullName: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
          source_platform: "authorsbureau",
        },
      });

      setSubmitted(true);
      toast({ title: "Inquiry sent!", description: `Your ${serviceType.toLowerCase()} inquiry has been submitted.` });
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      toast({ title: "Error", description: "Failed to submit inquiry. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setSubmitted(false);
      setForm({ full_name: "", email: "", phone: "", message: "" });
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-secondary" />
            </div>
            <DialogTitle className="font-heading text-xl">Inquiry Sent!</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Thank you for your interest in {authorName}'s {serviceType.toLowerCase()} services. We'll get back to you shortly.
            </p>
            <Button onClick={handleClose} variant="outline">Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading">{serviceType} Inquiry</DialogTitle>
              <DialogDescription>
                Submit your inquiry for {authorName}'s {serviceType.toLowerCase()} services. Our team will get back to you shortly.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  maxLength={100}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  maxLength={1000}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={`Tell us about your ${serviceType.toLowerCase()} needs...`}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Inquiry"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
