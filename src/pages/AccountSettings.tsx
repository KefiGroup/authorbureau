import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth, TIERS } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import ConnectedAccountsTab from "@/components/settings/ConnectedAccountsTab";

export default function AccountSettings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const { user, loading, tier, subscription, isPremium, signOut } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated ✓" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { source_platform: "authorsbureau" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      toast({ title: "Could not open billing portal", description: err.message, variant: "destructive" });
    }
    setPortalLoading(false);
  };

  const tierInfo = tier !== "free" ? TIERS[tier as keyof typeof TIERS] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="font-heading text-2xl font-bold">Account Settings</h1>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="connections">Connected Accounts</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-heading font-semibold text-lg mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input value={user.email || ""} disabled className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Contact support to change your email address.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-heading font-semibold text-lg mb-4">Change Password</h3>
                <div className="space-y-3 max-w-sm">
                  <div>
                    <Label>New Password</Label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" />
                  </div>
                  <Button onClick={handleChangePassword} disabled={saving || !newPassword}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Update Password
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <Button variant="destructive" onClick={signOut}>Sign Out</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-heading font-semibold text-lg mb-4">Current Plan</h3>
                {tierInfo ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                    <Crown className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">{tierInfo.label}</p>
                      <p className="text-sm text-muted-foreground">${tierInfo.monthlyPrice}/month</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">You are on the Free plan.</p>
                )}
              </div>

              {isPremium && (
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-2">Manage Subscription</h3>
                  <p className="text-sm text-muted-foreground mb-3">View invoices, update payment method, or cancel your subscription.</p>
                  <Button onClick={handleManageBilling} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Open Billing Portal
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="connections">
            <ConnectedAccountsTab userId={user.id} />
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="p-6 space-y-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { label: "Product analysis complete", desc: "When Abby finishes analyzing your book" },
                  { label: "New subscriber", desc: "When someone subscribes to your newsletter" },
                  { label: "Revenue updates", desc: "Weekly revenue summary emails" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-heading font-semibold text-lg mb-4">Appearance</h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Choose your preferred theme.</p>
                  <div className="flex gap-2">
                    {(["light", "dark", "system"] as const).map(mode => (
                      <Button
                        key={mode}
                        variant={
                          (typeof window !== "undefined" && document.documentElement.classList.contains("dark") && mode === "dark") ||
                          (!document.documentElement.classList.contains("dark") && mode === "light")
                            ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          if (mode === "dark") {
                            document.documentElement.classList.add("dark");
                            localStorage.setItem("theme", "dark");
                          } else if (mode === "light") {
                            document.documentElement.classList.remove("dark");
                            localStorage.setItem("theme", "light");
                          } else {
                            localStorage.removeItem("theme");
                            if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                              document.documentElement.classList.add("dark");
                            } else {
                              document.documentElement.classList.remove("dark");
                            }
                          }
                        }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
