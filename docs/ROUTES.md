# AloMedia Routes and Navigation

## Router Entry Point

Routing is defined in `src/router.tsx` using `createBrowserRouter` from `react-router`.

## Current Route Tree

```
PublicRoute
└── /auth
    ├── (index) -> /auth/login
    ├── /auth/login
    ├── /auth/register
    ├── /auth/recover
    └── /auth/recover/request

PrivateRoute
├── /dashboard
└── /editor/:projectId

Fallback
└── * -> /auth/login

Direct route
└── /editor (unguarded, development/testing)
```

## Guard Behavior

### PublicRoute (`src/routes/PublicRoute.tsx`)

- Redirects authenticated users to `/dashboard`.
- Treats either of these as authenticated during bootstrap:
  - `isAuthenticated` from `AuthProvider`.
  - Presence of cookie `token` via `js-cookie`.
- Returns `null` while loading and no cookie is present.

### PrivateRoute (`src/routes/PrivateRoute.tsx`)

- Allows access when `isAuthenticated` is true or `token` cookie exists.
- While `AuthProvider` is still verifying and no cookie exists, returns `null`.
- Redirects unauthenticated users to `/auth/login`.

This cookie-aware guard strategy reduces redirect flicker while `me()` is still in flight.

## Auth Bootstrap Path

`src/context/AuthProvider.tsx` performs session verification on mount:

1. Calls `me()`.
2. Sets `user` when server reports authenticated.
3. Clears `user` on error/unauthenticated response.
4. Marks `isLoading = false` when bootstrap completes.

## API Integration

The route-level pages use service modules that call `src/api/http.ts`.

- Base URL is `import.meta.env.VITE_BASE_URL`.
- Requests include cookies via `credentials: "include"`.
- HTTP failures are normalized to `ApiError`.

## Notes

- `/editor/:projectId` is the authenticated project route.
- `/editor` is still available as a direct editor route and should be treated as a development convenience path.
