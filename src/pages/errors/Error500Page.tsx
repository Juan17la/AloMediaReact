import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { RefreshCw, MessageSquare } from "lucide-react";

export default function Error500Page() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 text-on-surface">
      {/* Light theme gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Dark theme gradients */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />

      <div className="relative text-center max-w-md animate-fade-in">
        <p className="text-8xl sm:text-9xl font-extrabold text-primary tracking-[-0.04em] leading-none">
          {t("errors.serverError.code")}
        </p>
        <h1 className="mt-4 text-2xl font-bold text-on-surface">{t("errors.serverError.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.serverError.description")}</p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-container px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            {t("errors.serverError.retry")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface/80 transition-colors duration-150 hover:bg-surface-container-high"
          >
            <MessageSquare className="w-4 h-4" />
            {t("errors.serverError.support")}
          </button>
        </div>
      </div>
    </div>
  );
}
