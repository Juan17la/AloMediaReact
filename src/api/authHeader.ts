import Cookies from "js-cookie"

/**
 * Returns an Authorization header object using the stored JWT token.
 * Returns an empty object when no token is present.
 *
 * Single source of truth — import this everywhere instead of
 * reading the cookie and building the header inline.
 */
export function getAuthHeader(): Record<string, string> {
  const token = Cookies.get("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}
