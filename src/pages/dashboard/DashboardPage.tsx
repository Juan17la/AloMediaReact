import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import DashboardProjects from "../../components/dashboard/DashboardProjects";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import UserMenuModal from "../../components/UserMenuModal";
import { useAuth } from "../../hooks/useAuth";
import { useProjectListStore } from "../../store/projectListStore";
import type { ApiProject } from "../../types/projectApiTypes";
import AloMediaLogo from "../../assets/AloMediaLogo.webp";
import { Plus } from "lucide-react";
import { ThemeToggle } from "../../components/ThemeToggle";

const EMPTY_PROJECTS: ApiProject[] = [];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ongoingSectionRef = useRef<HTMLDivElement>(null);
  const sharedSectionRef = useRef<HTMLDivElement>(null);

  const ownProjects = useProjectListStore(s => s.ownData[0]?.content ?? EMPTY_PROJECTS);
  const sharedProjects = useProjectListStore(s => s.sharedData[0]?.content ?? EMPTY_PROJECTS);
  const ownLoading = useProjectListStore(s => s.isLoadingOwn);
  const sharedLoading = useProjectListStore(s => s.isLoadingShared);
  const ownError = useProjectListStore(s => s.ownError);
  const sharedError = useProjectListStore(s => s.sharedError);

  useEffect(() => {
    if (!user?.id) return;
    const { fetchOwn, fetchShared } = useProjectListStore.getState();
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
    if (!user?.id) return;
    const { fetchOwn, fetchShared } = useProjectListStore.getState();
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
    <div className="relative min-h-screen overflow-hidden bg-dark text-accent-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(212,80,90,0.12)_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_20%_10%,rgba(184,50,69,0.22)_0%,transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(245,229,235,0.72)_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_80%_90%,rgba(128,28,40,0.18)_0%,transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-100 bg-[radial-gradient(ellipse_at_50%_110%,rgba(63,11,20,0.36)_0%,transparent_66%)]" />

      {/* <DashboardSidebar
        onNewProject={() => navigate("/editor/new")}
        onScrollOngoing={() => ongoingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onScrollShared={() => sharedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onMobileMenu={() => setMobileMenuOpen(true)}
      /> */}

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 bg-[rgba(26,26,31,0.10)] lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="auth-glass-card absolute left-0 top-0 h-full w-72 border-r border-dark-border p-4"
            style={{ borderRadius: 0 }}
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-dark-border pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Dashboard</p>
                <h2 className="mt-1 text-base font-semibold text-accent-white">Menu</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-sm border border-dark-border bg-dark-card px-3 py-2 text-xs text-accent-white/70"
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
                className="w-full rounded-sm border border-dark-border bg-dark-card px-3 py-3 text-left text-sm text-accent-white/85"
              >
                New project
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  ongoingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full rounded-sm border border-dark-border bg-dark-card px-3 py-3 text-left text-sm text-accent-white/85"
              >
                Ongoing projects
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  sharedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full rounded-sm border border-dark-border bg-dark-card px-3 py-3 text-left text-sm text-accent-white/85"
              >
                Shared with me
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAccountOpen(true);
                }}
                className="w-full rounded-sm border border-dark-border bg-dark-card px-3 py-3 text-left text-sm text-accent-white/85"
              >
                Account
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="relative z-10 px-8 pb-10 pt-16 lg:px-8 lg:pt-4">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex items-center justify-between border-b border-dark-border pb-3">
            <div className="flex items-center">
              <img src={AloMediaLogo} alt="alomedialogo" className="h-15 mr-3"/>
              <h2 className="text-2xl font-semibold text-accent-white sm:text-2xl">Dashboard</h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate("/editor/new")}
                className="flex h-9 px-2 gap-1 w-fit items-center justify-center rounded-sm border border-dark-border bg-dark-card text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
              <ThemeToggle />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen(prev => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-dark-border bg-dark-card text-sm font-bold text-accent-white"
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
