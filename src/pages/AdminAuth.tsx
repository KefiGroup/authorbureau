import { Navigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { safeInternalPath } from "@/lib/safe-redirect";

/**
 * Admins sign in through the same sign-in page as everyone else. Admin
 * access is then granted purely by the admin role on the account.
 */
export default function AdminAuth() {
  const { user, loading, isAdmin } = useAuth();
  const [params] = useSearchParams();
  const redirectTo = safeInternalPath(params.get("redirect"), "/admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user && isAdmin) return <Navigate to={redirectTo} replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectTo)}`} replace />;
}
