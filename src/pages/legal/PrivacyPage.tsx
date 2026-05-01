import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import Footer from "../../components/common/Footer";

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
    <div className="relative min-h-screen overflow-hidden bg-surface text-on-surface">
      {/* Light theme gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Dark theme gradients */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />

      <main className="relative z-10 px-4 py-10 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
          <PageHeader
            title={t("legal.privacy.title")}
            subtitle={t("legal.privacy.subtitle")}
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            breadcrumb={[
              { label: "Home", href: "/" },
              { label: t("legal.privacy.title"), href: "/legal/privacy" },
            ]}
          />

          <p className="text-xs text-muted-foreground/60">{t("legal.privacy.lastUpdated")}</p>

          {sections.map((section, idx) => (
            <SectionCard key={idx} title={section.title}>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.text}</p>
            </SectionCard>
          ))}

          <div className="text-center pt-4">
            <Link
              to="/legal/terms"
              className="text-xs text-primary hover:text-primary/80 transition-colors duration-150 font-semibold"
            >
              {t("legal.terms.title")} &rarr;
            </Link>
          </div>
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
