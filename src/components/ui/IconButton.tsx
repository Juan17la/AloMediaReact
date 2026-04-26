import type React from "react"

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  /** ghost (default) = transparent bg; solid = filled accent; danger = red on hover */
  variant?: "ghost" | "solid" | "danger"
  size?: "sm" | "md" | "lg"
  /** Toggled-on state — renders with accent color background */
  active?: boolean
}

const BTN_SIZE = {
  sm: "w-8 h-8",
  md: "w-9 h-9",
  lg: "w-10 h-10",
} as const

const ICON_SIZE = {
  sm: "[&>svg]:w-4 [&>svg]:h-4",
  md: "[&>svg]:w-[18px] [&>svg]:h-[18px]",
  lg: "[&>svg]:w-5 [&>svg]:h-5",
} as const

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  active = false,
  className = "",
  ...props
}: IconButtonProps) {
  const variantCls =
    variant === "solid"
      ? "bg-accent-red text-accent-white hover:brightness-110"
      : variant === "danger"
        ? "text-muted hover:bg-red-500/10 hover:text-red-500"
        : active
          ? "text-accent-red bg-[rgba(212,80,90,0.12)]"
          : "text-muted hover:text-accent-white hover:bg-dark-card"

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        "editor-transition inline-flex items-center justify-center shrink-0 rounded-md cursor-pointer",
        "active:scale-[0.93] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        BTN_SIZE[size],
        ICON_SIZE[size],
        variantCls,
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
    </button>
  )
}
