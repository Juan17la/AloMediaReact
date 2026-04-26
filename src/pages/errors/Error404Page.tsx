import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, LayoutDashboard } from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "../../hooks/useAuth";

export default function Error404Page() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");
  const { isAuthenticated } = useAuth();
  const hasToken = isAuthenticated || !!Cookies.get("token");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dark px-4 text-accent-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(212,80,90,0.10)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(245,229,235,0.72)_0%,transparent_55%)]" />

      <div className="relative text-center max-w-md animate-fade-in">
        <p className="text-8xl sm:text-9xl font-extrabold text-gradient-red tracking-[-0.04em] leading-none">
          {t("errors.notFound.code")}
        </p>
        <h1 className="mt-4 text-2xl font-bold text-accent-white">{t("errors.notFound.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("errors.notFound.description")}</p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg border border-dark-border bg-dark-card px-4 py-2.5 text-sm font-semibold text-accent-white/80 transition-colors duration-150 hover:bg-dark-elevated"
          >
            <Home className="w-4 h-4" />
            {t("errors.notFound.backHome")}
          </button>
          {hasToken && (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-4 py-2.5 text-sm font-semibold text-accent-white"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t("errors.notFound.backDashboard")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
