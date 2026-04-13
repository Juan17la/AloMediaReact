import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation("pages");

  return (
    <footer className="border-t border-white/8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.webp" alt="AloMedia" className="w-7 h-7 rounded-lg" />
            <span className="text-white/60 text-sm font-semibold">AloMedia</span>
          </div>

          <nav className="flex items-center gap-4 text-xs text-white/40">
            <Link to="/about" className="hover:text-white/60 transition-colors duration-150">
              {t("about.title")}
            </Link>
            <Link to="/contact" className="hover:text-white/60 transition-colors duration-150">
              {t("contact.title")}
            </Link>
            <Link to="/help" className="hover:text-white/60 transition-colors duration-150">
              {t("help.title")}
            </Link>
            <Link to="/legal/terms" className="hover:text-white/60 transition-colors duration-150">
              {t("legal.terms.title")}
            </Link>
            <Link to="/legal/privacy" className="hover:text-white/60 transition-colors duration-150">
              {t("legal.privacy.title")}
            </Link>
          </nav>

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} AloMedia
          </p>
        </div>
      </div>
    </footer>
  );
}
