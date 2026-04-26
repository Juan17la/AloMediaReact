import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../context/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-1 shadow-xs">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
          theme === "light"
            ? "bg-surface-container-high text-on-surface shadow-xs"
            : "text-muted-foreground hover:text-on-surface hover:bg-surface-container-low"
        }`}
        title="Light Mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
          theme === "system"
            ? "bg-surface-container-high text-on-surface shadow-xs"
            : "text-muted-foreground hover:text-on-surface hover:bg-surface-container-low"
        }`}
        title="System Theme"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
          theme === "dark"
            ? "bg-surface-container-high text-on-surface shadow-xs"
            : "text-muted-foreground hover:text-on-surface hover:bg-surface-container-low"
        }`}
        title="Dark Mode"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
