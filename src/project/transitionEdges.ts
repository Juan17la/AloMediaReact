import type { ClipTransition, Project, TransitionEdge, VideoClip } from "./projectTypes"
import { resolveCanonicalTransitionType } from "../engine/transitionRegistry"
import { CLIP_EPSILON, toMs, toSeconds } from "../utils/time"

export interface TransitionMigrationReport {
    generatedEdges: number
    warnings: string[]
}

function clipDurationS(clip: VideoClip): number {
    return Math.max(0, clip.timelineEnd - clip.timelineStart)
}

function hasPositiveDuration(transition: ClipTransition | undefined): transition is ClipTransition {
    return !!transition && Number.isFinite(transition.duration) && transition.duration > CLIP_EPSILON
}

function buildEdgeId(trackId: string, boundaryTimeS: number, clipAId?: string, clipBId?: string): string {
    const boundaryMs = toMs(boundaryTimeS)
    const a = clipAId ?? "syntheticA"
    const b = clipBId ?? "syntheticB"
    return `${trackId}:${a}:${b}:${boundaryMs}`
}

function clampDuration(
    requestedDurationS: number,
    clipA: VideoClip | null,
    clipB: VideoClip | null,
): number {
    const aMax = clipA ? clipDurationS(clipA) : Infinity
    const bMax = clipB ? clipDurationS(clipB) : Infinity
    const maxDuration = Math.max(0, Math.min(aMax, bMax))
    return Math.max(0, Math.min(requestedDurationS, maxDuration))
}

function buildEdge(
    trackId: string,
    boundaryTimeS: number,
    clipA: VideoClip | null,
    clipB: VideoClip | null,
    transition: ClipTransition,
    sourceReason: TransitionEdge["sourceReason"],
): TransitionEdge | null {
    const durationS = clampDuration(transition.duration, clipA, clipB)
    if (durationS <= CLIP_EPSILON) return null

    const normalizedDurationS = toSeconds(toMs(durationS))
    const normalizedBoundaryS = toSeconds(toMs(boundaryTimeS))
    const startTimeS = toSeconds(toMs(normalizedBoundaryS - normalizedDurationS))

    const normalization = resolveCanonicalTransitionType(transition.type)

    return {
        edgeId: buildEdgeId(trackId, normalizedBoundaryS, clipA?.id, clipB?.id),
        trackId,
        clipAId: clipA?.id,
        clipBId: clipB?.id,
        syntheticA: clipA ? undefined : { kind: "black_silence" },
        syntheticB: clipB ? undefined : { kind: "black_silence" },
        boundaryTimeS: normalizedBoundaryS,
        startTimeS,
        endTimeS: normalizedBoundaryS,
        durationS: normalizedDurationS,
        transitionTypeCanonical: normalization.canonicalId,
        params: {
            requestedType: normalization.requestedId,
            normalized: normalization.normalized,
            fallbackId: normalization.entry.fallbackPolicy.fallbackId,
            fallbackReason: normalization.entry.fallbackPolicy.reason,
        },
        sourceReason,
    }
}

export function compileTransitionEdges(project: Project): { edges: TransitionEdge[]; report: TransitionMigrationReport } {
    const warnings: string[] = []
    const edges: TransitionEdge[] = []

    const videoTracks = project.tracks
        .filter(track => track.type === "video")
        .slice()
        .sort((a, b) => a.order - b.order)

    for (const track of videoTracks) {
        const clips = track.clips
            .filter((clip): clip is VideoClip => clip.type === "video")
            .slice()
            .sort((a, b) => {
                const startDiff = a.timelineStart - b.timelineStart
                if (Math.abs(startDiff) > CLIP_EPSILON) return startDiff
                return a.id.localeCompare(b.id)
            })

        for (let i = 0; i < clips.length; i++) {
            const current = clips[i]
            const prev = i > 0 ? clips[i - 1] : null
            const next = i < clips.length - 1 ? clips[i + 1] : null

            if (clipDurationS(current) <= CLIP_EPSILON) {
                if (hasPositiveDuration(current.transitionIn) || hasPositiveDuration(current.transitionOut)) {
                    warnings.push(`[transitionMigration] Ignored transitions for zero-length clip ${current.id}`)
                }
                continue
            }

            const out = hasPositiveDuration(current.transitionOut) ? current.transitionOut : undefined
            const inCurrent = hasPositiveDuration(current.transitionIn) ? current.transitionIn : undefined
            const incoming = next && hasPositiveDuration(next.transitionIn) ? next.transitionIn : undefined

            const hasAdjacentPrev = !!prev && Math.abs(current.timelineStart - prev.timelineEnd) <= CLIP_EPSILON
            const prevHasOut = !!(prev && hasPositiveDuration(prev.transitionOut))

            if (inCurrent) {
                if (!hasAdjacentPrev) {
                    const inEdge = buildEdge(track.id, current.timelineStart, null, current, inCurrent, "synthesizedStart")
                    if (inEdge) edges.push(inEdge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionIn on ${current.id}`)
                } else if (prevHasOut) {
                    // Adjacent previous outgoing transition takes priority over this incoming transition.
                }
            }

            if (!next) {
                if (out) {
                    const edge = buildEdge(track.id, current.timelineEnd, current, null, out, "synthesizedEnd")
                    if (edge) edges.push(edge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionOut on clip ${current.id}`)
                }
                continue
            }

            const nextDuration = clipDurationS(next)
            if (nextDuration <= CLIP_EPSILON) {
                if (incoming) {
                    warnings.push(`[transitionMigration] Ignored transitionIn for zero-length clip ${next.id}`)
                }
                if (out) {
                    const edge = buildEdge(track.id, current.timelineEnd, current, null, out, "synthesizedEnd")
                    if (edge) edges.push(edge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionOut on clip ${current.id}`)
                }
                continue
            }

            const adjacent = Math.abs(next.timelineStart - current.timelineEnd) <= CLIP_EPSILON
            if (adjacent) {
                const boundary = next.timelineStart
                if (out) {
                    const reason: TransitionEdge["sourceReason"] = incoming ? "conflictResolved" : "legacyOut"
                    const edge = buildEdge(track.id, boundary, current, next, out, reason)
                    if (edge) edges.push(edge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionOut edge ${current.id}->${next.id}`)
                    continue
                }

                if (incoming) {
                    const edge = buildEdge(track.id, boundary, current, next, incoming, "legacyIn")
                    if (edge) edges.push(edge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionIn edge ${current.id}->${next.id}`)
                }
                continue
            }

            if (out) {
                const outEdge = buildEdge(track.id, current.timelineEnd, current, null, out, "synthesizedEnd")
                if (outEdge) edges.push(outEdge)
                else warnings.push(`[transitionMigration] Dropped oversized/invalid non-adjacent transitionOut on ${current.id}`)
            }

            // transitionIn is compiled on its owning clip iteration above.
        }
    }

    edges.sort((a, b) => {
        const trackDiff = a.trackId.localeCompare(b.trackId)
        if (trackDiff !== 0) return trackDiff
        const boundaryDiff = a.boundaryTimeS - b.boundaryTimeS
        if (Math.abs(boundaryDiff) > CLIP_EPSILON) return boundaryDiff
        return a.edgeId.localeCompare(b.edgeId)
    })

    return {
        edges,
        report: {
            generatedEdges: edges.length,
            warnings,
        },
    }
}

export function ensureCanonicalTransitionEdges(project: Project): { project: Project; report: TransitionMigrationReport } {
    const { edges, report } = compileTransitionEdges(project)
    return {
        project: {
            ...project,
            transitionEdges: edges,
        },
        report,
    }
}
