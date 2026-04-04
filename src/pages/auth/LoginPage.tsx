import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, Chrome, Github, AlertCircle } from "lucide-react";
import { signIn } from "../../services/authService";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../hooks/useAuth";
import { hashPassword } from "../../utils/passwordHash";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const apiError = error instanceof ApiError ? error : null;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await signIn({ email, password: hashPassword(password) });
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
      <h1 className="text-3xl font-extrabold text-center mb-1 tracking-[-0.02em] text-gradient-red">
        Welcome Back
      </h1>
      <p className="text-[13px] text-white/40 text-center mb-8 tracking-wide">
        Sign in to continue to AloMedia
      </p>

      <div className="flex flex-col sm:flex-row sm:items-stretch gap-8">

        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] text-white/50 tracking-wide pl-1">
              Email address
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white/70 transition-colors duration-150" />
              <input
                id="email"
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

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] text-white/50 tracking-wide pl-1">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white/70 transition-colors duration-150 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`auth-input w-full rounded-lg py-3 pl-12 pr-12 text-accent-white text-sm font-medium [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden ${
                  apiError?.fieldMessage("password") ? "input-error" : ""
                }`}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors duration-150 cursor-pointer"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {apiError?.fieldMessage("password") && (
              <div className="flex items-center gap-1.5 pl-1 animate-error-slide">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{apiError.fieldMessage("password")}</p>
              </div>
            )}
          </div>

          {/* General (non-field) error */}
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
            {isPending ? "Signing in\u2026" : "Sign In"}
          </button>

          <div className="flex items-center justify-between text-xs px-1">
            <Link
              to="/auth/recover/request"
              className="text-white/40 hover:text-white/60 font-bold transition-colors duration-150 underline underline-offset-2"
            >
              Forgot Password?
            </Link>
            <a
              href="#"
              className="text-white/40 hover:text-white/60 font-bold transition-colors duration-150 underline underline-offset-2"
            >
              Terms &amp; Conditions
            </a>
          </div>
        </form>

        {/* Vertical divider (sm+) */}
        <div className="hidden sm:block w-px self-stretch bg-linear-to-b from-transparent via-white/8 to-transparent" />
        {/* Horizontal divider (mobile) */}
        <div className="sm:hidden h-px bg-linear-to-r from-transparent via-white/8 to-transparent" />

        {/* Right: OAuth */}
        <div className="flex flex-col gap-2.5 sm:flex-1 sm:justify-center">
          <span className="text-white/35 text-[11px] font-semibold uppercase tracking-[0.08em] text-center mb-1">
            or continue with
          </span>
          <button
            type="button"
            className="auth-btn-secondary flex items-center justify-center gap-3 w-full border border-dark-border text-accent-white font-semibold py-3.5 rounded-lg text-sm group cursor-pointer"
            onClick={handleOAuthLoginGoogle}
          >
            <Chrome className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors duration-150" />
            Sign in with Google
          </button>
          <button
            type="button"
            className="auth-btn-secondary flex items-center justify-center gap-3 w-full border border-dark-border text-accent-white font-semibold py-3.5 rounded-lg text-sm group cursor-pointer"
          >
            <Github className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors duration-150" />
            Sign in with GitHub
          </button>
        </div>

      </div>

      <p className="text-center text-white/45 text-sm mt-8">
        Don't have an account?{" "}
        <Link
          to="/auth/register"
          className="text-accent-red hover:text-rose-muted font-bold transition-colors duration-150"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}
