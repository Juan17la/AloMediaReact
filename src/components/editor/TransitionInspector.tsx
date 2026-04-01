import { useEffect } from "react"
import { useEditorStore } from "../../store/editorStore"
import { findNextAdjacentOnSameTrack, findPrevAdjacentOnSameTrack } from "../../utils/transitions"
import type { ClipTransition, VideoClip, XfadeTransitionType } from "../../project/projectTypes"
import { resolveCanonicalTransitionType } from "../../engine/transitionRegistry"

const TRANSITION_TYPES: XfadeTransitionType[] = [
    "fade",
    "wipeleft",
    "wiperight",
    "slideleft",
    "slideright",
    "circlecrop",
    "distance",
]

const gridBtnBase = [
    "rounded-md border px-2.5 py-2 text-[11px] font-semibold tracking-[0.03em]",
    "text-left transition-[background-color,border-color,color] duration-100",
].join(" ")

const gridBtnActive =
    "border-[rgba(220,60,60,0.75)] bg-[rgba(180,20,20,0.26)] text-white"

const gridBtnIdle =
    "border-white/10 bg-black/24 text-white/72 hover:border-white/20 hover:bg-white/8 hover:text-white"

const sectionLabel = "mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/45"
const toggleBtn = "rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-100"
const toggleActive = "border-[rgba(220,60,60,0.75)] bg-[rgba(180,20,20,0.26)] text-white"
const toggleIdle = "border-white/10 bg-black/24 text-white/72 hover:border-white/20 hover:bg-white/8"
const warningBox = "rounded-md border border-amber-500/30 bg-amber-500/8 p-2 text-[11px] text-amber-300/80"

function TransitionSection({
    label,
    transition,
    disabled,
    disabledMessage,
    hasAdjacentClip,
    onChange,
}: {
    label: string
    transition: ClipTransition | undefined
    disabled: boolean
    disabledMessage?: string
    hasAdjacentClip: boolean
    onChange: (transition: ClipTransition | undefined) => void
}) {
    const isActive = !!transition
    const normalization = transition ? resolveCanonicalTransitionType(transition.type) : null

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between">
                <p className={sectionLabel}>{label}</p>
                <button
                    type="button"
                    className={`${toggleBtn} ${isActive ? toggleActive : toggleIdle}`}
                    disabled={disabled}
                    onClick={() => {
                        if (disabled) return
                        onChange(isActive ? undefined : { type: "fade", duration: 0.4 })
                    }}
                >
                    {isActive ? "On" : "Off"}
                </button>
            </div>

            {disabled && disabledMessage && (
                <div className={warningBox}>{disabledMessage}</div>
            )}

            {isActive && !disabled && (
                <>
                    {normalization?.normalized && (
                        <div className={warningBox}>
                            Unsupported type "{normalization.requestedId}" normalizes to "{normalization.canonicalId}".
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        {TRANSITION_TYPES.map(type => {
                            // Crossfade types only available when there's an adjacent clip
                            const isCrossfadeType = type !== "fade"
                            const typeDisabled = isCrossfadeType && !hasAdjacentClip
                            const active = transition.type === type
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    className={`${gridBtnBase} ${active ? gridBtnActive : gridBtnIdle} ${typeDisabled ? "opacity-40 pointer-events-none" : ""}`}
                                    onClick={() => onChange({ ...transition, type })}
                                    disabled={typeDisabled}
                                >
                                    {type}
                                </button>
                            )
                        })}
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-white/45">
                            <span>Duration</span>
                            <span className="font-mono text-white/78">{transition.duration.toFixed(2)}s</span>
                        </div>
                        <input
                            type="range"
                            min={0.1}
                            max={2}
                            step={0.05}
                            value={Math.max(0.1, Math.min(2, transition.duration))}
                            onChange={(e) => {
                                const nextDuration = Number(e.currentTarget.value)
                                if (!Number.isFinite(nextDuration)) return
                                onChange({ ...transition, duration: nextDuration })
                            }}
                            className="w-full accent-[var(--color-accent-red)]"
                        />
                    </div>
                </>
            )}
        </section>
    )
}

export function TransitionInspector() {
    const selectedClipId = useEditorStore(s => s.selectedClipId)
    const selectedTransitionClipId = useEditorStore(s => s.selectedTransitionClipId)
    const tracks = useEditorStore(s => s.project.tracks)
    const setClipTransitionIn = useEditorStore(s => s.setClipTransitionIn)
    const setClipTransitionOut = useEditorStore(s => s.setClipTransitionOut)
    const setSelectedTransitionClip = useEditorStore(s => s.setSelectedTransitionClip)

    // Resolve the clip — works for both selectedTransitionClipId and selectedClipId
    const inspectedClipId = selectedTransitionClipId ?? selectedClipId

    const clipContext = (() => {
        if (!inspectedClipId) return null

        for (const track of tracks) {
            const clip = track.clips.find(c => c.id === inspectedClipId)
            if (!clip || clip.type !== "video") continue

            const nextClip = findNextAdjacentOnSameTrack(clip, track.clips)
            const prevClip = findPrevAdjacentOnSameTrack(clip, track.clips)
            const hasAdjacentNext = !!nextClip && nextClip.type === "video"
            const hasAdjacentPrev = !!prevClip && prevClip.type === "video"

            // transitionIn is blocked if prev clip has transitionOut
            const prevBlocksTransitionIn = hasAdjacentPrev &&
                (prevClip as VideoClip).transitionOut !== undefined

            return {
                clip: clip as VideoClip,
                hasAdjacentNext,
                hasAdjacentPrev,
                prevBlocksTransitionIn,
            }
        }

        return null
    })()

    // Clear selection if the transition context became invalid (only for selectedTransitionClipId)
    useEffect(() => {
        if (!selectedTransitionClipId) return
        if (clipContext) return
        setSelectedTransitionClip(undefined)
    }, [selectedTransitionClipId, setSelectedTransitionClip, clipContext])

    if (!clipContext) {
        if (selectedTransitionClipId) {
            return (
                <div className="rounded-md border border-white/10 bg-black/24 p-3 text-[12px] text-white/65">
                    Transition is no longer valid on this boundary.
                    <button
                        type="button"
                        className="mt-2 block rounded-md border border-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white/85 hover:bg-white/8"
                        onClick={() => setSelectedTransitionClip(undefined)}
                    >
                        Clear Selection
                    </button>
                </div>
            )
        }
        return null
    }

    const { clip, hasAdjacentNext, hasAdjacentPrev, prevBlocksTransitionIn } = clipContext

    return (
        <div className="space-y-4">
            {/* Transition In section */}
            <TransitionSection
                label="Transition In"
                transition={clip.transitionIn}
                disabled={prevBlocksTransitionIn}
                disabledMessage="Controlled by previous clip's out-transition"
                hasAdjacentClip={hasAdjacentPrev}
                onChange={(t) => setClipTransitionIn(clip.id, t)}
            />

            <div className="h-px bg-white/8" />

            {/* Transition Out section */}
            <TransitionSection
                label="Transition Out"
                transition={clip.transitionOut}
                disabled={false}
                hasAdjacentClip={hasAdjacentNext}
                onChange={(t) => setClipTransitionOut(clip.id, t)}
            />
        </div>
    )
}
