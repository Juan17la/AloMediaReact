import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Link2,
  Mic,
  Wand2,
  Palette,
  Layers,
  AudioLines,
  Gauge,
  ArrowRight,
  Play,
  Sparkles,
  Zap,
  Film,
} from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "../../hooks/useAuth";
import AloMediaLogo from "../../assets/AloMediaLogo.webp";
import Footer from "../../components/common/Footer";
import { ThemeToggle } from "../../components/ThemeToggle";
import { GeometricBackground } from "../../components/GeometricBackground";

const FAQ_ITEMS = [
  { q: "faq1Q", a: "faq1A" },
  { q: "faq2Q", a: "faq2A" },
  { q: "faq3Q", a: "faq3A" },
  { q: "faq4Q", a: "faq4A" },
  { q: "faq5Q", a: "faq5A" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");
  const { isAuthenticated } = useAuth();
  const hasToken = isAuthenticated || !!Cookies.get("token");

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-surface text-on-surface">
      <GeometricBackground />

      {/* Navbar */}
      <header className="relative z-20 border-b border-outline-variant/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <nav className="h-14 sm:h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 py-2">
              <img src={AloMediaLogo} alt="AloMedia" className="h-10 sm:h-18" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {hasToken ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/login")}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-primary/10 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/register")}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">

        {/* Hero */}
        <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-[0.12em]">{t("landing.heroTagline")}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-tight mb-5">
              <span className="text-gradient-primary">{t("landing.heroTitle")}</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-full mx-auto leading-relaxed mb-3">
              {t("landing.heroDescription")}
            </p>
            <p className="text-sm sm:text-base text-primary/80 font-medium mx-auto mb-8">
              {t("landing.heroHighlight")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {hasToken ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  {t("landing.ctaLoggedIn")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/register")}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    {t("landing.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/editor")}
                    className="inline-flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-7 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container transition-all"
                  >
                    <Play className="w-4 h-4" />
                    {t("landing.ctaSecondary")}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-on-surface mb-2">
                {t("landing.features")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("landing.featuresSubtitle")}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <FeatureCard icon={<Link2 className="w-5 h-5" />} tKey="sharing" />
              <FeatureCard icon={<Mic className="w-5 h-5" />} tKey="transcription" badge="AI" />
              <FeatureCard icon={<Wand2 className="w-5 h-5" />} tKey="cleanAudio" badge="AI" />
              <FeatureCard icon={<Palette className="w-5 h-5" />} tKey="colorFilterHighlight" />
              <FeatureCard icon={<Layers className="w-5 h-5" />} tKey="transitions" />
              <FeatureCard icon={<AudioLines className="w-5 h-5" />} tKey="equalizer" />
              <div className="sm:col-span-2 lg:col-span-1">
                <FeatureCard icon={<Gauge className="w-5 h-5" />} tKey="speed" />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-on-surface mb-10">
              {t("landing.howItWorks")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StepCard
                number={1}
                icon={<Film className="w-6 h-6" />}
                title={t("landing.step1Title")}
                desc={t("landing.step1Desc")}
              />
              <StepCard
                number={2}
                icon={<Zap className="w-6 h-6" />}
                title={t("landing.step2Title")}
                desc={t("landing.step2Desc")}
              />
              <StepCard
                number={3}
                icon={<Link2 className="w-6 h-6" />}
                title={t("landing.step3Title")}
                desc={t("landing.step3Desc")}
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-24 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-on-surface mb-8">
              {t("landing.faq")}
            </h2>
            <div className="flex flex-col gap-3 text-left">
              {FAQ_ITEMS.map((item, idx) => (
                <details key={idx} className="auth-glass-card rounded-lg px-4 py-3 group">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold text-on-surface">
                    {t(`landing.${item.q}`)}
                    <ArrowRight className="w-4 h-4 text-primary shrink-0 transition-transform duration-200 group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{t(`landing.${item.a}`)}</p>
                </details>
              ))}
            </div>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => navigate("/auth/register")}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                {t("landing.faqCta")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

function FeatureCard({ icon, tKey, badge }: { icon: React.ReactNode; tKey: string; badge?: string }) {
  const { t } = useTranslation("pages");
  const titleKey = `landing.feature${tKey.charAt(0).toUpperCase() + tKey.slice(1)}Title`;
  const descKey = `landing.feature${tKey.charAt(0).toUpperCase() + tKey.slice(1)}Desc`;
  return (
    <div className="auth-glass-card rounded-lg px-5 py-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-primary/10 text-primary">
          {icon}
        </div>
        {badge && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" />
            {badge}
          </span>
        )}
      </div>
      <div>
        <h3 className="mb-1.5 text-sm font-semibold text-on-surface">{t(titleKey)}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{t(descKey)}</p>
      </div>
    </div>
  );
}

function StepCard({ number, icon, title, desc }: { number: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="auth-glass-card rounded-lg px-5 py-5 flex flex-col items-center text-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary mb-1">
        {icon}
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {number}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
