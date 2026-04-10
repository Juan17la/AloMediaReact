import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Sparkles } from "lucide-react";
import DashboardProjects from "../../components/dashboard/DashboardProjects";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import UserMenuModal from "../../components/UserMenuModal";
import { useAuth } from "../../hooks/useAuth";
import { useProjectListStore } from "../../store/projectListStore";
import type { ApiProject } from "../../types/projectApiTypes";
import AloMediaLogo from "../../assets/AloMediaLogo.webp";

const EMPTY_PROJECTS: ApiProject[] = [];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ongoingSectionRef = useRef<HTMLDivElement>(null);
  const sharedSectionRef = useRef<HTMLDivElement>(null);

  const ownProjects = useProjectListStore(s => s.ownCache[0]?.content ?? EMPTY_PROJECTS);
  const sharedProjects = useProjectListStore(s => s.sharedCache[0]?.content ?? EMPTY_PROJECTS);
  const ownLoading = useProjectListStore(s => s.isLoadingOwn);
  const sharedLoading = useProjectListStore(s => s.isLoadingShared);
  const ownError = useProjectListStore(s => s.ownError);
  const sharedError = useProjectListStore(s => s.sharedError);

  useEffect(() => {
    const { setUserScope, fetchOwn, fetchShared } = useProjectListStore.getState();
    setUserScope(user?.id ?? null);
    if (!user?.id) return;
    fetchOwn(0);
    fetchShared(0);
  }, [user?.id]);

  const userInitials = useMemo(() => {
    if (!user) return "AL";
    return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "AL";
  }, [user]);

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  function refreshProjects() {
    const { setUserScope, fetchOwn, fetchShared } = useProjectListStore.getState();
    setUserScope(user?.id ?? null);
    if (!user?.id) return;
    fetchOwn(0);
    fetchShared(0);
  }

  function handleOpenProject(id: number) {
    navigate(`/editor/${id}`);
  }

  function handleAdminDashboard() {
    setAccountOpen(false);
    navigate("/admin");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080a0d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(122,26,26,0.18)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(45,10,20,0.26)_0%,transparent_55%)]" />

      <DashboardSidebar
        onNewProject={() => navigate("/editor/new")}
        onScrollOngoing={() => ongoingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onScrollShared={() => sharedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onMobileMenu={() => setMobileMenuOpen(true)}
      />

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="auth-glass-card absolute left-0 top-0 h-full w-72 border-r border-white/10 p-4"
            style={{ borderRadius: 0 }}
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Dashboard</p>
                <h2 className="mt-1 text-base font-semibold text-white/90">Menu</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/editor/new");
                }}
                className="w-full rounded-sm border border-white/8 bg-white/5 px-3 py-3 text-left text-sm text-white/85"
              >
                New project
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  ongoingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full rounded-sm border border-white/8 bg-white/5 px-3 py-3 text-left text-sm text-white/85"
              >
                Ongoing projects
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  sharedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full rounded-sm border border-white/8 bg-white/5 px-3 py-3 text-left text-sm text-white/85"
              >
                Shared with me
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAccountOpen(true);
                }}
                className="w-full rounded-sm border border-white/8 bg-white/5 px-3 py-3 text-left text-sm text-white/85"
              >
                Account
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="relative z-10 px-4 pb-10 pt-16 lg:pl-16 lg:pr-6 lg:pt-4">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex items-center justify-between border-b border-white/8 pb-3">
            <div className="flex items-center">
              <img src={AloMediaLogo} alt="alomedialogo" className="h-15 mr-3"/>
              <h2 className="text-2xl font-semibold text-white/90 sm:text-2xl">Dashboard</h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen(prev => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 bg-white/5 text-sm font-bold text-white"
                  aria-label="Open account menu"
                >
                  {userInitials}
                </button>

                <UserMenuModal
                  isOpen={accountOpen}
                  user={user}
                  onClose={() => setAccountOpen(false)}
                  onLogout={handleLogout}
                  onAdminDashboard={handleAdminDashboard}
                />
              </div>
            </div>
          </header>

          <section className="auth-glass-card rounded-md px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-center gap-2 text-accent-red">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Create faster</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-gradient-red sm:text-3xl">
              Simply edit your videos and export with confidence.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Start a new project in one click and continue your ongoing work from the lists below.
            </p>

            <button
              type="button"
              onClick={() => navigate("/editor/new")}
              className="auth-btn-primary mt-5 inline-flex items-center gap-2 rounded-md bg-linear-to-r from-blood-red to-crimson px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </section>

          <DashboardProjects
            ownProjects={ownProjects}
            sharedProjects={sharedProjects}
            ownLoading={ownLoading}
            sharedLoading={sharedLoading}
            ownError={ownError}
            sharedError={sharedError}
            onOpenProject={handleOpenProject}
            onRefresh={refreshProjects}
            userId={user?.id}
            ongoingRef={ongoingSectionRef}
            sharedRef={sharedSectionRef}
          />
        </div>
      </main>

    </div>
  );
}
