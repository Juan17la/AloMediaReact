import { useNavigate } from "react-router";
import { Plus, User, Home } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import UserMenuModal from "./UserMenuModal";
import { useAuth } from "../hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";

interface NavLink {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  href: string;
  active?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { icon: Home, labelKey: "nav.home", href: "#", active: true },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  return (
    <header className="relative z-20 border-b border-outline-variant/50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <nav className="h-16 flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <img src="/favicon.webp" alt="AloMedia" className="w-9 h-9 rounded-xl shadow-md shadow-primary/20" />
              <span className="text-on-surface font-bold text-lg tracking-wide hidden sm:block font-display">
                AloMedia
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.labelKey}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    link.active
                      ? "font-semibold text-on-surface bg-surface-container-lowest hover:bg-surface-container-low"
                      : "font-medium text-muted-foreground hover:text-on-surface hover:bg-surface-container-lowest"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {t(link.labelKey)}
                </a>
              ))}
            </div>
          </div>

          {/* Right: User avatar + New */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate("/editor/new")}
              className="flex items-center gap-2 bg-linear-to-r from-primary to-primary-container hover:brightness-[0.95] active:scale-[0.97] active:brightness-[0.9] text-primary-foreground font-semibold text-sm py-2 px-4 rounded-xl transition-all duration-150 ease-out shadow-md shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nav.newProject")}</span>
            </button>

            <div className="relative">
              <div
                id="user-action-card-button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center cursor-pointer hover:border-outline hover:bg-surface-container-low transition-colors"
              >
                <User className="w-4 h-4 text-muted-foreground" />
              </div>

              <UserMenuModal
                isOpen={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
                onLogout={handleLogout}
                user={user}
                onAdminDashboard={user?.role === "ADMIN" ? () => { setUserMenuOpen(false); navigate("/admin"); } : undefined}
              />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
