import { useState, useEffect, type SyntheticEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Lock, Loader2, ShieldX, ShieldCheck, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { validateRecoverToken, recoverReset } from "../../services/authService";
import { ApiError } from "../../api/errors";
import { hashPassword } from "../../utils/passwordHash";

export default function RecoverPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { t } = useTranslation("auth");

  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<Error | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const apiError = formError instanceof ApiError ? formError : null;

  useEffect(() => {
    if (!token) {
      setValidationError(t("reset.noToken"));
      setValidating(false);
      return;
    }
    validateRecoverToken(token)
      .then(() => setValidating(false))
      .catch((err: unknown) => {
        setValidationError(
          err instanceof Error ? err.message : t("reset.expiredToken")
        );
        setValidating(false);
      });
  }, [token, t]);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFormError(new Error(t("validation.passwordsMismatch")));
      return;
    }
    setFormError(null);
    setIsPending(true);
    try {
      await recoverReset({
        token,
        newPassword: hashPassword(newPassword),
        confirmPassword: hashPassword(confirmPassword)
      });
      setResetDone(true);
    } catch (err) {
      setFormError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  if (validating) {
    return (
      <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up flex flex-col items-center gap-5 text-center min-h-55 justify-center">
        <Loader2 className="w-12 h-12 text-accent-red animate-spin" />
        <p className="text-white/40 text-sm">{t("reset.verifying")}</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up flex flex-col items-center gap-4 text-center">
        <ShieldX className="w-14 h-14 text-red-400" />
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">{t("reset.invalidLinkTitle")}</h1>
        <p className="text-white/40 text-sm max-w-xs">{validationError}</p>
        <Link
          to="/auth/recover/request"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-150 mt-2"
        >
          {t("reset.requestNewLink")}
        </Link>
      </div>
    );
  }

  if (resetDone) {
    return (
      <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up flex flex-col items-center gap-4 text-center">
        <ShieldCheck className="w-14 h-14 text-accent-red" />
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">{t("reset.successTitle")}</h1>
        <p className="text-white/40 text-sm max-w-xs">
          {t("reset.successMessage")}
        </p>
        <Link
          to="/auth/login"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-150 mt-2"
        >
          {t("reset.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up">
      <h1 className="text-3xl font-extrabold text-center mb-1 tracking-[-0.02em] text-gradient-red">
        {t("reset.title")}
      </h1>
      <p className="text-[13px] text-white/40 text-center mb-8 tracking-wide">
        {t("reset.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-[13px] text-white/50 tracking-wide pl-1">
            {t("reset.newPasswordLabel")}
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white/70 transition-colors duration-150 pointer-events-none" />
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`auth-input w-full rounded-lg py-3 pl-12 pr-4 text-accent-white text-sm font-medium [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                apiError?.fieldMessage("newPassword") ? "input-error" : ""
              }`}
            />
          </div>
          {apiError?.fieldMessage("newPassword") && (
            <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{apiError.fieldMessage("newPassword")}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-[13px] text-white/50 tracking-wide pl-1">
            {t("reset.confirmPasswordLabel")}
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white/70 transition-colors duration-150 pointer-events-none" />
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`auth-input w-full rounded-lg py-3 pl-12 pr-4 text-accent-white text-sm font-medium [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                apiError?.fieldMessage("confirmPassword") ? "input-error" : ""
              }`}
            />
          </div>
          {apiError?.fieldMessage("confirmPassword") && (
            <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{apiError.fieldMessage("confirmPassword")}</p>
            </div>
          )}
        </div>

        {formError && (!apiError || apiError.fields.length === 0) && (
          <div className="flex items-center justify-center gap-1.5 -mt-1 animate-error-slide">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{formError.message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="auth-btn-primary w-full bg-linear-to-r from-blood-red to-crimson text-accent-white font-semibold py-3.5 rounded-lg text-sm tracking-wide cursor-pointer"
        >
          {isPending ? t("reset.submitting") : t("reset.submit")}
        </button>
      </form>
    </div>
  );
}
