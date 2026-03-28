import { useNavigate } from "react-router";
import { Plus, Film, Search, ChevronRight, Clock, Users, Sparkles } from "lucide-react";
import Navbar from "../../components/Navbar";
import PrimaryButton from "../../components/PrimaryButton";
import ActionCard from "../../components/ActionCard";
import { OwnProjectsList } from "../../components/projects/OwnProjectsList";
import { SharedProjectsList } from "../../components/projects/SharedProjectsList";

const QUICK_ACTIONS = [
  { icon: Film, label: "Import Media", desc: "Upload video, audio or images" },
  { icon: Sparkles, label: "Templates", desc: "Start from a pre-made template" },
  { icon: Search, label: "Browse Stock", desc: "Find royalty-free assets" },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background layers */}
      <div className="fixed inset-0 bg-dark" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(122,26,26,0.12)_0%,transparent_60%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(45,10,20,0.15)_0%,transparent_50%)]" />
      {/* Atmospheric accent glow — upper-right edge */}
      <div className="fixed -top-[10%] -right-[5%] w-[520px] h-[520px] rounded-full bg-blood-red/[0.08] blur-[120px] pointer-events-none" />
      {/* Secondary glow — lower-left edge */}
      <div className="fixed -bottom-[8%] -left-[5%] w-[420px] h-[420px] rounded-full bg-burgundy/[0.10] blur-[100px] pointer-events-none" />

      <Navbar />

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 space-y-10">

          {/* Hero / Create Section */}
          <section className="animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-burgundy-deep via-blood-red/40 to-dark-surface border border-dark-border/50 p-8 sm:p-12 z-10">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blood-red/15 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-burgundy/20 blur-[80px] pointer-events-none" />

              <div className="relative flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent-red" />
                    <span className="text-accent-red text-sm font-semibold uppercase tracking-widest">
                      Create
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-accent-white leading-tight">
                    Start Your Next
                    <br />
                    <span className="text-gradient-red">Masterpiece</span>
                  </h2>
                  <p className="text-muted-light text-sm leading-relaxed max-w-md">
                    Import your footage, apply effects, and export stunning videos — all from your browser.
                  </p>
                  <PrimaryButton
                    icon={Plus}
                    size="lg"
                    onClick={() => navigate("/editor/new")}
                    className="shadow-lg shadow-blood-red/25 active:scale-[0.99]"
                  >
                    New Project
                  </PrimaryButton>
                </div>

                {/* Decorative card */}
                <div className="hidden md:flex items-center justify-center w-64 h-44">
                  <div className="w-full h-full bg-dark-card/60 border border-glass-border rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                    <div className="w-14 h-14 rounded-2xl bg-dark-elevated/80 flex items-center justify-center">
                      <Film className="w-7 h-7 text-blood-red" />
                    </div>
                    <span className="text-muted text-xs font-medium">Drag & drop or click to start</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* My Projects */}
          <section className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-accent-red" />
                <h2 className="text-xl font-bold text-accent-white tracking-wide">
                  My Projects
                </h2>
              </div>
              <a
                href="#"
                className="flex items-center gap-1 text-muted hover:text-accent-white text-sm font-medium transition-colors duration-200 group"
              >
                View All
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
            <OwnProjectsList />
          </section>

          {/* Shared With Me */}
          <section className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-accent-red" />
              <h2 className="text-xl font-bold text-accent-white tracking-wide">
                Shared With Me
              </h2>
            </div>
            <SharedProjectsList />
          </section>

          {/* Quick Actions */}
          <section className="animate-slide-up pb-8" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-xl font-bold text-accent-white tracking-wide mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {QUICK_ACTIONS.map((action) => (
                <ActionCard
                  key={action.label}
                  icon={action.icon}
                  label={action.label}
                  description={action.desc}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
