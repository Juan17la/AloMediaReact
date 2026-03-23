import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, Chrome, Github } from "lucide-react";
import { signIn } from "../../services/authService";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../hooks/useAuth";

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
      const res = await signIn({ email, password });
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
    <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up">
      {/* Logo area */}
      <h1 className="text-3xl font-bold text-center mb-1 tracking-wide text-gradient-red">
        Welcome Back
      </h1>
      <p className="text-muted text-sm text-center mb-8">
        Sign in to continue to AloMedia
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Column 1: Credentials */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 order-1">
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
                  apiError?.fieldMessage("email") ? "border-red-500" : "border-input-border"
                }`}
              />
            </div>
            {apiError?.fieldMessage("email") && (
              <p className="text-xs text-red-400 pl-1">{apiError.fieldMessage("email")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-12 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden ${
                  apiError?.fieldMessage("password") ? "border-red-500" : "border-input-border"
                }`}
              />
              {/*
                onMouseDown + e.preventDefault()
                it never disappears after the first click.
              */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-light hover:text-accent-white transition-colors cursor-pointer"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {apiError?.fieldMessage("password") && (
              <p className="text-xs text-red-400 pl-1">{apiError.fieldMessage("password")}</p>
            )}
          </div>

          {/* General (non-field) error */}
          {error && (!apiError || apiError.fields.length === 0) && (
            <p className="text-xs text-red-400 text-center -mt-1">{error.message}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-linear-to-r from-blood-red to-crimson hover:from-blood-red-light hover:to-blood-red-glow text-accent-white font-semibold py-3.5 rounded-xl transition-all duration-300 text-sm tracking-wide shadow-lg shadow-blood-red/25 hover:shadow-blood-red/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isPending ? "Signing in…" : "Sign In"}
          </button>

          <div className="flex items-center justify-between text-xs px-1">
            <Link
              to="/auth/recover/request"
              className="text-muted hover:text-rose-muted text-bold transition-colors duration-200 underline underline-offset-2 "
            >
              Forgot Password?
            </Link>
            <a
              href="#"
              className="text-muted hover:text-rose-muted text-bold transition-colors duration-200 underline underline-offset-2 "
            >
              Terms & Conditions
            </a>
          </div>
        </form>

        {/* Divider */}
        <div className="hidden md:flex flex-col items-center gap-3 px-2 order-2">
          <div className="flex-1 w-px bg-linear-to-b from-transparent via-dark-border to-transparent" />
          <span className="text-muted text-xs font-semibold uppercase tracking-widest">or</span>
          <div className="flex-1 w-px bg-linear-to-b from-transparent via-dark-border to-transparent" />
        </div>

        {/* This could be a conmponent to reuse in register and login */}
        {/* Column 2: OAuth */}
        <div className="flex-1 flex flex-col gap-4 justify-center order-3">
          <button
            type="button"
            className="flex items-center justify-center gap-3 w-full bg-dark-card/60 hover:bg-dark-elevated/80 border border-dark-border hover:border-dark-border-light text-accent-white font-semibold py-3.5 rounded-xl transition-all duration-200 text-sm group cursor-pointer"
            onClick={handleOAuthLoginGoogle}
          >
            <Chrome className="w-5 h-5 text-muted group-hover:text-accent-white transition-colors" />
            Sign in with Google
          </button>

          <button
            type="button"
            className="flex items-center justify-center gap-3 w-full bg-dark-card/60 hover:bg-dark-elevated/80 border border-dark-border hover:border-dark-border-light text-accent-white font-semibold py-3.5 rounded-xl transition-all duration-200 text-sm group cursor-pointer"
          >
            <Github className="w-5 h-5 text-muted group-hover:text-accent-white transition-colors" />
            Sign in with GitHub
          </button>
        </div>
      </div>

      <p className="text-center text-muted text-sm mt-8">
        Don't have an account?{" "}
        <Link
          to="/auth/register"
          className="text-accent-red hover:text-rose-muted font-bold transition-colors duration-200"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}