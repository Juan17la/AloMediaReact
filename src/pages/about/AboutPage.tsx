import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Info, Target, Users, Cpu, ArrowLeft } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import Footer from "../../components/common/Footer";

export default function AboutPage() {
  const { t } = useTranslation("pages");

  const techs = [
    t("about.techReact"),
    t("about.techNode"),
    t("about.techFFmpeg"),
    t("about.techCloud"),
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-on-surface">
      {/* Light theme gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Dark theme gradients */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />

      <main className="relative z-10 px-4 py-10 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
          <Link
            to="/"
            className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-on-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>

          <PageHeader
            title={t("about.title")}
            subtitle={t("about.subtitle")}
            icon={<Info className="h-5 w-5 text-primary" />}
          />

          <SectionCard title={t("about.mission")} icon={<Target className="w-4 h-4" />}>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("about.missionText")}</p>
          </SectionCard>

          <SectionCard title={t("about.team")} icon={<Users className="w-4 h-4" />}>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("about.teamText")}</p>
          </SectionCard>

          <SectionCard title={t("about.technologies")} icon={<Cpu className="w-4 h-4" />}>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{t("about.technologiesText")}</p>
            <ul className="space-y-2">
              {techs.map((tech, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {tech}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
