import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, Scissors, Users, Download, ArrowRight } from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "../../hooks/useAuth";
import AloMediaLogo from "../../assets/AloMediaLogo.webp";
import Footer from "../../components/common/Footer";

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
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#080a0d] text-white">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(122,26,26,0.18)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(45,10,20,0.26)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute -top-[15%] -right-[10%] w-125 h-125 rounded-full bg-blood-red/9 blur-[120px]" />

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <nav className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 py-2">
              <img src={AloMediaLogo} alt="AloMedia" className="h-18" />
            </div>
            <div className="flex items-center gap-3">
              {hasToken ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/login")}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/8 transition-colors duration-150"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/register")}
                    className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-4 py-2.5 text-sm font-semibold text-white"
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
            <p className="mt-5 text-base sm:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
              {t("landing.heroDescription")}
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              {hasToken ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-6 py-3 text-sm font-semibold text-white"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/auth/register")}
                  className="auth-btn-primary inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blood-red to-crimson px-6 py-3 text-sm font-semibold text-white"
                >
                  {t("landing.cta")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </section>

          {/* Features */}
          <section className="pb-20">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40 text-center mb-8">
              {t("landing.features")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((f, idx) => (
                <div key={idx} className="auth-glass-card rounded-md px-5 py-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent-red">
                      {f.icon}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-white/90 mb-2">{f.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
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
