import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface Props {
  userId: string;
}

/**
 * Admin notification bell — same shape as author NotificationCenter,
 * but mounted in the AdminDashboard header. Reads from `public.notifications`
 * filtered by the admin's own user_id (admin events broadcast via
 * notify_all_admins insert one row per admin).
 */
export default function AdminNotificationBell({ userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const fetchN = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (active && data) setNotifications(data as Notification[]);
    };
    fetchN();
    const channel = supabase
      .channel(`admin-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    if (!n.read) {
      supabase.from("notifications").update({ read: true }).eq("id", n.id).then();
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) {
      // Same-tab nav so admin can drill into Books tab etc.
      window.location.assign(n.link);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground" aria-label="Admin notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Admin notifications</h4>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted transition-colors ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  <div className={!n.read ? "" : "pl-4"}>
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
