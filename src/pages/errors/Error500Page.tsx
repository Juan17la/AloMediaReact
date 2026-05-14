import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { RefreshCw, MessageSquare } from "lucide-react";
import { GeometricBackground } from "../../components/GeometricBackground";

export default function Error500Page() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 text-on-surface">
      <GeometricBackground />

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
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            {t("errors.serverError.retry")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150"
          >
            <MessageSquare className="w-4 h-4" />
            {t("errors.serverError.support")}
          </button>
        </div>
      </div>
    </div>
  );
}
