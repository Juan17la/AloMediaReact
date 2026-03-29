import { useState, type SyntheticEvent } from "react";
import { Link } from "react-router";
import { Mail, MailCheck, AlertCircle } from "lucide-react";
import { recoverRequest } from "../../services/authService";
import { ApiError } from "../../api/errors";

export default function RecoverRequestPage() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sent, setSent] = useState(false);

  const apiError = error instanceof ApiError ? error : null;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await recoverRequest({ email });
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
        <MailCheck className="w-14 h-14 text-accent-red" />
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">Check your email</h1>
        <p className="text-white/40 text-sm max-w-xs">
          We've sent a recovery link to{" "}
          <span className="text-accent-white font-medium">{email}</span>. Check
          your inbox and follow the instructions.
        </p>
        <Link
          to="/auth/login"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-150 mt-2"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-glass-card py-5 px-6 sm:py-7 sm:px-12 max-w-130 mx-auto w-full animate-slide-up">
      <h1 className="text-3xl font-extrabold text-center mb-1 tracking-[-0.02em] text-gradient-red">
        Recover Password
      </h1>
      <p className="text-[13px] text-white/40 text-center mb-8 tracking-wide">
        Enter your email and we'll send you a recovery link
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recover-email" className="text-[13px] text-white/50 tracking-wide pl-1">
            Email address
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white/70 transition-colors duration-150" />
            <input
              id="recover-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`auth-input w-full rounded-lg py-3 pl-12 pr-4 text-accent-white placeholder-white/25 text-sm font-medium ${
                apiError?.fieldMessage("email") ? "input-error" : ""
              }`}
            />
          </div>
          {apiError?.fieldMessage("email") && (
            <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{apiError.fieldMessage("email")}</p>
            </div>
          )}
        </div>

        {error && (!apiError || apiError.fields.length === 0) && (
          <div className="flex items-center justify-center gap-1.5 -mt-1 animate-error-slide">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error.message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="auth-btn-primary w-full bg-linear-to-r from-blood-red to-crimson text-accent-white font-semibold py-3.5 rounded-lg text-sm tracking-wide cursor-pointer"
        >
          {isPending ? "Sending\u2026" : "Send Recovery Link"}
        </button>

        <p className="text-center text-white/45 text-sm">
          Remember your password?{" "}
          <Link
            to="/auth/login"
            className="text-accent-red hover:text-rose-muted font-bold transition-colors duration-150"
          >
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
