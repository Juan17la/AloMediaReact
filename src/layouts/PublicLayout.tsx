import { Outlet } from "react-router";
import Footer from "../components/common/Footer";

export default function PublicLayout() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#080a0d] text-white">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(122,26,26,0.18)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(45,10,20,0.26)_0%,transparent_55%)]" />

      <main className="relative z-10 flex-1">
        <Outlet />
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
