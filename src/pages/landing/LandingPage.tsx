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
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-dark text-accent-white">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(212,80,90,0.10)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(245,229,235,0.72)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute -top-[15%] -right-[10%] h-125 w-125 rounded-full bg-blood-red/10 blur-[120px]" />

      {/* Navbar */}
      <header className="relative z-20 border-b border-dark-border/80">
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
                  className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-4 py-2.5 text-sm font-semibold text-accent-white"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/login")}
                    className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-semibold text-accent-white/80 hover:bg-dark-elevated transition-colors duration-150"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/register")}
                    className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-4 py-2.5 text-sm font-semibold text-accent-white"
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
            <div className="flex items-center justify-center gap-2 text-accent-red mb-4">
              <Plus className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t("landing.heroTagline")}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-gradient-red max-w-3xl mx-auto leading-tight">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              {t("landing.heroDescription")}
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              {hasToken ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-6 py-3 text-sm font-semibold text-accent-white"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/auth/register")}
                  className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-6 py-3 text-sm font-semibold text-accent-white"
                >
                  {t("landing.cta")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </section>

          {/* Features */}
          <section className="pb-20">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted text-center mb-8">
              {t("landing.features")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((f, idx) => (
                <div key={idx} className="auth-glass-card rounded-md px-5 py-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dark-border bg-dark-card text-accent-red">
                      {f.icon}
                    </div>
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-accent-white">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-muted">{f.desc}</p>
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
