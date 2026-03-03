import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, User, Chrome, Github } from "lucide-react";
import { registerRequest, ApiError } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

/*
 * ============================================================
 *  REGISTERPAGE — Página de creación de cuenta
 * ============================================================
 *
 *  ESTRUCTURA DEL LAYOUT
 *  ─────────────────────
 *  Igual que LoginPage, usa dos columnas horizontales en
 *  desktop y apilado vertical en móvil:
 *
 *    [ Formulario ]  |  [ OAuth ]
 *
 *  El orden visual está controlado con clases `order-*` de
 *  Tailwind para que en todas las resoluciones el formulario
 *  quede a la izquierda y los botones OAuth a la derecha.
 *
 *  Columna izquierda — Formulario de registro (order-1):
 *    • Input de correo electrónico
 *    • Fila con dos inputs: nombre y apellido (flex gap-3)
 *    • Input de contraseña
 *    • Input de confirmar contraseña
 *    • Botón primario "Create Account" con degradado rojo
 *
 *  Divisor central (order-2):
 *    • Desktop: línea vertical + "OR"
 *    • Móvil:   línea horizontal + "OR"
 *
 *  Columna derecha — OAuth (order-3):
 *    • Botón "Sign up with Google"
 *    • Botón "Sign up with GitHub"
 *
 *  ORDEN DE LOS CAMPOS
 *  ───────────────────
 *  Los campos están pensados para un flujo de arriba a abajo:
 *    1. Email  →  identidad principal
 *    2. Nombre / Apellido  →  datos personales básicos
 *    3. Contraseña + Confirmación  →  seguridad al final
 *
 *  ESTILOS CLAVE
 *  ─────────────
 *  • Misma clase `.glass-card` del layout de autenticación.
 *  • Los inputs de nombre y apellido comparten una fila con
 *    `flex gap-3` para aprovechar el espacio horizontal.
 *  • Efecto de foco idéntico al de LoginPage.
 *
 *  NAVEGACIÓN
 *  ──────────
 *  • Ya tienes cuenta → enlace "Sign In" al pie → /auth/login
 * ============================================================
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const apiError = error instanceof ApiError ? error : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    setError(null);
    setIsPending(true);
    try {
      const { user, token } = await registerRequest({ firstName, lastName, email, password });
      login(user, token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 animate-slide-up">
      <h1 className="text-3xl font-bold text-center mb-1 tracking-wide text-gradient-red">
        Create Account
      </h1>
      <p className="text-muted text-sm text-center mb-8">
        Join AloMedia and start creating
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Column 1: Form Fields */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 order-1">
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

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent-red transition-colors" />
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-4 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 ${
                    apiError?.fieldMessage("firstName") ? "border-red-500" : "border-input-border"
                  }`}
                />
              </div>
              {apiError?.fieldMessage("firstName") && (
                <p className="text-xs text-red-400 pl-1">{apiError.fieldMessage("firstName")}</p>
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent-red transition-colors" />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-4 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 ${
                    apiError?.fieldMessage("lastName") ? "border-red-500" : "border-input-border"
                  }`}
                />
              </div>
              {apiError?.fieldMessage("lastName") && (
                <p className="text-xs text-red-400 pl-1">{apiError.fieldMessage("lastName")}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent-red transition-colors" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordMismatch(false); }}
                className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-4 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 ${
                  apiError?.fieldMessage("password") ? "border-red-500" : "border-input-border"
                }`}
              />
            </div>
            {apiError?.fieldMessage("password") && (
              <p className="text-xs text-red-400 pl-1">{apiError.fieldMessage("password")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent-red transition-colors" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMismatch(false); }}
                className={`w-full bg-input-bg border rounded-xl py-3.5 pl-12 pr-4 text-accent-white placeholder-muted text-sm font-medium hover:border-dark-border-light focus:border-accent-red transition-all duration-200 ${
                  passwordMismatch ? "border-red-500" : "border-input-border"
                }`}
              />
            </div>
            {passwordMismatch && (
              <p className="text-xs text-red-400 pl-1">Passwords do not match.</p>
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
            {isPending ? "Creating account…" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="hidden md:flex flex-col items-center gap-3 px-2 order-2">
          <div className="flex-1 w-px bg-linear-to-b from-transparent via-dark-border to-transparent" />
          <span className="text-muted text-xs font-semibold uppercase tracking-widest">or</span>
          <div className="flex-1 w-px bg-linear-to-b from-transparent via-dark-border to-transparent" />
        </div>

        {/* Column 2: OAuth */}
        <div className="flex-1 flex flex-col gap-4 order-3">
          <button
            type="button"
            className="flex items-center justify-center gap-3 w-full bg-dark-card/60 hover:bg-dark-elevated/80 border border-dark-border hover:border-dark-border-light text-accent-white font-semibold py-3.5 rounded-xl transition-all duration-200 text-sm group cursor-pointer"
          >
            <Chrome className="w-5 h-5 text-muted group-hover:text-accent-white transition-colors" />
            Sign up with Google
          </button>

          <button
            type="button"
            className="flex items-center justify-center gap-3 w-full bg-dark-card/60 hover:bg-dark-elevated/80 border border-dark-border hover:border-dark-border-light text-accent-white font-semibold py-3.5 rounded-xl transition-all duration-200 text-sm group cursor-pointer"
          >
            <Github className="w-5 h-5 text-muted group-hover:text-accent-white transition-colors" />
            Sign up with GitHub
          </button>
        </div>
      </div>

      <p className="text-center text-muted text-sm mt-8">
        Already have an account?{" "}
        <Link
          to="/auth/login"
          className="text-accent-red hover:text-rose-muted font-bold transition-colors duration-200"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
