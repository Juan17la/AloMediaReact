import { useNavigate } from "react-router";
import { Plus, User, Home } from "lucide-react";

interface NavLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { icon: Home, label: "Home", href: "#", active: true },
];

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="relative z-10 border-b border-dark-border/50">
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
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    link.active
                      ? "font-semibold text-accent-white bg-glass hover:bg-glass-hover"
                      : "font-medium text-muted hover:text-accent-white hover:bg-glass"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right: User avatar + New */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/editor/new")}
              className="flex items-center gap-2 bg-linear-to-r from-blood-red to-crimson hover:from-blood-red-light hover:to-blood-red-glow text-accent-white font-semibold text-sm py-2 px-4 rounded-xl transition-all duration-300 shadow-md shadow-blood-red/20 hover:shadow-blood-red/35 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </button>

            <div className="w-9 h-9 rounded-full bg-dark-elevated border border-dark-border flex items-center justify-center cursor-pointer hover:border-dark-border-light transition-colors">
              <User className="w-4 h-4 text-muted" />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
