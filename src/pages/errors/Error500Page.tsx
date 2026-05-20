import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { RefreshCw, MessageSquare, ServerOff } from "lucide-react";
import { GeometricBackground } from "../../components/GeometricBackground";

export default function Error500Page() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-12 text-on-surface">
      <GeometricBackground />

      <div className="auth-glass-card relative min-w-full max-w-lg animate-fade-in px-8 py-12 sm:px-14 sm:py-16">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
            <ServerOff className="h-10 w-10 text-destructive" />
          </div>

          {/* Code */}
          <p className="text-7xl sm:text-8xl font-extrabold text-destructive tracking-[-0.04em] leading-none">
            {t("errors.serverError.code")}
          </p>

          {/* Title */}
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-on-surface">
            {t("errors.serverError.title")}
          </h1>

          {/* Description */}
          <p className="min-w-full mt-3 text-base text-muted-foreground max-w-sm leading-relaxed">
            {t("errors.serverError.description")}
          </p>

          {/* Actions */}
          <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all sm:w-auto"
            >
              <RefreshCw className="w-4 h-4" />
              {t("errors.serverError.retry")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/contact")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150 sm:w-auto"
            >
              <MessageSquare className="w-4 h-4" />
              {t("errors.serverError.support")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
