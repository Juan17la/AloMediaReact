import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";

export default function PrivacyPage() {
  const { t } = useTranslation("pages");

  const sections = [
    { title: t("legal.privacy.collection"), text: t("legal.privacy.collectionText") },
    { title: t("legal.privacy.usage"), text: t("legal.privacy.usageText") },
    { title: t("legal.privacy.sharing"), text: t("legal.privacy.sharingText") },
    { title: t("legal.privacy.security"), text: t("legal.privacy.securityText") },
    { title: t("legal.privacy.rights"), text: t("legal.privacy.rightsText") },
    { title: t("legal.privacy.cookies"), text: t("legal.privacy.cookiesText") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-8 space-y-5 animate-fade-in">
      <PageHeader
        title={t("legal.privacy.title")}
        subtitle={t("legal.privacy.subtitle")}
        icon={<ShieldCheck className="h-5 w-5 text-blood-red" />}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: t("legal.privacy.title"), href: "/legal/privacy" },
        ]}
      />

      <p className="text-xs text-white/40">{t("legal.privacy.lastUpdated")}</p>

      {sections.map((section, idx) => (
        <SectionCard key={idx} title={section.title}>
          <p className="text-sm text-white/55 leading-relaxed">{section.text}</p>
        </SectionCard>
      ))}

      <div className="text-center pt-4">
        <Link
          to="/legal/terms"
          className="text-xs text-accent-red hover:text-rose-muted transition-colors duration-150 font-semibold"
        >
          {t("legal.terms.title")} &rarr;
        </Link>
      </div>
    </div>
  );
}
