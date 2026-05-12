import { useNavigate } from "react-router";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { GeometricBackground } from "../../components/GeometricBackground";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 text-on-surface">
      <GeometricBackground />

      <div className="relative w-full max-w-2xl px-8 py-7 sm:px-10 bg-card rounded-lg border border-border shadow-md">
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
              className="rounded-md border border-border bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150"
            >
              Back to dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
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
