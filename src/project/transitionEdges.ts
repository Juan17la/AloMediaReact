import type { ClipTransition, Project, TransitionEdge, VideoClip } from "./projectTypes"
import { resolveCanonicalTransitionType } from "../engine/transitionRegistry"
import { CLIP_EPSILON, toMs, toSeconds } from "../utils/time"

export type TransitionEdgeEditorSide = "in" | "out"

export interface ClipTransitionViewState {
    transitionIn?: ClipTransition
    transitionOut?: ClipTransition
    transitionInOverrideMessage?: string
    transitionOutOverrideMessage?: string
}

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

function sortEdges(edges: TransitionEdge[]): TransitionEdge[] {
    return edges.slice().sort((a, b) => {
        const trackDiff = a.trackId.localeCompare(b.trackId)
        if (trackDiff !== 0) return trackDiff
        const boundaryDiff = a.boundaryTimeS - b.boundaryTimeS
        if (Math.abs(boundaryDiff) > CLIP_EPSILON) return boundaryDiff
        return a.edgeId.localeCompare(b.edgeId)
    })
}

function getCanonicalVideoTracks(project: Project): Array<{ id: string; clips: VideoClip[] }> {
    return project.tracks
        .filter(track => track.type === "video")
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(track => ({
            id: track.id,
            clips: track.clips
                .filter((clip): clip is VideoClip => clip.type === "video")
                .slice()
                .sort((a, b) => {
                    const startDiff = a.timelineStart - b.timelineStart
                    if (Math.abs(startDiff) > CLIP_EPSILON) return startDiff
                    return a.id.localeCompare(b.id)
                }),
        }))
}

function findAdjacentContext(project: Project, clipId: string): {
    trackId: string
    clip: VideoClip
    prevAdjacent: VideoClip | null
    nextAdjacent: VideoClip | null
} | null {
    for (const track of getCanonicalVideoTracks(project)) {
        const idx = track.clips.findIndex(clip => clip.id === clipId)
        if (idx < 0) continue

        const clip = track.clips[idx]
        const prev = idx > 0 ? track.clips[idx - 1] : null
        const next = idx < track.clips.length - 1 ? track.clips[idx + 1] : null

        const prevAdjacent = prev && Math.abs(clip.timelineStart - prev.timelineEnd) <= CLIP_EPSILON
            ? prev
            : null
        const nextAdjacent = next && Math.abs(next.timelineStart - clip.timelineEnd) <= CLIP_EPSILON
            ? next
            : null

        return {
            trackId: track.id,
            clip,
            prevAdjacent,
            nextAdjacent,
        }
    }

    return null
}

function matchesTargetEdge(
    edge: TransitionEdge,
    trackId: string,
    clipAId: string | undefined,
    clipBId: string | undefined,
): boolean {
    return edge.trackId === trackId
        && edge.clipAId === clipAId
        && edge.clipBId === clipBId
}

export function compileTransitionEdges(project: Project): { edges: TransitionEdge[]; report: TransitionMigrationReport } {
    const warnings: string[] = []
    const edges: TransitionEdge[] = []

    const videoTracks = getCanonicalVideoTracks(project)

    for (const track of videoTracks) {
        const clips = track.clips

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

            if (inCurrent) {
                if (!hasAdjacentPrev) {
                    const inEdge = buildEdge(track.id, current.timelineStart, null, current, inCurrent, "synthesizedStart")
                    if (inEdge) edges.push(inEdge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionIn on ${current.id}`)
                }
                // If hasAdjacentPrev: the boundary edge is handled in the adjacent block when the previous clip is iterated.
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
                if (incoming) {
                    // Clip B's transitionIn takes priority over Clip A's transitionOut at a shared boundary.
                    const reason: TransitionEdge["sourceReason"] = out ? "conflictResolved" : "legacyIn"
                    if (out) {
                        warnings.push(
                            `[transitionMigration] Conflict on edge ${current.id}->${next.id}; selected transitionIn from ${next.id} over transitionOut on ${current.id}.`,
                        )
                    }
                    const edge = buildEdge(track.id, boundary, current, next, incoming, reason)
                    if (edge) edges.push(edge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionIn edge ${current.id}->${next.id}`)
                    continue
                }

                if (out) {
                    const edge = buildEdge(track.id, boundary, current, next, out, "legacyOut")
                    if (edge) edges.push(edge)
                    else warnings.push(`[transitionMigration] Dropped oversized/invalid transitionOut edge ${current.id}->${next.id}`)
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

    const sortedEdges = sortEdges(edges)

    return {
        edges: sortedEdges,
        report: {
            generatedEdges: sortedEdges.length,
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

export function getCanonicalTransitionEdges(project: Project): TransitionEdge[] {
    return sortEdges(project.transitionEdges ?? compileTransitionEdges(project).edges)
}

export function buildClipTransitionView(project: Project): Map<string, ClipTransitionViewState> {
    const byClipId = new Map<string, ClipTransitionViewState>()
    const edges = getCanonicalTransitionEdges(project)

    const getState = (clipId: string): ClipTransitionViewState => {
        const existing = byClipId.get(clipId)
        if (existing) return existing
        const created: ClipTransitionViewState = {}
        byClipId.set(clipId, created)
        return created
    }

    for (const edge of edges) {
        const transition: ClipTransition = {
            type: edge.transitionTypeCanonical,
            duration: edge.durationS,
        }

        if (edge.clipAId) {
            const state = getState(edge.clipAId)
            state.transitionOut = transition
            if (edge.sourceReason === "conflictResolved") {
                state.transitionOutOverrideMessage = "Overridden by next clip's in-transition on this edge"
            }
        }

        if (edge.clipBId) {
            const state = getState(edge.clipBId)
            state.transitionIn = transition
        }
    }

    return byClipId
}

export function applyCanonicalTransitionEdit(
    project: Project,
    clipId: string,
    side: TransitionEdgeEditorSide,
    transition: ClipTransition | undefined,
): Project {
    const context = findAdjacentContext(project, clipId)
    if (!context) return project

    const clipA = side === "out"
        ? context.clip
        : context.prevAdjacent
    const clipB = side === "in"
        ? context.clip
        : context.nextAdjacent
    const boundaryTimeS = side === "in" ? context.clip.timelineStart : context.clip.timelineEnd

    const clipAId = clipA?.id
    const clipBId = clipB?.id
    const baseEdges = getCanonicalTransitionEdges(project)
    const retained = baseEdges.filter(edge => !matchesTargetEdge(edge, context.trackId, clipAId, clipBId))

    if (!transition) {
        return {
            ...project,
            transitionEdges: retained,
        }
    }

    const sourceReason: TransitionEdge["sourceReason"] = side === "out"
        ? "legacyOut"
        : "legacyIn"
    const edge = buildEdge(context.trackId, boundaryTimeS, clipA ?? null, clipB ?? null, transition, sourceReason)

    return {
        ...project,
        transitionEdges: sortEdges(edge ? [...retained, edge] : retained),
    }
}
