import { useMemo, type Ref } from "react";
import { ArrowRight, Film, RefreshCw, CalendarDays, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ApiProject } from "../../types/projectApiTypes";

interface DashboardProjectsProps {
  ownProjects: ApiProject[];
  sharedProjects: ApiProject[];
  ownLoading: boolean;
  sharedLoading: boolean;
  ownError: string | null;
  sharedError: string | null;
  onOpenProject: (id: number) => void;
  onRefresh: () => void;
  userId?: number;
  ongoingRef?: Ref<HTMLDivElement>;
  sharedRef?: Ref<HTMLDivElement>;
}

const CARD_TONES = [
  "from-primary/30 via-surface-container to-surface-container-high",
  "from-surface-container-high via-secondary/40 to-surface-container",
  "from-tertiary/30 via-surface-container to-surface-container-high",
];

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function progressFromProject(project: ApiProject, index: number): string {
  const seed = project.id * 29 + index * 11 + project.updatedAt.length;
  const value = 18 + (seed % 68);
  return `${Math.min(value, 92)}%`;
}

function ProjectStripCard({
  project,
  index,
  onOpenProject,
}: {
  project: ApiProject;
  index: number;
  onOpenProject: (id: number) => void;
}) {
  const { t, i18n } = useTranslation("dashboard");
  const tone = CARD_TONES[index % CARD_TONES.length];

  const diff = Date.now() - new Date(project.updatedAt).getTime();
  const days = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  const relative = days === 0 ? t("time.updatedToday") : t("time.updatedDaysAgo", { count: days });

  return (
    <button
      type="button"
      onClick={() => onOpenProject(project.id)}
      className="group flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest text-left transition-colors duration-200 hover:border-primary/50 hover:bg-surface-container-low sm:w-72 lg:w-80"
    >
      <div className="relative aspect-16/10 overflow-hidden border-b border-outline-variant bg-surface-container">
        <div className={["absolute inset-0 bg-linear-to-br opacity-60", tone].join(" ")} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high/80 text-on-surface shadow-lg transition-transform duration-200 group-hover:scale-105">
            <Play className="ml-0.5 h-5 w-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-container-high/90 to-transparent p-3">
          <p className="truncate text-sm font-semibold text-on-surface">{project.name}</p>
          <p className="mt-1 text-[11px] text-on-surface/70">{relative}</p>
        </div>
      </div>

      <div className="space-y-2 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-on-surface">{project.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>{formatDate(project.updatedAt, i18n.language)}</span>
        </div>
      </div>
    </button>
  );
}

function SharedRow({
  project,
  index,
  onOpenProject,
  userId,
}: {
  project: ApiProject;
  index: number;
  onOpenProject: (id: number) => void;
  userId?: number;
}) {
  const { t, i18n } = useTranslation("dashboard");
  const progress = progressFromProject(project, index);
  const owner = userId != null && project.ownerId === userId
    ? t("projects.ownerYou")
    : t("projects.ownerOther", { id: project.ownerId });
  const tone = CARD_TONES[(index + 1) % CARD_TONES.length];

  return (
    <button
      type="button"
      onClick={() => onOpenProject(project.id)}
      className="group flex w-full items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 text-left transition-colors duration-200 hover:border-primary/50 hover:bg-surface-container-low"
    >
      <div className={["h-12 w-18 shrink-0 rounded border border-outline-variant bg-linear-to-br bg-surface-container", tone].join(" ")}>
        <div className="flex h-full items-center justify-center">
          <Film className="h-4.5 w-4.5 text-on-surface" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface">{project.name}</p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-on-surface-variant md:flex">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(project.updatedAt, i18n.language)}
          </div>
        </div>
        <div className="mt-2 h-0.5 overflow-hidden bg-surface-container"></div>
      </div>

      <ArrowRight className="h-4 w-4 text-on-surface-variant" />
    </button>
  );
}

export default function DashboardProjects({
  ownProjects,
  sharedProjects,
  ownLoading,
  sharedLoading,
  ownError,
  sharedError,
  onOpenProject,
  onRefresh,
  userId,
  ongoingRef,
  sharedRef,
}: DashboardProjectsProps) {
  const { t } = useTranslation("dashboard");
  const ownSkeletons = useMemo(() => Array.from({ length: 3 }), []);
  const sharedSkeletons = useMemo(() => Array.from({ length: 3 }), []);

  return (
    <div className="space-y-8">
      <section ref={ongoingRef} className="space-y-3">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant pb-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t("projects.ongoingLabel")}</p>
            <h2 className="mt-1 text-lg font-semibold text-on-surface">{t("projects.continueWorking")}</h2>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface transition-colors duration-200 hover:border-primary/50 hover:bg-surface-container-low"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("common:actions.refresh")}
          </button>
        </div>

        {ownLoading && ownProjects.length === 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {ownSkeletons.map((_, index) => (
              <div key={index} className="w-64 shrink-0 rounded-lg border border-outline-variant bg-surface-container-lowest sm:w-72 lg:w-80">
                <div className="aspect-16/10 bg-surface-container" />
                <div className="space-y-2 px-3 py-3">
                  <div className="h-3 w-2/3 bg-surface-container-high" />
                  <div className="h-1 bg-surface-container-high" />
                  <div className="h-2 w-1/3 bg-surface-container-high" />
                </div>
              </div>
            ))}
          </div>
        ) : ownError && ownProjects.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm text-error">{ownError}</p>
        ) : ownProjects.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">{t("projects.noOngoing")}</p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 pr-1">
              {ownProjects.map((project, index) => (
                <ProjectStripCard key={project.id} project={project} index={index} onOpenProject={onOpenProject} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section ref={sharedRef} className="space-y-3">
        <div className="border-b border-outline-variant pb-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t("projects.sharedLabel")}</p>
          <h2 className="mt-1 text-lg font-semibold text-on-surface">{t("projects.collaborativeWork")}</h2>
        </div>

        {sharedLoading && sharedProjects.length === 0 ? (
          <div className="space-y-2">
            {sharedSkeletons.map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3">
                <div className="h-12 w-18 bg-surface-container" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-1/2 bg-surface-container-high" />
                  <div className="h-1 bg-surface-container-high" />
                </div>
              </div>
            ))}
          </div>
        ) : sharedError && sharedProjects.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm text-error">{sharedError}</p>
        ) : sharedProjects.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">{t("projects.noShared")}</p>
        ) : (
          <div className="space-y-2">
            {sharedProjects.map((project, index) => (
              <SharedRow key={project.id} project={project} index={index} onOpenProject={onOpenProject} userId={userId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
