import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation("pages");

  return (
    <footer className="mt-auto border-t border-dark-border/80">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.webp" alt="AloMedia" className="w-7 h-7 rounded-lg" />
            <span className="text-accent-white/70 text-sm font-semibold">AloMedia</span>
          </div>

          <nav className="flex items-center gap-4 text-xs text-muted">
            <Link to="/about" className="transition-colors duration-150 hover:text-accent-white/70">
              {t("about.title")}
            </Link>
            <Link to="/contact" className="transition-colors duration-150 hover:text-accent-white/70">
              {t("contact.title")}
            </Link>
            <Link to="/help" className="transition-colors duration-150 hover:text-accent-white/70">
              {t("help.title")}
            </Link>
            <Link to="/legal/terms" className="transition-colors duration-150 hover:text-accent-white/70">
              {t("legal.terms.title")}
            </Link>
            <Link to="/legal/privacy" className="transition-colors duration-150 hover:text-accent-white/70">
              {t("legal.privacy.title")}
            </Link>
          </nav>

          <p className="text-xs text-muted-light">
            &copy; {new Date().getFullYear()} AloMedia
          </p>
        </div>
      </div>
    </footer>
  );
}
