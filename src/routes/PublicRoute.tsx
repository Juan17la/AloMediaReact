import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

/**
 * Wraps routes that are only accessible while unauthenticated (e.g. login, register).
 * Authenticated users are redirected to /dashboard.
 */
export default function PublicRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
