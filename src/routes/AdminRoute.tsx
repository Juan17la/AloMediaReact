import Cookies from "js-cookie";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

/**
 * Wraps routes that require ADMIN role.
 *
 * Decision order:
 * 1. Authenticated + ADMIN role → allow.
 * 2. Authenticated but not ADMIN → redirect to dashboard.
 * 3. Token cookie present → allow (AuthProvider still verifying).
 * 4. Still loading → wait.
 * 5. Not authenticated → redirect to login.
 */
export default function AdminRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated) {
    if (user?.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
    return <Outlet />;
  }

  if (Cookies.get("token")) return <Outlet />;
  if (isLoading) return null;
  return <Navigate to="/auth/login" replace />;
}
