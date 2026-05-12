import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, LayoutDashboard } from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "../../hooks/useAuth";
import { GeometricBackground } from "../../components/GeometricBackground";

export default function Error404Page() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");
  const { isAuthenticated } = useAuth();
  const hasToken = isAuthenticated || !!Cookies.get("token");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 text-on-surface">
      <GeometricBackground />

      <div className="relative text-center max-w-md animate-fade-in">
        <p className="text-8xl sm:text-9xl font-extrabold text-primary tracking-[-0.04em] leading-none">
          {t("errors.notFound.code")}
        </p>
        <h1 className="mt-4 text-2xl font-bold text-on-surface">{t("errors.notFound.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.notFound.description")}</p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150"
          >
            <Home className="w-4 h-4" />
            {t("errors.notFound.backHome")}
          </button>
          {hasToken && (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
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
