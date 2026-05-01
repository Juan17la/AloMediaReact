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
    "cursor-pointer select-none",
    "transition-[background-color,border-color,color,box-shadow] duration-100",
].join(" ")

const badgeSelected =
    "bg-primary/85 border-primary text-on-primary shadow-[0_0_0_2px_rgba(99,14,212,0.35)]"

const badgeUnselected =
    "bg-surface-container-high/85 border-outline-variant text-on-surface hover:bg-primary/85 hover:border-primary hover:text-on-primary"

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
