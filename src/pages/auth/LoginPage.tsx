import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, Chrome, Github, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { signIn } from "../../services/authService";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../hooks/useAuth";
import { hashPassword } from "../../utils/passwordHash";
import { AUTH_LIMITS } from "../../constants/authValidation";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const apiError = error instanceof ApiError ? error : null;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError(new Error(t("validation.emailRequired")));
      return;
    }

    if (normalizedEmail.length > AUTH_LIMITS.emailMaxLength) {
      setError(new Error(t("validation.emailTooLong", { max: AUTH_LIMITS.emailMaxLength })));
      return;
    }

    if (password.length > AUTH_LIMITS.passwordMaxLength) {
      setError(new Error(t("validation.passwordTooLong", { max: AUTH_LIMITS.passwordMaxLength })));
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const res = await signIn({ email: normalizedEmail, password: hashPassword(password) });
      login({ id: res.id, firstName: res.firstName, lastName: res.lastName, email: res.email, role: res.role });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  const handleOAuthLoginGoogle = () => {
    window.location.href = import.meta.env.VITE_BASE_URL + "/oauth2/authorize/google";
  }

  return (
    <div className="auth-glass-card py-7 px-12 max-w-180 mx-auto w-full animate-slide-up">
      {/* Header */}
      <h1 className="text-3xl font-extrabold text-center mb-1 tracking-[-0.02em] text-gradient-primary">
        {t("login.title")}
      </h1>
      <p className="text-[13px] text-muted-foreground text-center mb-8 tracking-wide">
        {t("login.subtitle")}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-stretch gap-8">

        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] text-muted-foreground tracking-wide pl-1">
              {t("login.emailLabel")}
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                maxLength={AUTH_LIMITS.emailMaxLength}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-base w-full rounded-lg py-3 pl-12 pr-4 text-on-surface placeholder:text-muted-foreground text-sm font-medium border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                  apiError?.fieldMessage("email") ? "border-error focus:border-error focus:ring-error/20" : ""
                }`}
              />
            </div>
            {apiError?.fieldMessage("email") && (
              <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                <p className="text-xs text-error">{apiError.fieldMessage("email")}</p>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] text-muted-foreground tracking-wide pl-1">
              {t("login.passwordLabel")}
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t("login.passwordPlaceholder")}
                required
                maxLength={AUTH_LIMITS.passwordMaxLength}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-base w-full rounded-lg py-3 pl-12 pr-12 text-on-surface placeholder:text-muted-foreground text-sm font-medium border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden ${
                  apiError?.fieldMessage("password") ? "border-error focus:border-error focus:ring-error/20" : ""
                }`}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? t("common:aria.hidePassword") : t("common:aria.showPassword")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-on-surface transition-colors duration-150 cursor-pointer"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {apiError?.fieldMessage("password") && (
              <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                <p className="text-xs text-error">{apiError.fieldMessage("password")}</p>
              </div>
            )}
          </div>

          {/* General (non-field) error */}
          {error && (!apiError || apiError.fields.length === 0) && (
            <div className="flex items-center justify-center gap-1.5 -mt-1 animate-error-slide">
              <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
              <p className="text-xs text-error">{error.message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-md text-sm tracking-wide cursor-pointer hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isPending ? t("login.submitting") : t("login.submit")}
          </button>

          <div className="flex items-center justify-between text-xs px-1">
            <Link
              to="/auth/recover/request"
              className="text-muted-foreground hover:text-primary font-bold transition-colors duration-150 underline underline-offset-2"
            >
              {t("login.forgotPassword")}
            </Link>
            <Link
              to="/legal/terms"
              className="text-muted-foreground hover:text-on-surface font-bold transition-colors duration-150 underline underline-offset-2"
            >
              {t("login.termsAndConditions")}
            </Link>
          </div>
        </form>

        {/* Vertical divider (sm+) */}
        <div className="hidden sm:block w-px self-stretch bg-linear-to-b from-transparent via-outline-variant to-transparent" />
        {/* Horizontal divider (mobile) */}
        <div className="sm:hidden h-px bg-linear-to-r from-transparent via-outline-variant to-transparent" />

        {/* Right: OAuth */}
        <div className="flex flex-col gap-2.5 sm:flex-1 sm:justify-center">
          <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em] text-center mb-1">
            {t("login.oauthContinue")}
          </span>
          <button
            type="button"
            className="flex items-center justify-center gap-3 w-full border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold py-3.5 rounded-lg text-sm group cursor-pointer hover:bg-surface-container-low hover:border-outline transition-all"
            onClick={handleOAuthLoginGoogle}
          >
            <Chrome className="w-5 h-5 text-muted-foreground group-hover:text-on-surface transition-colors duration-150" />
            {t("login.oauthGoogle")}
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-3 w-full border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold py-3.5 rounded-lg text-sm group cursor-pointer hover:bg-surface-container-low hover:border-outline transition-all"
          >
            <Github className="w-5 h-5 text-muted-foreground group-hover:text-on-surface transition-colors duration-150" />
            {t("login.oauthGithub")}
          </button>
        </div>

      </div>

      <p className="text-center text-muted-foreground text-sm mt-8">
        {t("login.noAccount")}{" "}
        <Link
          to="/auth/register"
          className="text-primary hover:text-primary/80 font-bold transition-colors duration-150"
        >
          {t("login.signUp")}
        </Link>
      </p>
    </div>
  );
}
