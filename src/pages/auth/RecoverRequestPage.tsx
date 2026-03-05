import { useState, type SyntheticEvent } from "react";
import { Link } from "react-router";
import { Mail, MailCheck } from "lucide-react";
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
      <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up flex flex-col items-center gap-4 text-center">
        <MailCheck className="w-14 h-14 text-accent-red" />
        <h1 className="text-2xl font-bold text-gradient-red">Check your email</h1>
        <p className="text-muted text-sm max-w-xs">
          We've sent a recovery link to{" "}
          <span className="text-accent-white font-medium">{email}</span>. Check
          your inbox and follow the instructions.
        </p>
        <Link
          to="/auth/login"
          className="text-accent-red hover:text-rose-muted font-bold text-sm transition-colors duration-200 mt-2"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up">
      <h1 className="text-3xl font-bold text-center mb-1 tracking-wide text-gradient-red">
        Recover Password
      </h1>
      <p className="text-muted text-sm text-center mb-8">
        Enter your email and we'll send you a recovery link
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent-red transition-colors" />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-4 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 ${
                apiError?.fieldMessage("email")
                  ? "border-red-500"
                  : "border-input-border"
              }`}
            />
          </div>
          {apiError?.fieldMessage("email") && (
            <p className="text-xs text-red-400 pl-1">
              {apiError.fieldMessage("email")}
            </p>
          )}
        </div>

        {error && (!apiError || apiError.fields.length === 0) && (
          <p className="text-xs text-red-400 text-center -mt-1">
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-linear-to-r from-blood-red to-crimson hover:from-blood-red-light hover:to-blood-red-glow text-accent-white font-semibold py-3.5 rounded-xl transition-all duration-300 text-sm tracking-wide shadow-lg shadow-blood-red/25 hover:shadow-blood-red/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isPending ? "Sending…" : "Send Recovery Link"}
        </button>

        <p className="text-center text-muted text-sm">
          Remember your password?{" "}
          <Link
            to="/auth/login"
            className="text-accent-red hover:text-rose-muted font-bold transition-colors duration-200"
          >
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
