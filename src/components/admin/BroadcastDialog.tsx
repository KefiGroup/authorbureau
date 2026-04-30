import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminDataFetch } from "@/lib/admin-data-fetch";

interface Props {
  trigger?: React.ReactNode;
}

const AUDIENCES = [
  { value: "all", label: "All authors" },
  { value: "tier:brand", label: "Brand tier only" },
  { value: "tier:build", label: "Build tier only" },
  { value: "tier:yield", label: "Yield tier only" },
  { value: "published", label: "Published authors only" },
];

export default function BroadcastDialog({ trigger }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await adminDataFetch("send-broadcast", {
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || null,
        audience,
      });
      toast({ title: `Broadcast sent to ${res.recipient_count ?? 0} authors` });
      setOpen(false);
      setTitle(""); setMessage(""); setLink(""); setAudience("all");
    } catch (err) {
      toast({ title: (err as Error).message || "Send failed", variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Megaphone className="h-4 w-4 mr-1.5" /> Broadcast
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Send Broadcast Announcement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short headline" maxLength={120} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="What do you want to tell them?" maxLength={500} />
          </div>
          <div>
            <Label>Link (optional)</Label>
            <Input value={link} onChange={e => setLink(e.target.value)} placeholder="/dashboard?section=… or https://…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
            <Button onClick={send} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Broadcast
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Suspended authors are automatically excluded. The broadcast appears in each recipient's notification bell and dashboard banner.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
