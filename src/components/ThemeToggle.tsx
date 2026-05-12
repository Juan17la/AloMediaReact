import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../context/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-0.5 bg-surface-container-lowest border border-outline-variant rounded-md p-0.5 shadow-xs h-8">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`h-7 w-7 rounded-sm flex items-center justify-center transition-colors cursor-pointer ${
          theme === "light"
            ? "bg-surface-container-high text-on-surface shadow-xs"
            : "text-muted-foreground hover:text-on-surface hover:bg-surface-container-low"
        }`}
        title="Light Mode"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`h-7 w-7 rounded-sm flex items-center justify-center transition-colors cursor-pointer ${
          theme === "system"
            ? "bg-surface-container-high text-on-surface shadow-xs"
            : "text-muted-foreground hover:text-on-surface hover:bg-surface-container-low"
        }`}
        title="System Theme"
      >
        <Monitor className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`h-7 w-7 rounded-sm flex items-center justify-center transition-colors cursor-pointer ${
          theme === "dark"
            ? "bg-surface-container-high text-on-surface shadow-xs"
            : "text-muted-foreground hover:text-on-surface hover:bg-surface-container-low"
        }`}
        title="Dark Mode"
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
