import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, Scissors, Users, Download, ArrowRight } from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "../../hooks/useAuth";
import AloMediaLogo from "../../assets/AloMediaLogo.webp";
import Footer from "../../components/common/Footer";
import { ThemeToggle } from "../../components/ThemeToggle";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");
  const { isAuthenticated } = useAuth();
  const hasToken = isAuthenticated || !!Cookies.get("token");

  const features = [
    { icon: <Scissors className="w-5 h-5" />, title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
    { icon: <Users className="w-5 h-5" />, title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
    { icon: <Download className="w-5 h-5" />, title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-surface text-on-surface">
      {/* Background gradients - Light theme */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Background gradients - Dark theme */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute -top-[15%] -right-[10%] h-125 w-125 rounded-full bg-primary/10 blur-[120px]" />

      {/* Navbar */}
      <header className="relative z-20 border-b border-outline-variant/80">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <nav className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 py-2">
              <img src={AloMediaLogo} alt="AloMedia" className="h-18" />
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {hasToken ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-container px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-95 transition-all"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/login")}
                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low hover:border-outline transition-colors duration-150"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/register")}
                    className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-container px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-95 transition-all"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <section className="pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-4">
              <Plus className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t("landing.heroTagline")}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-gradient-primary max-w-3xl mx-auto leading-tight">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("landing.heroDescription")}
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              {hasToken ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-container px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-95 transition-all"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/auth/register")}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-container px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-95 transition-all"
                >
                  {t("landing.cta")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </section>

          {/* Features */}
          <section className="pb-20">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground text-center mb-8">
              {t("landing.features")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((f, idx) => (
                <div key={idx} className="auth-glass-card rounded-md px-5 py-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-primary">
                      {f.icon}
                    </div>
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-on-surface">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
