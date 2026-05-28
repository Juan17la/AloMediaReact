import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff, Chrome, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { signUp } from "../../services/authService";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../hooks/useAuth";
import { hashPassword } from "../../utils/passwordHash";
import { AUTH_LIMITS } from "../../constants/authValidation";

function PasswordField({
  name,
  label,
  placeholder,
  value,
  onChange,
  hasError,
}: {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const [show, setShow] = useState(false);
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[13px] text-muted-foreground tracking-wide pl-1">
        {label}
      </label>
      <div className="relative group">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150 pointer-events-none" />
        <input
          id={name}
          type={show ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          required
          minLength={AUTH_LIMITS.passwordMinLength}
          maxLength={AUTH_LIMITS.passwordMaxLength}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input-base w-full rounded-lg py-3 pl-12 pr-12 text-on-surface text-sm font-medium border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden ${
            hasError ? "border-error focus:border-error focus:ring-error/20" : ""
          }`}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? t("aria.hidePassword") : t("aria.showPassword")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-on-surface transition-colors duration-150 cursor-pointer"
        >
          {show ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation("auth");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const apiError = error instanceof ApiError ? error : null;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedEmail) {
      setError(new Error(t("validation.emailRequired")));
      return;
    }

    if (normalizedEmail.length > AUTH_LIMITS.emailMaxLength) {
      setError(new Error(t("validation.emailTooLong", { max: AUTH_LIMITS.emailMaxLength })));
      return;
    }

    if (normalizedFirstName.length < AUTH_LIMITS.nameMinLength || normalizedLastName.length < AUTH_LIMITS.nameMinLength) {
      setError(new Error(t("validation.nameTooShort", { min: AUTH_LIMITS.nameMinLength })));
      return;
    }

    if (normalizedFirstName.length > AUTH_LIMITS.nameMaxLength || normalizedLastName.length > AUTH_LIMITS.nameMaxLength) {
      setError(new Error(t("validation.nameTooLong", { max: AUTH_LIMITS.nameMaxLength })));
      return;
    }

    if (password.length < AUTH_LIMITS.passwordMinLength) {
      setError(new Error(t("validation.passwordTooShort", { min: AUTH_LIMITS.passwordMinLength })));
      return;
    }

    if (password.length > AUTH_LIMITS.passwordMaxLength) {
      setError(new Error(t("validation.passwordTooLong", { max: AUTH_LIMITS.passwordMaxLength })));
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    setError(null);
    setIsPending(true);
    try {
      const res = await signUp({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        password: hashPassword(password)
      });
      login({ id: res.id, firstName: res.firstName, lastName: res.lastName, email: res.email, role: res.role });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  const handleOAuthSignUpGoogle = () => {
    window.location.href = import.meta.env.VITE_BASE_URL + "/oauth2/authorize/google";
  }

  return (
    <div className="auth-glass-card py-6 px-5 sm:py-7 sm:px-12 max-w-195 mx-auto w-full animate-slide-up">
      <h1 className="text-3xl font-extrabold text-center mb-1 tracking-[-0.02em] text-gradient-primary">
        {t("register.title")}
      </h1>
      <p className="text-[13px] text-muted-foreground text-center mb-8 tracking-wide">
        {t("register.subtitle")}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-stretch gap-8">

        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] text-muted-foreground tracking-wide pl-1">
              {t("register.emailLabel")}
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

          {/* Name fields */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label htmlFor="firstName" className="text-[13px] text-muted-foreground tracking-wide pl-1">
                {t("register.firstNameLabel")}
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  placeholder={t("register.firstNamePlaceholder")}
                  required
                  minLength={AUTH_LIMITS.nameMinLength}
                  maxLength={AUTH_LIMITS.nameMaxLength}
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`input-base w-full rounded-lg py-3 pl-12 pr-4 text-on-surface text-sm font-medium border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                    apiError?.fieldMessage("firstName") ? "border-error focus:border-error focus:ring-error/20" : ""
                  }`}
                />
              </div>
              {apiError?.fieldMessage("firstName") && (
                <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                  <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                  <p className="text-xs text-error">{apiError.fieldMessage("firstName")}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label htmlFor="lastName" className="text-[13px] text-muted-foreground tracking-wide pl-1">
                {t("register.lastNameLabel")}
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  placeholder={t("register.lastNamePlaceholder")}
                  required
                  minLength={AUTH_LIMITS.nameMinLength}
                  maxLength={AUTH_LIMITS.nameMaxLength}
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`input-base w-full rounded-lg py-3 pl-12 pr-4 text-on-surface text-sm font-medium border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                    apiError?.fieldMessage("lastName") ? "border-error focus:border-error focus:ring-error/20" : ""
                  }`}
                />
              </div>
              {apiError?.fieldMessage("lastName") && (
                <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                  <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                  <p className="text-xs text-error">{apiError.fieldMessage("lastName")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <PasswordField
              name="password"
              label={t("register.passwordLabel")}
              placeholder={t("register.passwordPlaceholder")}
              value={password}
              onChange={(v) => { setPassword(v); setPasswordMismatch(false); }}
              hasError={!!apiError?.fieldMessage("password")}
            />
            {apiError?.fieldMessage("password") && (
              <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                <p className="text-xs text-error">{apiError.fieldMessage("password")}</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <PasswordField
              name="confirmPassword"
              label={t("register.confirmPasswordLabel")}
              placeholder={t("register.confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(v) => { setConfirmPassword(v); setPasswordMismatch(false); }}
              hasError={passwordMismatch}
            />
            {passwordMismatch && (
              <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                <p className="text-xs text-error">{t("validation.passwordsMismatch")}</p>
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
            {isPending ? t("register.submitting") : t("register.submit")}
          </button>
        </form>

        {/* Vertical divider (sm+) */}
        <div className="hidden sm:block w-px self-stretch bg-linear-to-b from-transparent via-white/8 to-transparent" />
        {/* Horizontal divider (mobile) */}
        <div className="sm:hidden h-px bg-linear-to-r from-transparent via-white/8 to-transparent" />

        {/* Right: OAuth */}
        <div className="flex flex-col gap-2.5 sm:flex-1 sm:justify-center">
          <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em] text-center mb-1">
            {t("register.oauthContinue")}
          </span>
          <button
            type="button"
            className="flex items-center justify-center gap-3 w-full border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold py-3.5 rounded-lg text-sm group cursor-pointer hover:bg-surface-container-low hover:border-outline transition-all"
            onClick={handleOAuthSignUpGoogle}
          >
            <Chrome className="w-5 h-5 text-muted-foreground group-hover:text-on-surface transition-colors duration-150" />
            {t("register.oauthGoogle")}
          </button>

        </div>

      </div>

      <p className="text-center text-muted-foreground text-sm mt-8">
        {t("register.hasAccount")}{" "}
        <Link
          to="/auth/login"
          className="text-primary hover:text-primary/80 font-bold transition-colors duration-150"
        >
          {t("register.signIn")}
        </Link>
      </p>
    </div>
  );
}
