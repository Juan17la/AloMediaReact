import { useState, useEffect, type SyntheticEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Lock, Loader2, ShieldX, ShieldCheck } from "lucide-react";
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
      setValidationError(
        "No recovery token found. Please request a new recovery link."
      );
      setValidating(false);
      return;
    }

    validateRecoverToken(token)
      .then(() => setValidating(false))
      .catch((err: unknown) => {
        setValidationError(
          err instanceof Error
            ? err.message
            : "This recovery link is invalid or has expired."
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

  //Validating 
  if (validating) {
    return (
      <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up flex flex-col items-center gap-5 text-center min-h-55 justify-center">
        <Loader2 className="w-12 h-12 text-accent-red animate-spin" />
        <p className="text-muted text-sm">Verifying your recovery link…</p>
      </div>
    );
  }

  // Invalid token 
  if (validationError) {
    return (
      <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up flex flex-col items-center gap-4 text-center">
        <ShieldX className="w-14 h-14 text-red-400" />
        <h1 className="text-2xl font-bold text-gradient-red">Invalid Link</h1>
        <p className="text-muted text-sm max-w-xs">{validationError}</p>
        <Link
          to="/auth/recover/request"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-200 mt-2"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  // Reset successful
  if (resetDone) {
    return (
      <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up flex flex-col items-center gap-4 text-center">
        <ShieldCheck className="w-14 h-14 text-accent-red" />
        <h1 className="text-2xl font-bold text-gradient-red">
          Password Reset!
        </h1>
        <p className="text-muted text-sm max-w-xs">
          Your password has been changed successfully. You can now sign in with
          your new password.
        </p>
        <Link
          to="/auth/login"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-200 mt-2"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Reset form 
  return (
    <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up">
      <h1 className="text-3xl font-bold text-center mb-1 tracking-wide text-gradient-red">
        New Password
      </h1>
      <p className="text-muted text-sm text-center mb-8">
        Choose a strong password for your account
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent-red transition-colors" />
            <input
              type="password"
              name="newPassword"
              placeholder="New password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-4 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 ${
                apiError?.fieldMessage("newPassword")
                  ? "border-red-500"
                  : "border-input-border"
              }`}
            />
          </div>
          {apiError?.fieldMessage("newPassword") && (
            <p className="text-xs text-red-400 pl-1">
              {apiError.fieldMessage("newPassword")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent-red transition-colors" />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-4 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 ${
                apiError?.fieldMessage("confirmPassword")
                  ? "border-red-500"
                  : "border-input-border"
              }`}
            />
          </div>
          {apiError?.fieldMessage("confirmPassword") && (
            <p className="text-xs text-red-400 pl-1">
              {apiError.fieldMessage("confirmPassword")}
            </p>
          )}
        </div>

        {formError && (!apiError || apiError.fields.length === 0) && (
          <p className="text-xs text-red-400 text-center -mt-1">
            {formError.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-linear-to-r from-blood-red to-crimson hover:from-blood-red-light hover:to-blood-red-glow text-accent-white font-semibold py-3.5 rounded-xl transition-all duration-300 text-sm tracking-wide shadow-lg shadow-blood-red/25 hover:shadow-blood-red/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isPending ? "Resetting…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
