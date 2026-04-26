import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Shield, Users, FolderOpen, Sparkles, Pencil, Download, Share2, ArrowLeft, FileDown, AlertCircle } from "lucide-react";
import Cookies from "js-cookie";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import StatsCard from "../../components/admin/StatsCard";

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalProjectsCreated: number;
  totalProjectsEdited: number;
  totalProjectsExported: number;
  totalProjectsShared: number;
  generatedAt: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = Cookies.get("token");
        const response = await fetch(
          `${import.meta.env.VITE_BASE_URL}/admin/reports?format=JSON`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!response.ok) throw new Error(t("admin.loadError"));
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("admin.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [t]);

  const handleDownloadCSV = async () => {
    try {
      const token = Cookies.get("token");
      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/admin/reports?format=CSV`,
        {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) throw new Error(t("admin.downloadError"));
      const csv = await response.text();

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert(t("admin.downloadError"));
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-dark text-accent-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(212,80,90,0.10)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(245,229,235,0.72)_0%,transparent_55%)]" />

      <main className="relative z-10 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-5">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mb-2 flex items-center gap-1.5 text-xs text-muted transition-colors duration-150 hover:text-accent-white/70"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <PageHeader
            title={t("admin.title")}
            subtitle={t("admin.subtitle")}
            icon={<Shield className="h-5 w-5 text-blood-red" />}
          />

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-6 w-6 border-2 border-dark-border border-t-accent-red rounded-full" style={{ animation: "spin 0.8s linear infinite" }} />
              <p className="mt-3 text-sm text-muted">{t("common:states.loading")}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 py-8 animate-error-slide">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {stats && (
            <>
              <SectionCard
                title={t("admin.statistics")}
                action={
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-card px-3 py-1.5 text-xs font-semibold text-accent-white/70 hover:bg-dark-elevated transition-colors duration-150"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    {t("admin.downloadCSV")}
                  </button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatsCard
                    label={t("admin.totalUsers")}
                    value={stats.totalUsers}
                    icon={<Users className="w-5 h-5" />}
                  />
                  <StatsCard
                    label={t("admin.totalProjects")}
                    value={stats.totalProjects}
                    icon={<FolderOpen className="w-5 h-5" />}
                  />
                  <StatsCard
                    label={t("admin.projectsCreated")}
                    value={stats.totalProjectsCreated}
                    icon={<Sparkles className="w-5 h-5" />}
                  />
                  <StatsCard
                    label={t("admin.projectsEdited")}
                    value={stats.totalProjectsEdited}
                    icon={<Pencil className="w-5 h-5" />}
                  />
                  <StatsCard
                    label={t("admin.projectsExported")}
                    value={stats.totalProjectsExported}
                    icon={<Download className="w-5 h-5" />}
                  />
                  <StatsCard
                    label={t("admin.projectsShared")}
                    value={stats.totalProjectsShared}
                    icon={<Share2 className="w-5 h-5" />}
                  />
                </div>

                <p className="mt-4 text-xs text-muted-light">
                  {t("admin.generatedAt")}: {new Date(stats.generatedAt).toLocaleString()}
                </p>
              </SectionCard>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
