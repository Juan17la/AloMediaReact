import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, MessageSquare, User, FileText, AlertCircle, Check } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";

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
    <div className="max-w-2xl mx-auto px-4 py-10 sm:px-8 space-y-5 animate-fade-in">
      <PageHeader
        title={t("contact.title")}
        subtitle={t("contact.subtitle")}
        icon={<MessageSquare className="h-5 w-5 text-blood-red" />}
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
            <label htmlFor="name" className="text-[13px] text-muted tracking-wide pl-1">
              {t("contact.name")}
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-light group-focus-within:text-accent-white transition-colors duration-150" />
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="auth-input w-full rounded-lg py-3 pl-12 pr-4 text-accent-white placeholder-white/25 text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="text-[13px] text-muted tracking-wide pl-1">
              {t("contact.email")}
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-light group-focus-within:text-accent-white transition-colors duration-150" />
              <input
                id="contact-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="auth-input w-full rounded-lg py-3 pl-12 pr-4 text-accent-white placeholder-white/25 text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-[13px] text-muted tracking-wide pl-1">
              {t("contact.subject")}
            </label>
            <div className="relative group">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-light group-focus-within:text-accent-white transition-colors duration-150" />
              <input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                required
                className="auth-input w-full rounded-lg py-3 pl-12 pr-4 text-accent-white placeholder-white/25 text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-[13px] text-muted tracking-wide pl-1">
              {t("contact.message")}
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              required
              className="auth-input w-full rounded-lg py-3 px-4 text-accent-white placeholder-white/25 text-sm font-medium resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary w-full bg-linear-to-r from-blood-red to-crimson text-accent-white font-semibold py-3.5 rounded-lg text-sm tracking-wide"
          >
            {loading ? t("contact.sending") : t("contact.send")}
          </button>
        </form>
      </SectionCard>

      <SectionCard title={t("contact.other")}>
        <p className="text-sm text-muted">{t("contact.otherInfo")}</p>
      </SectionCard>
    </div>
  );
}
