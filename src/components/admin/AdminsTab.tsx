import { Loader2, UserPlus, UserMinus, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AdminInfo } from "@/types/admin";

interface AdminsTabProps {
  admins: AdminInfo[];
  loading: boolean;
  promoteEmail: string;
  setPromoteEmail: (v: string) => void;
  promoting: boolean;
  handlePromote: () => void;
  handleDemote: (id: string) => void;
  onRefresh: () => void;
}

export default function AdminsTab({
  admins, loading, promoteEmail, setPromoteEmail, promoting, handlePromote, handleDemote, onRefresh,
}: AdminsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading text-xl font-bold">Admins</h2>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Promote */}
      <div className="flex gap-2 max-w-md">
        <Input
          type="email"
          placeholder="Email to promote..."
          value={promoteEmail}
          onChange={(e) => setPromoteEmail(e.target.value)}
        />
        <Button onClick={handlePromote} disabled={promoting || !promoteEmail.trim()} size="sm">
          {promoting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
          Promote
        </Button>
      </div>

      {/* List */}
      {admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No admins found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Use the form above to promote someone</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((a) => (
            <div key={a.id || a.user_id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.display_name || a.email}</p>
                {a.display_name && <p className="text-sm text-muted-foreground truncate">{a.email}</p>}
                {a.is_super_admin && <Badge className="mt-1 text-xs">Super Admin</Badge>}
              </div>
              {!a.is_super_admin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                      <UserMinus className="h-4 w-4 mr-1" /> Demote
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Demote {a.display_name || a.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove their admin privileges. They will lose access to this dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDemote(a.user_id || a.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, Demote
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
