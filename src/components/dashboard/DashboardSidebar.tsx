import type { LucideIcon } from "lucide-react";
import favicon from "/favicon.webp";
import { FolderKanban, Menu, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface DashboardSidebarProps {
  onNewProject: () => void;
  onScrollOngoing: () => void;
  onScrollShared: () => void;
  onMobileMenu?: () => void;
}

type SidebarActionKey = "onScrollShared" | "onScrollOngoing" | "onNewProject";

const ACTIONS: Array<{ icon: LucideIcon; labelKey: string; onKey: SidebarActionKey }> = [
  { icon: FolderKanban, labelKey: "sidebar.myProjects", onKey: "onScrollOngoing" },
  { icon: Users, labelKey: "sidebar.shared", onKey: "onScrollShared" },
  { icon: Plus, labelKey: "sidebar.newProject", onKey: "onNewProject" },
];

export default function DashboardSidebar({
  onNewProject,
  onScrollOngoing,
  onScrollShared,
  onMobileMenu,
}: DashboardSidebarProps) {
  const { t } = useTranslation("dashboard");
  const actionMap = {
    onNewProject,
    onScrollOngoing,
    onScrollShared,
    onMobileMenu,
  } as const;

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-16 border-r border-dark-border/80 bg-dark/85 backdrop-blur-2xl lg:flex">
        <div className="flex h-full w-full flex-col items-center py-4">
          <div className="mb-3 h-10 w-10 rounded-sm border border-dashed border-dark-border bg-dark-card p-1" aria-hidden="true">
            <img src={favicon} alt="icon" />
          </div>

          <div className="mt-2 flex flex-col items-center gap-2">
            {ACTIONS.map(({ icon: Icon, labelKey, onKey }) => (
              <button
                key={labelKey}
                type="button"
                title={t(labelKey)}
                onClick={actionMap[onKey]}
                className="flex h-10 w-10 items-center justify-center rounded-sm border border-dark-border bg-dark-card text-accent-white/65 transition-colors duration-200 hover:border-primary/40 hover:bg-dark-elevated hover:text-accent-white"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-dark-border/80 bg-dark/90 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <button
          type="button"
          onClick={onMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-sm border border-dark-border bg-dark-card text-sm font-bold text-accent-white"
          aria-label={t("common:aria.openMenu")}
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onScrollOngoing}
            className="flex h-9 items-center gap-2 rounded-sm border border-dark-border bg-dark-card px-3 text-xs font-semibold text-accent-white/75"
          >
            <Menu className="h-3.5 w-3.5" />
            {t("common:labels.projects")}
          </button>
          <button
            type="button"
            onClick={onNewProject}
            className="flex h-9 items-center gap-2 rounded-sm border border-primary/30 bg-primary/15 px-3 text-xs font-semibold text-accent-white"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("common:labels.new")}
          </button>
        </div>
      </div>
    </>
  );
}
