import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FileText } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import Footer from "../../components/common/Footer";

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
            title={t("legal.terms.title")}
            subtitle={t("legal.terms.subtitle")}
            icon={<FileText className="h-5 w-5 text-primary" />}
            breadcrumb={[
              { label: "Home", href: "/" },
              { label: t("legal.terms.title"), href: "/legal/terms" },
            ]}
          />

          <p className="text-xs text-muted-foreground/60">{t("legal.terms.lastUpdated")}</p>

          {sections.map((section, idx) => (
            <SectionCard key={idx} title={section.title}>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.text}</p>
            </SectionCard>
          ))}

          <div className="text-center pt-4">
            <Link
              to="/legal/privacy"
              className="text-xs text-primary hover:text-primary/80 transition-colors duration-150 font-semibold"
            >
              {t("legal.privacy.title")} &rarr;
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
