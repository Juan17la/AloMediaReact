import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, LayoutDashboard, SearchX } from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "../../hooks/useAuth";
import { GeometricBackground } from "../../components/GeometricBackground";

export default function Error404Page() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");
  const { isAuthenticated } = useAuth();
  const hasToken = isAuthenticated || !!Cookies.get("token");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-12 text-on-surface">
      <GeometricBackground />

      <div className="auth-glass-card relative min-w-full max-w-lg animate-fade-in px-8 py-12 sm:px-14 sm:py-16">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <SearchX className="h-10 w-10 text-primary" />
          </div>

          {/* Code */}
          <p className="text-7xl sm:text-8xl font-extrabold text-primary tracking-[-0.04em] leading-none">
            {t("errors.notFound.code")}
          </p>

          {/* Title */}
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-on-surface">
            {t("errors.notFound.title")}
          </h1>

          {/* Description */}
          <p className="min-w-full mt-3 text-base text-muted-foreground max-w-sm leading-relaxed">
            {t("errors.notFound.description")}
          </p>

          {/* Actions */}
          <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150 sm:w-auto"
            >
              <Home className="w-4 h-4" />
              {t("errors.notFound.backHome")}
            </button>
            {hasToken && (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all sm:w-auto"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t("errors.notFound.backDashboard")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
