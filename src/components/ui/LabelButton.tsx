import type React from "react"
import { Loader2 } from "lucide-react"

interface LabelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
  /** Replaces the icon with a spinner and disables the button */
  loading?: boolean
}

const BTN_SIZE = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-8 px-4 text-sm gap-2",
  lg: "h-9 px-5 text-sm gap-2",
} as const

const ICON_SIZE = {
  sm: "[&>svg]:w-3.5 [&>svg]:h-3.5",
  md: "[&>svg]:w-4 [&>svg]:h-4",
  lg: "[&>svg]:w-4 [&>svg]:h-4",
} as const

const VARIANT = {
  primary:
    "bg-accent-red text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:brightness-86",
  secondary:
    "border border-white/10 bg-white/5 text-white/80 backdrop-blur-sm hover:bg-white/9 hover:border-white/18",
  ghost: "text-white/55 hover:bg-white/7 hover:text-white/90",
} as const

export function LabelButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: LabelButtonProps) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      className={[
        "editor-transition inline-flex items-center font-semibold rounded-lg cursor-pointer",
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        BTN_SIZE[size],
        VARIANT[variant],
        className,
      ].join(" ")}
      {...props}
    >
      <span className={`flex items-center shrink-0 ${ICON_SIZE[size]}`}>
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : icon}
      </span>
      {label}
    </button>
  )
}
