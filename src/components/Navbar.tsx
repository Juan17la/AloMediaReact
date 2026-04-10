import { useNavigate } from "react-router";
import { Plus, User, Home } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import UserMenuModal from "./UserMenuModal";
import { useAuth } from "../hooks/useAuth";

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
    <header className="relative z-20 border-b border-dark-border/50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <nav className="h-16 flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blood-red to-crimson flex items-center justify-center shadow-md shadow-blood-red/20">
                <span className="text-accent-white font-bold text-sm">A</span>
              </div>
              <span className="text-accent-white font-bold text-lg tracking-wide hidden sm:block">
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
                      ? "font-semibold text-accent-white bg-glass hover:bg-glass-hover"
                      : "font-medium text-muted hover:text-accent-white hover:bg-glass"
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
            <button
              type="button"
              onClick={() => navigate("/editor/new")}
              className="flex items-center gap-2 bg-linear-to-r from-blood-red to-crimson hover:brightness-[0.85] active:scale-[0.97] active:brightness-[0.78] text-accent-white font-semibold text-sm py-2 px-4 rounded-xl transition-all duration-120 ease-out shadow-md shadow-blood-red/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nav.newProject")}</span>
            </button>

            <div className="relative">
              <div
                id="user-action-card-button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-dark-elevated border border-dark-border flex items-center justify-center cursor-pointer hover:border-dark-border-light transition-colors"
              >
                <User className="w-4 h-4 text-muted" />
              </div>

              <UserMenuModal
                isOpen={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
                onLogout={handleLogout}
                user={user}
              />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
