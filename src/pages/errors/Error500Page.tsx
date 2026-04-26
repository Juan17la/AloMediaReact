import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { RefreshCw, MessageSquare } from "lucide-react";

export default function Error500Page() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dark px-4 text-accent-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(212,80,90,0.10)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(245,229,235,0.72)_0%,transparent_55%)]" />

      <div className="relative text-center max-w-md animate-fade-in">
        <p className="text-8xl sm:text-9xl font-extrabold text-gradient-red tracking-[-0.04em] leading-none">
          {t("errors.serverError.code")}
        </p>
        <h1 className="mt-4 text-2xl font-bold text-accent-white">{t("errors.serverError.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("errors.serverError.description")}</p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-4 py-2.5 text-sm font-semibold text-accent-white"
          >
            <RefreshCw className="w-4 h-4" />
            {t("errors.serverError.retry")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="inline-flex items-center gap-2 rounded-lg border border-dark-border bg-dark-card px-4 py-2.5 text-sm font-semibold text-accent-white/80 transition-colors duration-150 hover:bg-dark-elevated"
          >
            <MessageSquare className="w-4 h-4" />
            {t("errors.serverError.support")}
          </button>
        </div>
      </div>
    </div>
  );
}
