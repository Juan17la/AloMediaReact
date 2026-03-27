import Cookies from "js-cookie"
import { Navigate, Outlet } from "react-router"
import { useAuth } from "../hooks/useAuth"

/**
 * Wraps routes that require authentication.
 *
 * Decision order:
 * 1. Already verified by AuthProvider → allow.
 * 2. Token cookie present → allow (AuthProvider is still verifying; if the
 *    token turns out to be invalid, the next render after me() resolves will
 *    redirect to login).
 * 3. Still loading and no cookie → wait silently (no redirect yet).
 * 4. Not authenticated and not loading → redirect to login.
 */
export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isAuthenticated || Cookies.get("token")) return <Outlet />
  if (isLoading) return null
  return <Navigate to="/auth/login" replace />
}
