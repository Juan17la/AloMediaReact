import Cookies from "js-cookie"
import { Navigate, Outlet } from "react-router"
import { useAuth } from "../hooks/useAuth"

/**
 * Wraps routes that are only accessible while unauthenticated (login, register, …).
 *
 * Decision order:
 * 1. Already verified by AuthProvider → redirect to dashboard.
 * 2. Token cookie present → redirect to dashboard (user is authenticated,
 *    regardless of whether me() has resolved yet).
 * 3. Still loading and no cookie → wait silently (no redirect yet).
 * 4. Not authenticated and not loading → render the public page.
 */
export default function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isAuthenticated || Cookies.get("token")) return <Navigate to="/dashboard" replace />
  if (isLoading) return null
  return <Outlet />
}
