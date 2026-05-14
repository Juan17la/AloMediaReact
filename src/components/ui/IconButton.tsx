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
  md: "h-9 w-9",
  lg: "h-10 w-10",
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
      ? "bg-primary text-primary-foreground hover:brightness-110"
      : variant === "danger"
        ? "text-muted-foreground hover:bg-error-container hover:text-error"
        : active
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-on-surface hover:bg-surface-container"

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        "editor-transition inline-flex items-center justify-center shrink-0 rounded-lg cursor-pointer",
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
