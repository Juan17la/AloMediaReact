import { Outlet, Link } from "react-router";
import { ThemeToggle } from "../components/ThemeToggle";
import { Home } from "lucide-react";
export default function AuthLayout() {
  return (
    <div className="relative min-h-screen w-full font-sans flex items-center justify-center overflow-hidden bg-surface text-on-surface transition-colors duration-200">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <ThemeToggle />
      </div>
      {/* Discreet home button */}
      <Link
        to="/"
        className="absolute top-4 left-4 sm:left-6 z-50 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-on-surface transition-colors duration-150 opacity-60 hover:opacity-100"
      >
        <Home size={14} />
        <span>Home</span>
      </Link>
      {/* Light theme gradient - hidden in dark */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Dark theme gradient - hidden in light */}
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.15)_0%,transparent_55%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />

      {/* Atmospheric accent glow — upper-right edge */}
      <div className="absolute -top-[15%] -right-[10%] w-125 h-125 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      {/* Secondary glow — lower-left edge */}
      <div className="absolute -bottom-[10%] -left-[8%] w-100 h-100 rounded-full bg-secondary/15 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-4xl px-5 py-8 sm:px-8 animate-fade-in">
        <Outlet />
      </div>
    </div>
  );
}
