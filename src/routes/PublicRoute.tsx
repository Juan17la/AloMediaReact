import Cookies from "js-cookie"
import { Navigate, Outlet } from "react-router"
import { useAuth } from "../hooks/useAuth"

/**
 * Wraps routes that are only accessible while unauthenticated (login, register, …).
 *
 * Decision order:
 * 1. Already verified or cookie present → redirect to dashboard.
 * 2. No cookie → render immediately (no session to verify, no reason to wait).
 */
export default function PublicRoute() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated || Cookies.get("token")) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
