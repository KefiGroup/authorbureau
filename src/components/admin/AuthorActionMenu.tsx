import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical, Pause, Play, Crown, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminDataFetch } from "@/lib/admin-data-fetch";

interface Props {
  authorId: string;          // author_profiles.id
  penName: string | null;
  authorSlug: string | null;
  suspendedAt: string | null;
  subscriptionTier: string | null;
  onChanged: () => void;
}

const TIERS = ["free", "brand", "build", "yield"] as const;

export default function AuthorActionMenu({
  authorId,
  penName,
  authorSlug,
  suspendedAt,
  subscriptionTier,
  onChanged,
}: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const [tierOpen, setTierOpen] = useState(false);
  const [newTier, setNewTier] = useState<string>(subscriptionTier || "free");
  const [tierExpiry, setTierExpiry] = useState<string>("");

  const isSuspended = !!suspendedAt;
  const displayName = penName || "this author";

  const doSuspend = async () => {
    setBusy(true);
    try {
      await adminDataFetch("suspend-author", {
        authorId,
        suspend: true,
        reason: suspendReason.trim() || null,
      });
      toast({ title: `${displayName} paused`, description: "Author dashboard access blocked. Public site stays live." });
      setSuspendOpen(false);
      setSuspendReason("");
      onChanged();
    } catch (err: any) {
      toast({ title: err.message || "Failed", variant: "destructive" });
    }
    setBusy(false);
  };

  const doReinstate = async () => {
    setBusy(true);
    try {
      await adminDataFetch("suspend-author", { authorId, suspend: false });
      toast({ title: `${displayName} reinstated` });
      onChanged();
    } catch (err: any) {
      toast({ title: err.message || "Failed", variant: "destructive" });
    }
    setBusy(false);
  };

  const doSetTier = async () => {
    setBusy(true);
    try {
      await adminDataFetch("set-author-tier", {
        authorId,
        tier: newTier,
        expiresAt: tierExpiry ? new Date(tierExpiry).toISOString() : null,
      });
      toast({ title: `Plan set to ${newTier}` });
      setTierOpen(false);
      onChanged();
    } catch (err: any) {
      toast({ title: err.message || "Failed", variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">
            Plan: <span className="capitalize font-semibold">{subscriptionTier || "free"}</span>
            {isSuspended && <span className="ml-2 text-amber-700">• Paused</span>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {authorSlug && (
            <DropdownMenuItem asChild>
              <a href={`/${authorSlug}`} target="_blank" rel="noopener">
                <ExternalLink className="mr-2 h-4 w-4" /> View public site
              </a>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => { setNewTier(subscriptionTier || "free"); setTierOpen(true); }}>
            <Crown className="mr-2 h-4 w-4" /> Override plan…
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {isSuspended ? (
            <DropdownMenuItem onClick={doReinstate} className="text-emerald-700">
              <Play className="mr-2 h-4 w-4" /> Reinstate access
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setSuspendOpen(true)} className="text-amber-700">
              <Pause className="mr-2 h-4 w-4" /> Pause dashboard…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={(o) => !busy && setSuspendOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause {displayName}?</DialogTitle>
            <DialogDescription>
              Their author dashboard will be blocked. Their public author site and book pages remain live.
              The author is notified by email and in-app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (visible to the author)</Label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              placeholder="e.g. Pending verification of book ownership."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={doSuspend} disabled={busy} className="bg-amber-600 hover:bg-amber-700">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Pause access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier override dialog */}
      <Dialog open={tierOpen} onOpenChange={(o) => !busy && setTierOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override plan for {displayName}</DialogTitle>
            <DialogDescription>
              Sets the tier directly without going through Stripe. Use sparingly — for comp accounts,
              support cases, or beta access. The author is notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Plan</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expires (optional)</Label>
              <Input
                type="date"
                value={tierExpiry}
                onChange={(e) => setTierExpiry(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank for indefinite override.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={doSetTier} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
