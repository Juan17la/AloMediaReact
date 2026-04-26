import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FileText } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";

export default function TermsPage() {
  const { t } = useTranslation("pages");

  const sections = [
    { title: t("legal.terms.acceptance"), text: t("legal.terms.acceptanceText") },
    { title: t("legal.terms.useOfService"), text: t("legal.terms.useOfServiceText") },
    { title: t("legal.terms.accounts"), text: t("legal.terms.accountsText") },
    { title: t("legal.terms.content"), text: t("legal.terms.contentText") },
    { title: t("legal.terms.termination"), text: t("legal.terms.terminationText") },
    { title: t("legal.terms.liability"), text: t("legal.terms.liabilityText") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-8 space-y-5 animate-fade-in">
      <PageHeader
        title={t("legal.terms.title")}
        subtitle={t("legal.terms.subtitle")}
        icon={<FileText className="h-5 w-5 text-blood-red" />}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: t("legal.terms.title"), href: "/legal/terms" },
        ]}
      />

      <p className="text-xs text-accent-white/40">{t("legal.terms.lastUpdated")}</p>

      {sections.map((section, idx) => (
        <SectionCard key={idx} title={section.title}>
          <p className="text-sm text-accent-white/55 leading-relaxed">{section.text}</p>
        </SectionCard>
      ))}

      <div className="text-center pt-4">
        <Link
          to="/legal/privacy"
          className="text-xs text-accent-red hover:text-rose-muted transition-colors duration-150 font-semibold"
        >
          {t("legal.privacy.title")} &rarr;
        </Link>
      </div>
    </div>
  );
}
