import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

/**
 * Wraps routes that require authentication.
 * Unauthenticated users are redirected to /auth/login.
 */
export default function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />;
}
