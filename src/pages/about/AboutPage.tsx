import { useTranslation } from "react-i18next";
import { Info, Target, Users, Cpu } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";

export default function AboutPage() {
  const { t } = useTranslation("pages");

  const techs = [
    t("about.techReact"),
    t("about.techNode"),
    t("about.techFFmpeg"),
    t("about.techCloud"),
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-8 space-y-5 animate-fade-in">
      <PageHeader
        title={t("about.title")}
        subtitle={t("about.subtitle")}
        icon={<Info className="h-5 w-5 text-blood-red" />}
      />

      <SectionCard title={t("about.mission")} icon={<Target className="w-4 h-4" />}>
        <p className="text-sm text-muted leading-relaxed">{t("about.missionText")}</p>
      </SectionCard>

      <SectionCard title={t("about.team")} icon={<Users className="w-4 h-4" />}>
        <p className="text-sm text-muted leading-relaxed">{t("about.teamText")}</p>
      </SectionCard>

      <SectionCard title={t("about.technologies")} icon={<Cpu className="w-4 h-4" />}>
        <p className="mb-3 text-sm leading-relaxed text-muted">{t("about.technologiesText")}</p>
        <ul className="space-y-2">
          {techs.map((tech, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-muted-light">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-red shrink-0" />
              {tech}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
