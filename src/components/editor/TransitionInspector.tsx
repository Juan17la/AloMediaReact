import { useEffect } from "react"
import { useEditorStore } from "../../store/editorStore"
import { findNextAdjacentOnSameTrack } from "../../utils/transitions"
import type { XfadeTransitionType } from "../../project/projectTypes"

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

export function TransitionInspector() {
    const selectedTransitionClipId = useEditorStore(s => s.selectedTransitionClipId)
    const tracks = useEditorStore(s => s.project.tracks)
    const setOutTransition = useEditorStore(s => s.setOutTransition)
    const removeOutTransition = useEditorStore(s => s.removeOutTransition)
    const setSelectedTransitionClip = useEditorStore(s => s.setSelectedTransitionClip)

    const transitionContext = (() => {
        if (!selectedTransitionClipId) return null

        for (const track of tracks) {
            const clip = track.clips.find(c => c.id === selectedTransitionClipId)
            if (!clip || clip.type !== "video" || !clip.outTransition) continue

            const nextClip = findNextAdjacentOnSameTrack(clip, track.clips)
            if (!nextClip || nextClip.type !== "video") return null

            return { clip, transition: clip.outTransition }
        }

        return null
    })()

    useEffect(() => {
        if (!selectedTransitionClipId) return
        if (transitionContext) return
        setSelectedTransitionClip(undefined)
    }, [selectedTransitionClipId, setSelectedTransitionClip, transitionContext])

    if (!selectedTransitionClipId || !transitionContext) {
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

    const { clip, transition } = transitionContext

    return (
        <div className="space-y-3">
            <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/45">Transition Type</p>
                <div className="grid grid-cols-2 gap-2">
                    {TRANSITION_TYPES.map(type => {
                        const active = transition.type === type
                        return (
                            <button
                                key={type}
                                type="button"
                                className={`${gridBtnBase} ${active ? gridBtnActive : gridBtnIdle}`}
                                onClick={() => setOutTransition(clip.id, { ...transition, type })}
                            >
                                {type}
                            </button>
                        )
                    })}
                </div>
            </section>

            <section>
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
                        setOutTransition(clip.id, { ...transition, duration: nextDuration })
                    }}
                    className="w-full accent-[var(--color-accent-red)]"
                />
            </section>

            <button
                type="button"
                className="w-full rounded-md border border-[rgba(220,60,60,0.42)] bg-transparent px-2.5 py-2 text-[11px] font-semibold text-[rgba(220,60,60,0.92)] transition-colors duration-100 hover:bg-white/8"
                onClick={() => removeOutTransition(clip.id)}
            >
                Remove Transition
            </button>
        </div>
    )
}
