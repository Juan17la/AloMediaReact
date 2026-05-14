/**
 * Reusable geometric background pattern with configurable opacity and blur.
 * Replaces artificial radial-gradient purple glows with a subtle, professional
 * dot/cross grid pattern that works in both light and dark modes.
 */
interface GeometricBackgroundProps {
  /** Base opacity of the pattern. Default: 0.03 (3%) in light, 0.05 (5%) in dark */
  opacity?: number
  /** CSS blur applied to the pattern. Default: 0.5px */
  blur?: string
  /** Additional Tailwind classes */
  className?: string
}

export function GeometricBackground({
  opacity = 0.03,
  blur = "0.5px",
  className = "",
}: GeometricBackgroundProps) {
  const svg =
    "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `url("${svg}")`,
        opacity,
        filter: `blur(${blur})`,
      }}
      aria-hidden="true"
    />
  )
}
