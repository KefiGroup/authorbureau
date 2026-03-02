import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ContactFormData {
  full_name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  tags: string;
}

interface Props {
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ContactForm({ onSubmit, onCancel, loading }: Props) {
  const [form, setForm] = useState<ContactFormData>({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="font-heading text-lg font-semibold">Add Contact</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input
            required
            value={form.full_name}
            onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            placeholder="Jane Smith"
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="jane@example.com"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+1 555-1234"
          />
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input
            value={form.company}
            onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
            placeholder="Acme Inc."
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="How did you meet? Any context..."
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Tags (comma-separated)</Label>
        <Input
          value={form.tags}
          onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
          placeholder="client, speaker, VIP"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Contact
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
