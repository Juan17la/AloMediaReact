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
  sm: "py-2 px-4 text-sm",
  md: "py-2.5 px-5 text-sm",
  lg: "py-3 px-7 text-sm",
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
      className={`inline-flex items-center gap-2 bg-linear-to-r from-blood-red to-crimson hover:from-blood-red-light hover:to-blood-red-glow text-accent-white font-semibold rounded-xl transition-all duration-300 shadow-md shadow-blood-red/20 hover:shadow-blood-red/35 cursor-pointer ${sizeStyles[size]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export { Plus };
