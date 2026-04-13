import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { User, Lock, Mail, Shield, ArrowLeft, AlertCircle, Check } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { recoverRequest } from "../../services/authService";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation("pages");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequested, setPasswordRequested] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // Profile update endpoint — placeholder until API is confirmed
      const token = document.cookie.match(/token=([^;]+)/)?.[1];
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/user/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error(t("profile.updateError"));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    try {
      await recoverRequest({ email: user.email });
      setPasswordRequested(true);
      setTimeout(() => setPasswordRequested(false), 5000);
    } catch {
      setError(t("profile.updateError"));
    }
  };

  const handleReset = () => {
    if (user) {
      setFormData({ firstName: user.firstName, lastName: user.lastName });
    }
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080a0d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(122,26,26,0.18)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(45,10,20,0.26)_0%,transparent_55%)]" />

      <main className="relative z-10 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-5">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors duration-150 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <PageHeader
            title={t("profile.title")}
            subtitle={t("profile.subtitle")}
            icon={<User className="h-5 w-5 text-blood-red" />}
          />

          {/* Personal Info */}
          <SectionCard title={t("profile.personalInfo")} icon={<User className="w-4 h-4" />}>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className="text-[13px] text-white/50 tracking-wide pl-1">
                  {t("profile.firstName")}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="auth-input w-full rounded-lg py-3 px-4 text-accent-white text-sm font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className="text-[13px] text-white/50 tracking-wide pl-1">
                  {t("profile.lastName")}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="auth-input w-full rounded-lg py-3 px-4 text-accent-white text-sm font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] text-white/50 tracking-wide pl-1">
                  {t("profile.email")}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="auth-input w-full rounded-lg py-3 pl-12 pr-4 text-white/40 text-sm font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-white/50 tracking-wide pl-1">
                  {t("profile.role")}
                </label>
                <div className="relative group">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="text"
                    value={user?.role ?? ""}
                    disabled
                    className="auth-input w-full rounded-lg py-3 pl-12 pr-4 text-white/40 text-sm font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-1.5 pl-1 animate-slide-up">
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <p className="text-xs text-green-400">{t("profile.updateSuccess")}</p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="auth-btn-primary rounded-lg bg-linear-to-r from-blood-red to-crimson px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {saving ? t("profile.saving") : t("profile.save")}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/8 transition-colors duration-150"
                >
                  {t("common:actions.cancel")}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* Security */}
          <SectionCard title={t("profile.security")} icon={<Lock className="w-4 h-4" />}>
            <p className="text-sm text-white/50 mb-4">{t("profile.securityDescription")}</p>
            {passwordRequested ? (
              <div className="flex items-center gap-1.5 animate-slide-up">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <p className="text-xs text-green-400">Recovery email sent. Check your inbox.</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleChangePassword}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/8 transition-colors duration-150"
              >
                {t("profile.changePassword")}
              </button>
            )}
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
