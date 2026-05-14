import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { User, Lock, Mail, Shield, ArrowLeft, AlertCircle, Check, Home } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { recoverRequest } from "../../services/authService";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import { GeometricBackground } from "../../components/GeometricBackground";

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
    <div className="relative min-h-screen overflow-hidden bg-surface text-on-surface">
      <GeometricBackground />

      <main className="relative z-10 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-on-surface"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </Link>
            <span className="text-muted-foreground/30">|</span>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-on-surface"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </button>
          </div>

          <PageHeader
            title={t("profile.title")}
            subtitle={t("profile.subtitle")}
            icon={<User className="h-5 w-5 text-primary" />}
          />

          {/* Personal Info */}
          <SectionCard title={t("profile.personalInfo")} icon={<User className="w-4 h-4" />}>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className="text-[13px] text-muted-foreground tracking-wide pl-1">
                  {t("profile.firstName")}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg py-3 px-4 bg-surface-container border border-outline-variant text-on-surface placeholder:text-muted-foreground/50 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className="text-[13px] text-muted-foreground tracking-wide pl-1">
                  {t("profile.lastName")}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg py-3 px-4 bg-surface-container border border-outline-variant text-on-surface placeholder:text-muted-foreground/50 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] text-muted-foreground tracking-wide pl-1">
                  {t("profile.email")}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="w-full rounded-lg py-3 pl-12 pr-4 bg-surface-container/50 border border-outline-variant/50 text-muted-foreground text-sm font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {user?.role === "ADMIN" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-muted-foreground tracking-wide pl-1">
                    {t("profile.role")}
                  </label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={user?.role ?? ""}
                      disabled
                      className="w-full rounded-lg py-3 pl-12 pr-4 bg-surface-container/50 border border-outline-variant/50 text-muted-foreground text-sm font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                  <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                  <p className="text-xs text-error">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-1.5 pl-1 animate-slide-up">
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
                <p className="text-xs text-success">{t("profile.updateSuccess")}</p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? t("profile.saving") : t("profile.save")}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-md border border-border bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150"
                >
                  {t("common:actions.cancel")}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* Security */}
          <SectionCard title={t("profile.security")} icon={<Lock className="w-4 h-4" />}>
            <p className="mb-4 text-sm text-muted-foreground">{t("profile.securityDescription")}</p>
            {passwordRequested ? (
              <div className="flex items-center gap-1.5 animate-slide-up">
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
                <p className="text-xs text-success">Recovery email sent. Check your inbox.</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleChangePassword}
                className="rounded-md border border-border bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary transition-colors duration-150"
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
