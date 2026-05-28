import { useState, type SyntheticEvent } from "react";
import { Link } from "react-router";
import { Mail, MailCheck, AlertCircle } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { recoverRequest } from "../../services/authService";
import { ApiError } from "../../api/errors";
import { AUTH_LIMITS } from "../../constants/authValidation";

export default function RecoverRequestPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sent, setSent] = useState(false);

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

    setError(null);
    setIsPending(true);
    try {
      await recoverRequest({ email: normalizedEmail });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up flex flex-col items-center gap-4 text-center">
        <MailCheck className="w-14 h-14 text-primary" />
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-primary">{t("recover.sentTitle")}</h1>
        <p className="text-muted-foreground text-sm max-w">
          <Trans
            i18nKey="recover.sentMessage"
            ns="auth"
            values={{ email }}
            components={{ email: <span className="text-on-surface font-medium" /> }}
          />
        </p>
        <Link
          to="/auth/login"
          className="text-primary hover:text-primary/80 font-bold text-sm transition-colors duration-150 mt-2"
        >
          {t("recover.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up">
      <h1 className="text-3xl font-extrabold text-center mb-1 tracking-[-0.02em] text-gradient-primary">
        {t("recover.title")}
      </h1>
      <p className="text-[13px] text-muted-foreground text-center mb-8 tracking-wide">
        {t("recover.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recover-email" className="text-[13px] text-muted-foreground tracking-wide pl-1">
            {t("recover.emailLabel")}
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
            <input
              id="recover-email"
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
          {isPending ? t("recover.submitting") : t("recover.submit")}
        </button>

        <p className="text-center text-muted-foreground text-sm">
          {t("recover.rememberPassword")}{" "}
          <Link
            to="/auth/login"
            className="text-primary hover:text-primary/80 font-bold transition-colors duration-150"
          >
            {t("recover.signIn")}
          </Link>
        </p>
      </form>
    </div>
  );
}
