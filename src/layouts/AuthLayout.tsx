import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen w-full font-sans flex items-center justify-center overflow-hidden">
      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-dark via-burgundy-deep to-dark" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(122,26,26,0.25)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(45,10,20,0.4)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-noise" />

      {/* Floating orbs for depth */}
      <div className="absolute top-[-10%] left-[-5%] w-125 h-125 rounded-full bg-blood-red/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-100 h-100 rounded-full bg-burgundy/15 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-4xl px-5 py-8 sm:px-8 animate-fade-in">
        <Outlet />
      </div>
    </div>
  );
}
