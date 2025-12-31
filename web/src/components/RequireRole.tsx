import { useEffect, useState, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles?: string[]; // e.g., ['admin', 'manager']
}

export function RequireRole({ children, allowedRoles = ["admin"] }: RequireRoleProps) {
  const { user, loading: authLoading } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function checkClaims() {
      if (!user) {
        if (mounted) setHasPermission(false);
        return;
      }

      try {
        // Force refresh to ensure we have latest claims
        const tokenResult = await user.getIdTokenResult(true);
        const claims = tokenResult.claims;

        // Check various admin flags based on legacy/current patterns found in firestore.rules
        const isAdmin =
          claims.admin === true ||
          claims.isAdmin === true ||
          (claims.roles as any)?.admin === true;

        // If we just need basic admin access
        if (allowedRoles.includes("admin") && isAdmin) {
          if (mounted) setHasPermission(true);
          return;
        }

        // Generic role checking if needed in future
        // const userRoles = (claims.roles as Record<string, boolean>) || {};
        // const hasRole = allowedRoles.some(role => userRoles[role]);

        if (mounted) setHasPermission(false);
      } catch (error) {
        console.error("Error checking roles:", error);
        if (mounted) setHasPermission(false);
      }
    }

    if (!authLoading) {
      checkClaims();
    }
  }, [user, authLoading, allowedRoles]);

  if (authLoading || hasPermission === null) {
     return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (!hasPermission) {
    // Redirect to dashboard if authenticated but unauthorized
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
