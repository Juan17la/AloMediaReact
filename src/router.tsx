import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import PublicRoute from "./routes/PublicRoute";
import PrivateRoute from "./routes/PrivateRoute";

const AuthLayout = lazy(() => import("./layouts/AuthLayout"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const RecoverPage = lazy(() => import("./pages/auth/RecoverPage"));
const RecoverRequestPage = lazy(() => import("./pages/auth/RecoverRequestPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const VideoEditor = lazy(() => import("./pages/editor/VideoEditor"));

const router = createBrowserRouter([
  // Public-only routes (redirect to /dashboard if already logged in)
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

  // Private routes (redirect to /auth/login if not logged in)
  {
    element: <PrivateRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/editor/:projectId",
        element: <VideoEditor />,
      },
    ],
  },

  // Fallback 
  {
    path: "*",
    element: <Navigate to="/auth/login" replace />,
  },


    //  SET THIS TO PRIVATE FOR PRODUCTION, PUBLIC FOR TESTING 
  {
    path: "/editor",
    element: <VideoEditor />,
  },

]);

export default router;
