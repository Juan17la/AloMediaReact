# Authentication and Route Protection

## Objective

Ensure only authenticated users access the dashboard, editor, and profile pages. Provide a smooth UX during session verification and support full password recovery.

## Architecture

The auth system has three parts:

1. **Auth Context** — React context that holds user state and loading status
2. **Auth Service** — HTTP wrappers for auth endpoints
3. **Route Guards** — Components that enforce access policies

---

## Session Lifecycle

```
App mounts
    ↓
AuthProvider calls me() to verify session
    ↓
├─ Valid session → hydrate user in context, allow private routes
└─ Invalid session → set anonymous state, redirect private routes to login
    ↓
User logs in → signIn() stores JWT cookie, updates context
    ↓
User logs out → signout() clears cookie + context, redirects to login
```

### Initialization Flow

**File:** `src/context/AuthProvider.tsx`

On mount, the provider calls `me()`:
- If `authenticated: true`, sets `user` and `isAuthenticated: true`
- If `authenticated: false` or request fails, sets `isAuthenticated: false`
- `isLoading` is `true` until the first verification completes

This prevents route-flash during app startup.

---

## Functional States

| State | Type | Description |
|-------|------|-------------|
| `isLoading` | `boolean` | True while verifying session on mount. Blocks navigation decisions. |
| `isAuthenticated` | `boolean` | True when a valid session exists. |
| `user` | `User \| null` | Profile data: id, firstName, lastName, email, role. |

### User Type

**File:** `src/types/userTypes.ts`

```typescript
interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: 'USER' | 'ADMIN'
}
```

---

## Route Protection Policy

### PrivateRoute

**File:** `src/routes/PrivateRoute.tsx`

- If `isLoading`: render nothing (or spinner) — wait for verification
- If `isAuthenticated`: render child routes
- If not authenticated: redirect to `/auth/login`

Protected routes:
- `/dashboard`
- `/editor/:projectId`
- `/profile`

### PublicRoute

**File:** `src/routes/PublicRoute.tsx`

- If `isLoading`: render nothing
- If `isAuthenticated`: redirect to `/dashboard`
- If not authenticated: render child routes (login, register, recover)

This prevents logged-in users from seeing the login page.

### AdminRoute

**File:** `src/routes/AdminRoute.tsx`

- If `isLoading`: render nothing
- If `isAuthenticated` AND `user.role === 'ADMIN'`: render child routes
- Otherwise: redirect to `/dashboard`

Protected route:
- `/admin`

---

## Password Recovery Flow

The recovery flow is completely decoupled from the active session state.

### Step 1: Request Recovery

1. User enters email on `/auth/recover/request`
2. Frontend calls `recoverRequest({ email })`
3. Backend sends email with recovery token

### Step 2: Validate Token

1. User clicks link → `/auth/recover?token=...`
2. Frontend calls `validateRecoverToken(token)`
3. If valid, show password reset form
4. If invalid, show error and link to request again

### Step 3: Reset Password

1. User enters new password and confirmation
2. Frontend calls `recoverReset({ token, newPassword, confirmPassword })`
3. On success, redirect to login

---

## Auth Hook

**File:** `src/hooks/useAuth.ts`

Provides convenient access to auth context:

```typescript
const { user, isAuthenticated, isLoading, login, logout } = useAuth()
```

Components should use this hook rather than consuming context directly.

---

## UX Decisions

1. **No route flash on startup** — The app waits for `me()` to resolve before rendering route guards. This prevents a logged-in user from briefly seeing the login page.
2. **Field-level errors from backend** — Login/register forms display per-field errors returned in `ApiError.errors` array.
3. **Loading feedback on auth operations** — Buttons show spinners during login/register to prevent double-submits.
4. **Auto-redirect after login** — Login page redirects to `/dashboard` on success.
5. **Cookie-based JWT** — The token is stored in a cookie via `js-cookie`. This is simple but not as secure as HttpOnly cookies. Consider migrating to a refresh-token pattern with HttpOnly cookies set by the backend.

---

## Known Risks

1. **Silent session invalidation** — If the backend invalidates a session (e.g., password changed, account banned), the frontend will only discover this on the next API call. The `me()` check happens only on mount. Mitigation: intercept 401 responses and force logout.
2. **Client-side token storage** — `js-cookie` stores the token in a client-accessible cookie. XSS could steal it. Mitigation: use HttpOnly cookies set by the backend; keep only a session indicator client-side.
3. **Token expiration** — There is no explicit token refresh logic. If the token expires while the user is editing, the next save will fail with 401. Mitigation: implement refresh tokens or silent re-auth.
4. **Missing 401 interceptor** — The `http()` client does not globally handle 401 by logging out. Each caller must handle it. Mitigation: add a response interceptor that triggers logout on 401.

---

## Testing Authentication

### Manual Test Cases

1. **Fresh load (logged out)** → Should show landing page. Visiting `/dashboard` redirects to `/auth/login`.
2. **Fresh load (logged in)** → Should redirect `/` or `/auth/login` to `/dashboard`.
3. **Login** → Enter valid credentials → redirect to `/dashboard` → `user` populated.
4. **Logout** → Click logout → cookie cleared → redirect to `/auth/login`.
5. **Admin access** → Admin user can access `/admin`. Non-admin redirected to `/dashboard`.
6. **Recovery** → Request recovery → click link → reset password → login with new password works.

---

## Files Reference

| File | Responsibility |
|------|----------------|
| `src/context/AuthProvider.tsx` | Context provider, session verification, state management |
| `src/context/authContext.ts` | Context definition and default values |
| `src/hooks/useAuth.ts` | Convenience hook for consuming auth context |
| `src/routes/PrivateRoute.tsx` | Guards private routes |
| `src/routes/PublicRoute.tsx` | Guards public routes (redirects auth users) |
| `src/routes/AdminRoute.tsx` | Guards admin routes |
| `src/services/authService.ts` | API calls for auth |
| `src/types/authTypes.ts` | Auth-related TypeScript types |
| `src/types/userTypes.ts` | User model type |
