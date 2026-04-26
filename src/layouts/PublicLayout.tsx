import { Outlet } from "react-router";

export default function PublicLayout() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-dark text-accent-white">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(212,80,90,0.10)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(245,229,235,0.72)_0%,transparent_55%)]" />

      <main className="relative z-10 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
