import { useState, useCallback, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Search, Users } from "lucide-react";

interface PlatformUser {
  user_id: string;
  email: string;
  display_name?: string;
  source_platform?: string;
  platforms?: Record<string, boolean>;
  writing?: boolean;
  publishing?: boolean;
  marketing?: boolean;
}

const PLATFORMS = ["writing", "publishing", "marketing"] as const;

export default function PlatformAccessTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listPlatformUsers();
      setUsers(data?.users || data?.data || []);
    } catch {
      toast({ title: "Failed to load platform users", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const hasPlatform = (user: PlatformUser, platform: string): boolean => {
    if (user.platforms) return !!user.platforms[platform];
    return !!(user as any)[platform];
  };

  const handleToggle = async (user: PlatformUser, platform: string, enabled: boolean) => {
    const key = `${user.user_id}-${platform}`;
    setTogglingKey(key);

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.user_id !== user.user_id) return u;
        if (u.platforms) {
          return { ...u, platforms: { ...u.platforms, [platform]: enabled } };
        }
        return { ...u, [platform]: enabled };
      })
    );

    try {
      await adminApi.togglePlatformAccess(user.user_id, platform, enabled);
      toast({ title: `${platform} access ${enabled ? "granted" : "revoked"} for ${user.email}` });
    } catch {
      // Revert
      setUsers((prev) =>
        prev.map((u) => {
          if (u.user_id !== user.user_id) return u;
          if (u.platforms) {
            return { ...u, platforms: { ...u.platforms, [platform]: !enabled } };
          }
          return { ...u, [platform]: !enabled };
        })
      );
      toast({ title: "Failed to update access", variant: "destructive" });
    }
    setTogglingKey(null);
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl font-bold">Platform Access</h2>
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" /> {users.length} users
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                {PLATFORMS.map((p) => (
                  <th key={p} className="text-center px-4 py-3 font-medium text-muted-foreground capitalize">
                    {p}
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.user_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium truncate max-w-[240px]">{user.display_name || user.email}</p>
                      {user.display_name && (
                        <p className="text-xs text-muted-foreground truncate max-w-[240px]">{user.email}</p>
                      )}
                    </div>
                  </td>
                  {PLATFORMS.map((platform) => {
                    const key = `${user.user_id}-${platform}`;
                    const checked = hasPlatform(user, platform);
                    return (
                      <td key={platform} className="text-center px-4 py-3">
                        <Switch
                          checked={checked}
                          onCheckedChange={(val) => handleToggle(user, platform, val)}
                          disabled={togglingKey === key}
                        />
                      </td>
                    );
                  })}
                  <td className="text-center px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {user.source_platform || "—"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
