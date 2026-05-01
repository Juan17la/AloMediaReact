import { useEffect } from "react"
import { useEditorStore } from "../../store/editorStore"
import { findNextAdjacentOnSameTrack, findPrevAdjacentOnSameTrack } from "../../utils/transitions"
import type { ClipTransition, VideoClip, XfadeTransitionType } from "../../project/projectTypes"
import { resolveCanonicalTransitionType } from "../../engine/transitionRegistry"
import { buildClipTransitionView } from "../../project/transitionEdges"

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
    "border-primary/75 bg-primary/80 text-on-primary"

const gridBtnIdle =
    "border-outline-variant bg-surface-container text-on-surface/72 hover:border-outline hover:bg-surface-container-high hover:text-on-surface"

const sectionLabel = "mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"
const toggleBtn = "rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-100"
const toggleActive = "border-primary/75 bg-primary/85 text-primary-foreground"
const toggleIdle = "border-outline-variant bg-surface-container text-on-surface/72 hover:border-outline hover:bg-surface-container-high"
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
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                            <span>Duration</span>
                            <span className="font-mono text-accent-white/78">{transition.duration.toFixed(2)}s</span>
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
                            className="w-full accent-primary"
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
    const project = useEditorStore(s => s.project)
    const setClipTransitionIn = useEditorStore(s => s.setClipTransitionIn)
    const setClipTransitionOut = useEditorStore(s => s.setClipTransitionOut)
    const setSelectedTransitionClip = useEditorStore(s => s.setSelectedTransitionClip)
    const transitionViewByClipId = buildClipTransitionView(project)

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

            const transitionView = transitionViewByClipId.get(clip.id)

            return {
                clip: clip as VideoClip,
                hasAdjacentNext,
                hasAdjacentPrev,
                transitionIn: transitionView?.transitionIn,
                transitionOut: transitionView?.transitionOut,
                transitionInOverrideMessage: transitionView?.transitionInOverrideMessage,
                transitionOutOverrideMessage: transitionView?.transitionOutOverrideMessage,
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
                <div className="rounded-md border border-dark-border bg-dark p-3 text-[12px] text-muted">
                    Transition is no longer valid on this boundary.
                    <button
                        type="button"
                        className="mt-2 block rounded-md border border-dark-border px-2.5 py-1.5 text-[11px] font-semibold text-accent-white/85 hover:bg-dark-card"
                        onClick={() => setSelectedTransitionClip(undefined)}
                    >
                        Clear Selection
                    </button>
                </div>
            )
        }
        return null
    }

    const {
        clip,
        hasAdjacentNext,
        hasAdjacentPrev,
        transitionIn,
        transitionOut,
        transitionInOverrideMessage,
        transitionOutOverrideMessage,
    } = clipContext

    return (
        <div className="space-y-4">
            {/* Transition In section */}
            <TransitionSection
                label="Transition In"
                transition={transitionIn}
                disabled={false}
                disabledMessage={transitionInOverrideMessage}
                hasAdjacentClip={hasAdjacentPrev}
                onChange={(t) => setClipTransitionIn(clip.id, t)}
            />

            {transitionInOverrideMessage && (
                <div className={warningBox}>{transitionInOverrideMessage}</div>
            )}

            <div className="h-px bg-dark-border" />

            {/* Transition Out section */}
            <TransitionSection
                label="Transition Out"
                transition={transitionOut}
                disabled={false}
                disabledMessage={transitionOutOverrideMessage}
                hasAdjacentClip={hasAdjacentNext}
                onChange={(t) => setClipTransitionOut(clip.id, t)}
            />

            {transitionOutOverrideMessage && (
                <div className={warningBox}>{transitionOutOverrideMessage}</div>
            )}
        </div>
    )
}
