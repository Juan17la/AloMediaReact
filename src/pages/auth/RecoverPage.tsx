import { useState, useEffect, type SyntheticEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Lock, Loader2, ShieldX, ShieldCheck, AlertCircle } from "lucide-react";
import { validateRecoverToken, recoverReset } from "../../services/authService";
import { ApiError } from "../../api/errors";

export default function RecoverPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

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
      setValidationError("No recovery token found. Please request a new recovery link.");
      setValidating(false);
      return;
    }
    validateRecoverToken(token)
      .then(() => setValidating(false))
      .catch((err: unknown) => {
        setValidationError(
          err instanceof Error ? err.message : "This recovery link is invalid or has expired."
        );
        setValidating(false);
      });
  }, [token]);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFormError(new Error("Passwords do not match."));
      return;
    }
    setFormError(null);
    setIsPending(true);
    try {
      await recoverReset({ token, newPassword, confirmPassword });
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
        <p className="text-white/40 text-sm">Verifying your recovery link\u2026</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up flex flex-col items-center gap-4 text-center">
        <ShieldX className="w-14 h-14 text-red-400" />
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">Invalid Link</h1>
        <p className="text-white/40 text-sm max-w-xs">{validationError}</p>
        <Link
          to="/auth/recover/request"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-150 mt-2"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (resetDone) {
    return (
      <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up flex flex-col items-center gap-4 text-center">
        <ShieldCheck className="w-14 h-14 text-accent-red" />
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">Password Reset!</h1>
        <p className="text-white/40 text-sm max-w-xs">
          Your password has been changed successfully. You can now sign in with your new password.
        </p>
        <Link
          to="/auth/login"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-150 mt-2"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up">
      <h1 className="text-3xl font-extrabold text-center mb-1 tracking-[-0.02em] text-gradient-red">
        New Password
      </h1>
      <p className="text-[13px] text-white/40 text-center mb-8 tracking-wide">
        Choose a strong password for your account
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-[13px] text-white/50 tracking-wide pl-1">
            New password
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
            Confirm new password
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
          {isPending ? "Resetting\u2026" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
