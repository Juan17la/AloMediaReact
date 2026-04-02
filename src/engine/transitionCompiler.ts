import type {
    CompiledTransition,
    Project,
    TransitionClipRef,
    TransitionEdge,
    VideoClip,
} from "../project/projectTypes"
import { compileTransitionEdges } from "../project/transitionEdges"
import { CLIP_EPSILON, toMs, toSeconds } from "../utils/time"
import { resolveCanonicalTransitionType } from "./transitionRegistry"

export interface UnifiedTransitionCompilerResult {
    transitions: CompiledTransition[]
    warnings: string[]
}

function sortEdgesDeterministically(edges: TransitionEdge[]): TransitionEdge[] {
    return edges.slice().sort((a, b) => {
        const trackDiff = a.trackId.localeCompare(b.trackId)
        if (trackDiff !== 0) return trackDiff
        const boundaryDiff = a.boundaryTimeS - b.boundaryTimeS
        if (Math.abs(boundaryDiff) > CLIP_EPSILON) return boundaryDiff
        return a.edgeId.localeCompare(b.edgeId)
    })
}

function toClipRef(clipId: string | undefined): TransitionClipRef {
    if (clipId) return { clipId }
    return { synthetic: { kind: "black_silence" } }
}

function normalizeSeconds(seconds: number): number {
    return toSeconds(toMs(seconds))
}

function getAvailableTail(clip: VideoClip | undefined, boundaryTimeS: number): number {
    if (!clip) return Infinity
    return Math.max(0, boundaryTimeS - clip.timelineStart)
}

function getAvailableHead(clip: VideoClip | undefined, boundaryTimeS: number): number {
    if (!clip) return Infinity
    return Math.max(0, clip.timelineEnd - boundaryTimeS)
}

function buildTransitionId(edge: TransitionEdge, clipARef: TransitionClipRef, clipBRef: TransitionClipRef): string {
    const boundaryMs = toMs(edge.boundaryTimeS)
    const aKey = clipARef.clipId ?? "syntheticA"
    const bKey = clipBRef.clipId ?? "syntheticB"
    return `${edge.trackId}:${aKey}:${bKey}:${boundaryMs}:${edge.transitionTypeCanonical}`
}

export function compileUnifiedTransitions(project: Project): UnifiedTransitionCompilerResult {
    const warnings: string[] = []
    const byVideoClipId = new Map<string, VideoClip>()

    for (const track of project.tracks) {
        if (track.type !== "video") continue
        for (const clip of track.clips) {
            if (clip.type !== "video") continue
            byVideoClipId.set(clip.id, clip)
        }
    }

    const migration = project.transitionEdges
        ? { edges: project.transitionEdges, report: { generatedEdges: project.transitionEdges.length, warnings: [] } }
        : compileTransitionEdges(project)
    warnings.push(...migration.report.warnings)

    const sourceEdges = migration.edges
    const edges = sortEdgesDeterministically(sourceEdges)
    const transitions: CompiledTransition[] = []

    for (const edge of edges) {
        const clipA = edge.clipAId ? byVideoClipId.get(edge.clipAId) : undefined
        const clipB = edge.clipBId ? byVideoClipId.get(edge.clipBId) : undefined

        const requestedDurationS = Math.max(0, edge.durationS)
        const availableTailA = getAvailableTail(clipA, edge.boundaryTimeS)
        const availableHeadB = getAvailableHead(clipB, edge.boundaryTimeS)
        const maxAllowedDuration = Math.min(requestedDurationS, availableTailA, availableHeadB)
        const clampedDurationS = normalizeSeconds(maxAllowedDuration)

        if (clampedDurationS < requestedDurationS - CLIP_EPSILON) {
            warnings.push(
                `[transitionCompiler] Clamped transition edge ${edge.edgeId} from ${requestedDurationS.toFixed(3)}s to ${clampedDurationS.toFixed(3)}s.`,
            )
        }

        if (clampedDurationS <= CLIP_EPSILON) {
            warnings.push(
                `[transitionCompiler] Dropped transition edge ${edge.edgeId} because clamped duration is ${clampedDurationS.toFixed(3)}s.`,
            )
            continue
        }

        const boundaryTimeS = normalizeSeconds(edge.boundaryTimeS)
        const startTimeS = normalizeSeconds(boundaryTimeS - clampedDurationS)
        const endTimeS = boundaryTimeS
        const clipARef = toClipRef(edge.clipAId)
        const clipBRef = toClipRef(edge.clipBId)
        const requestedType = typeof edge.params.requestedType === "string"
            ? edge.params.requestedType
            : edge.transitionTypeCanonical
        const typeResolution = resolveCanonicalTransitionType(requestedType)
        const fallbackReason = typeof edge.params.fallbackReason === "string"
            ? edge.params.fallbackReason
            : typeResolution.entry.fallbackPolicy.reason

        if (typeResolution.normalized) {
            warnings.push(
                `[transitionCompiler] Normalized transition type on edge ${edge.edgeId} from "${typeResolution.requestedId}" to "${typeResolution.canonicalId}" (${fallbackReason}).`,
            )
        }

        transitions.push({
            transitionId: buildTransitionId(edge, clipARef, clipBRef),
            trackId: edge.trackId,
            clipARef,
            clipBRef,
            startTimeS,
            endTimeS,
            boundaryTimeS,
            durationS: clampedDurationS,
            typeCanonical: typeResolution.canonicalId,
            normalizedParams: { ...edge.params },
            audioCurveType: "equal_power",
            debugFields: {
                edgeId: edge.edgeId,
                sourceReason: edge.sourceReason,
                requestedDurationS: normalizeSeconds(requestedDurationS),
                clampedDurationS,
                requestedType: typeResolution.requestedId,
                normalizedType: typeResolution.normalized,
                fallbackReason,
            },
        })
    }

    return { transitions, warnings }
}
