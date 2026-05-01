import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, MessageSquare, User, FileText, AlertCircle, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import Footer from "../../components/common/Footer";

export default function ContactPage() {
  const { t } = useTranslation("pages");
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Store contact form in localStorage as fallback
      const contacts = JSON.parse(localStorage.getItem("contacts") || "[]");
      contacts.push({ ...formData, timestamp: new Date().toISOString() });
      localStorage.setItem("contacts", JSON.stringify(contacts));

      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 5000);
    } catch {
      setError(t("contact.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-on-surface">
      {/* Light theme gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Dark theme gradients */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />

      <main className="relative z-10 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-5">
          <Link
            to="/"
            className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-on-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
      <PageHeader
        title={t("contact.title")}
        subtitle={t("contact.subtitle")}
        icon={<MessageSquare className="h-5 w-5 text-primary" />}
      />

      <SectionCard title={t("contact.form")}>
        {submitted && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg border border-green-500/20 bg-green-500/5 animate-slide-up">
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-sm text-green-400">{t("contact.successMessage")}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-[13px] text-muted-foreground tracking-wide pl-1">
              {t("contact.name")}
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your name"
                className="w-full rounded-lg py-3 pl-12 pr-4 bg-surface-container border border-outline-variant text-on-surface placeholder:text-muted-foreground/50 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="text-[13px] text-muted-foreground tracking-wide pl-1">
              {t("contact.email")}
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
              <input
                id="contact-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="w-full rounded-lg py-3 pl-12 pr-4 bg-surface-container border border-outline-variant text-on-surface placeholder:text-muted-foreground/50 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-[13px] text-muted-foreground tracking-wide pl-1">
              {t("contact.subject")}
            </label>
            <div className="relative group">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
              <input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="Message subject"
                className="w-full rounded-lg py-3 pl-12 pr-4 bg-surface-container border border-outline-variant text-on-surface placeholder:text-muted-foreground/50 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-[13px] text-muted-foreground tracking-wide pl-1">
              {t("contact.message")}
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              required
              placeholder="Your message..."
              className="w-full rounded-lg py-3 px-4 bg-surface-container border border-outline-variant text-on-surface placeholder:text-muted-foreground/50 text-sm font-medium resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150 outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
              <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
              <p className="text-xs text-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-primary to-primary-container text-primary-foreground font-semibold py-3.5 rounded-lg text-sm tracking-wide shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("contact.sending") : t("contact.send")}
          </button>
        </form>
      </SectionCard>

      <SectionCard title={t("contact.other")}>
        <p className="text-sm text-muted-foreground">{t("contact.otherInfo")}</p>
      </SectionCard>
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
