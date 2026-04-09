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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a0d] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(122,26,26,0.18)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(45,10,20,0.28)_0%,transparent_55%)]" />

      <div
        className="auth-glass-card relative w-full max-w-2xl px-8 py-7 sm:px-10"
        style={{ borderRadius: 16 }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/5">
            <Shield className="h-5 w-5 text-blood-red" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">Admin Dashboard</h1>
            <p className="text-sm text-white/45">Administrative access and session controls.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <p className="max-w-xl text-sm leading-relaxed text-white/60">
            This is a minimal admin entry point aligned with the auth screens. Expand it later with the controls you need.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors duration-150 hover:bg-white/8"
            >
              Back to dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="auth-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
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
