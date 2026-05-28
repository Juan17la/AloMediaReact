import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import PublicRoute from "./routes/PublicRoute";
import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";

const AuthLayout = lazy(() => import("./layouts/AuthLayout"));
const PublicLayout = lazy(() => import("./layouts/PublicLayout"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const RecoverPage = lazy(() => import("./pages/auth/RecoverPage"));
const RecoverRequestPage = lazy(() => import("./pages/auth/RecoverRequestPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const VideoEditor = lazy(() => import("./pages/editor/VideoEditor"));

// New pages
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const AboutPage = lazy(() => import("./pages/about/AboutPage"));
const ContactPage = lazy(() => import("./pages/contact/ContactPage"));
const HelpPage = lazy(() => import("./pages/help/HelpPage"));
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const Error404Page = lazy(() => import("./pages/errors/Error404Page"));
const Error500Page = lazy(() => import("./pages/errors/Error500Page"));
const OAuthCallbackPage = lazy(() => import("./pages/auth/OAuthCallbackPage"));

const router = createBrowserRouter([
  // Landing page — accessible to everyone
  {
    path: "/",
    element: <LandingPage />,
  },

  // Public pages with shared layout (footer)
  {
    element: <PublicLayout />,
    children: [
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/help", element: <HelpPage /> },
      { path: "/legal/terms", element: <TermsPage /> },
      { path: "/legal/privacy", element: <PrivacyPage /> },
    ],
  },

  // Auth routes (redirect to /dashboard if already logged in)
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
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/editor/:projectId", element: <VideoEditor /> },
      { path: "/profile", element: <ProfilePage /> },
    ],
  },

  // Admin routes (redirect to /dashboard if not ADMIN)
  {
    element: <AdminRoute />,
    children: [
      { path: "/admin", element: <AdminPage /> },
    ],
  },

  // Error pages
  { path: "/errors/404", element: <Error404Page /> },
  { path: "/errors/500", element: <Error500Page /> },

  // OAuth success callback
  { path: "/oauth2/success", element: <OAuthCallbackPage /> },

  //  SET THIS TO PRIVATE FOR PRODUCTION, PUBLIC FOR TESTING
  {
    path: "/editor",
    element: <VideoEditor />,
  },

  // Fallback — 404
  {
    path: "*",
    element: <Error404Page />,
  },
]);

export default router;
