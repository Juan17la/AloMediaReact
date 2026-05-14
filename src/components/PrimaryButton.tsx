import { Plus } from "lucide-react";

type ButtonSize = "sm" | "md" | "lg";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  size?: ButtonSize;
  className?: string;
}

// Record<ButtonSize, string>: lookup map that associates each ButtonSize key
// ("sm" | "md" | "lg") with its corresponding Tailwind padding/text classes.
// Used at render time as sizeStyles[size] to select the correct class string
// without any conditional branch or loop — O(1) key access.
const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-9 px-4.5 text-sm",
  lg: "h-10 px-6 text-sm",
};

export default function PrimaryButton({
  children,
  onClick,
  icon: Icon,
  size = "md",
  className = "",
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:scale-[0.97] text-primary-foreground font-semibold rounded-lg transition-all duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export { Plus };
