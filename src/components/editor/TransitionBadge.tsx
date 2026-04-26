import type { ClipTransition } from "../../project/projectTypes"

interface TransitionBadgeProps {
    clipId: string
    transition: ClipTransition
    left: number
    position: "in" | "out"
    isSelected: boolean
    onSelect: (clipId: string) => void
}

const badgeBase = [
    "absolute top-1/2 z-6 -translate-x-1/2 -translate-y-1/2",
    "h-5 min-w-7 px-2 rounded-md border text-[10px] font-semibold uppercase tracking-[0.05em]",
    "backdrop-blur-sm cursor-pointer select-none",
    "transition-[background-color,border-color,color,box-shadow] duration-100",
].join(" ")

const badgeSelected =
    "bg-[rgba(180,20,20,0.34)] border-[rgba(230,56,56,0.85)] text-accent-white shadow-[0_0_0_2px_rgba(180,20,20,0.36)]"

const badgeUnselected =
    "bg-black/45 border-dark/16 text-accent-white/78 hover:bg-dark/12 hover:border-dark/26 hover:text-accent-white"

export function TransitionBadge({ clipId, transition, left, position, isSelected, onSelect }: TransitionBadgeProps) {
    const posLabel = position === "in" ? "in" : "out"
    const hoverLabel = `${posLabel} • ${transition.type} • ${transition.duration.toFixed(2)}s`

    return (
        <button
            type="button"
            title={hoverLabel}
            aria-label={`Edit transition ${hoverLabel}`}
            className={`${badgeBase} ${isSelected ? badgeSelected : badgeUnselected}`}
            style={{ left }}
            onClick={(e) => {
                e.stopPropagation()
                onSelect(clipId)
            }}
        >
            <span>{transition.type}</span>
        </button>
    )
}
