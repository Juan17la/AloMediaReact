import { useNavigate } from "react-router";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 text-on-surface">
      {/* Light theme gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Dark theme gradients */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />

      <div className="relative w-full max-w-2xl px-8 py-7 sm:px-10 bg-surface-container rounded-2xl border border-outline-variant shadow-lg">
        <div className="flex items-center gap-3 border-b border-outline-variant/50 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-primary">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Administrative access and session controls.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            This is a minimal admin entry point aligned with the auth screens. Expand it later with the controls you need.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-lg border border-outline-variant bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface/80 transition-colors duration-150 hover:bg-surface-container-high"
            >
              Back to dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-container px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-95 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
