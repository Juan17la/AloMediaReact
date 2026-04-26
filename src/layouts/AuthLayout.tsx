import { Outlet } from "react-router";
import { ThemeToggle } from "../components/ThemeToggle";
export default function AuthLayout() {
  return (
    <div className="relative min-h-screen w-full font-sans flex items-center justify-center overflow-hidden bg-background transition-colors duration-200">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Offset radial gradient — origin top-left */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(122,26,26,0.18)_0%,transparent_55%)]" />
      {/* Deep burgundy tint — origin bottom-right */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(45,10,20,0.3)_0%,transparent_55%)]" />

      {/* Atmospheric accent glow — upper-right edge */}
      <div className="absolute -top-[15%] -right-[10%] w-125 h-125 rounded-full bg-blood-red/9 blur-[120px] pointer-events-none" />
      {/* Secondary glow — lower-left edge */}
      <div className="absolute -bottom-[10%] -left-[8%] w-100 h-100 rounded-full bg-burgundy/12 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-4xl px-5 py-8 sm:px-8 animate-fade-in">
        <Outlet />
      </div>
    </div>
  );
}
