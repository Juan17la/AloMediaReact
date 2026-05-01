import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import DashboardProjects from "../../components/dashboard/DashboardProjects";
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
    <div className="relative min-h-screen overflow-hidden bg-surface text-on-surface">
      {/* Light theme gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,58,237,0.08)_0%,transparent_55%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(99,14,212,0.06)_0%,transparent_55%)] dark:hidden" />
      {/* Dark theme gradient */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,rgba(167,139,250,0.15)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_80%_90%,rgba(206,189,255,0.08)_0%,transparent_55%)]" />

      {/* <DashboardSidebar
        onNewProject={() => navigate("/editor/new")}
        onScrollOngoing={() => ongoingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onScrollShared={() => sharedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onMobileMenu={() => setMobileMenuOpen(true)}
      /> */}

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 bg-on-surface/10 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="auth-glass-card absolute left-0 top-0 h-full w-72 border-r border-outline-variant p-4"
            style={{ borderRadius: 0 }}
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
                <h2 className="mt-1 text-base font-semibold text-on-surface">Menu</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface-variant"
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
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-3 text-left text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                New project
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  ongoingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-3 text-left text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Ongoing projects
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  sharedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-3 text-left text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Shared with me
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAccountOpen(true);
                }}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-3 text-left text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Account
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="relative z-10 px-8 pb-10 pt-16 lg:px-8 lg:pt-4">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center">
              <img src={AloMediaLogo} alt="alomedialogo" className="h-15 mr-3"/>
              <h2 className="text-2xl font-semibold text-on-surface sm:text-2xl">Dashboard</h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate("/editor/new")}
                className="flex h-9 px-2 gap-1 w-fit items-center justify-center rounded-sm border border-outline-variant bg-surface-container-lowest text-sm font-bold text-muted-foreground hover:text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
              <ThemeToggle />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen(prev => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-lowest text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors"
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
