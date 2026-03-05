import { createBrowserRouter, Navigate } from "react-router";
import AuthLayout from "./layouts/AuthLayout";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import RecoverPage from "./pages/auth/RecoverPage";
import RecoverRequestPage from "./pages/auth/RecoverRequestPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PublicRoute from "./routes/PublicRoute";
import PrivateRoute from "./routes/PrivateRoute";

const router = createBrowserRouter([
  // ── Public-only routes (redirect to /dashboard if already logged in) ───────
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/auth",
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to="login" replace /> },
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "recover", element: <RecoverPage /> },
          { path: "recover/request", element: <RecoverRequestPage /> },
        ],
      },
    ],
  },

  // ── Private routes (redirect to /auth/login if not logged in) ────────────
  {
    element: <PrivateRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  {
    path: "*",
    element: <Navigate to="/auth/login" replace />,
  },
]);

export default router;
