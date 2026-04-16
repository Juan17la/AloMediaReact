import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HelpCircle, Search, ChevronDown, ChevronUp, BookOpen, MessageSquare } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";

interface FaqItem {
  q: string;
  a: string;
}

export default function HelpPage() {
  const { t } = useTranslation("pages");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    { q: t("help.faq1Q"), a: t("help.faq1A") },
    { q: t("help.faq2Q"), a: t("help.faq2A") },
    { q: t("help.faq3Q"), a: t("help.faq3A") },
    { q: t("help.faq4Q"), a: t("help.faq4A") },
    { q: t("help.faq5Q"), a: t("help.faq5A") },
  ];

  const filtered = searchQuery.trim()
    ? faqs.filter(
        f =>
          f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-8 space-y-5 animate-fade-in">
      <PageHeader
        title={t("help.title")}
        subtitle={t("help.subtitle")}
        icon={<HelpCircle className="h-5 w-5 text-blood-red" />}
      />

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white/70 transition-colors duration-150" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t("help.search")}
          className="auth-input w-full rounded-lg py-3 pl-12 pr-4 text-accent-white placeholder-white/25 text-sm font-medium"
        />
      </div>

      {/* Getting Started */}
      <SectionCard title={t("help.gettingStarted")} icon={<BookOpen className="w-4 h-4" />}>
        <p className="text-sm text-white/55 leading-relaxed">{t("help.gettingStartedText")}</p>
      </SectionCard>

      {/* FAQ */}
      <SectionCard title={t("help.faq")}>
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-white/40 py-3">{t("common:states.noResults")}</p>
          ) : (
            filtered.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="border border-white/8 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium text-white/80 hover:bg-white/5 transition-colors duration-150"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-white/40 shrink-0 ml-3" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40 shrink-0 ml-3" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 animate-slide-up">
                      <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      {/* Need More Help */}
      <SectionCard title={t("help.needMoreHelp")} icon={<MessageSquare className="w-4 h-4" />}>
        <p className="text-sm text-white/55 mb-3">{t("help.needMoreHelpText")}</p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/8 transition-colors duration-150"
        >
          <MessageSquare className="w-4 h-4" />
          {t("contact.title")}
        </Link>
      </SectionCard>
    </div>
  );
}
