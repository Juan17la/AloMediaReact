import type { ClipTransition, RenderSegment } from "../project/projectTypes"
import { CLIP_EPSILON } from "../utils/time"

export interface XfadeChainBoundary {
    fromSegmentIndex: number
    toSegmentIndex: number
    transition: ClipTransition
    duration: number
    offset: number
}

export interface XfadeChain {
    segmentIndexes: number[]
    boundaries: XfadeChainBoundary[]
    trackId: string
    trackOrder: number
    // Output timeline position where the chain starts.
    timelineStart: number
    // Output timeline position where the chain ends. In fixed-duration mode
    // this follows authored timeline boundaries (not overlap-compressed length).
    timelineEnd: number
}

function getSegmentDuration(segment: RenderSegment): number {
    return Math.max(0, segment.timelineEnd - segment.timelineStart)
}

function getBoundaryOffsetFromOverlapStart(
    chainStart: number,
    overlapStartS: number,
): number {
    return Math.max(0, overlapStartS - chainStart)
}

export function buildXfadeChains(visualSegments: RenderSegment[]): XfadeChain[] {
    const indexedSegments = visualSegments.map((segment, index) => ({ segment, index }))
    const videoByTrack = new Map<string, Array<{ segment: RenderSegment; index: number }>>()

    for (const entry of indexedSegments) {
        if (entry.segment.type !== "video") continue
        const list = videoByTrack.get(entry.segment.trackId)
        if (list) {
            list.push(entry)
        } else {
            videoByTrack.set(entry.segment.trackId, [entry])
        }
    }

    for (const trackSegments of videoByTrack.values()) {
        trackSegments.sort((a, b) => a.segment.timelineStart - b.segment.timelineStart)
    }

    const chains: XfadeChain[] = []

    for (const trackSegments of videoByTrack.values()) {
        const consumedIndexes = new Set<number>()

        for (let i = 0; i < trackSegments.length; i++) {
            const first = trackSegments[i]
            if (consumedIndexes.has(first.index)) continue
            if (first.segment.resolvedTransitionOut?.kind !== "crossfade") continue

            const nextEntry = i < trackSegments.length - 1 ? trackSegments[i + 1] : null
            if (!nextEntry || consumedIndexes.has(nextEntry.index)) continue
            if (Math.abs(nextEntry.segment.timelineStart - first.segment.timelineEnd) > CLIP_EPSILON) continue

            const segmentIndexes: number[] = [first.index, nextEntry.index]
            const boundaries: XfadeChainBoundary[] = []

            const initialDuration = Math.max(0, Math.min(
                first.segment.resolvedTransitionOut.duration,
                getSegmentDuration(first.segment),
                getSegmentDuration(nextEntry.segment),
            ))

            if (initialDuration <= CLIP_EPSILON) continue

            boundaries.push({
                fromSegmentIndex: first.index,
                toSegmentIndex: nextEntry.index,
                transition: {
                    type: first.segment.resolvedTransitionOut.type,
                    duration: initialDuration,
                },
                duration: initialDuration,
                // xfade offset is the transition start on the chain timeline,
                // not the boundary where the outgoing clip ends.
                offset: getBoundaryOffsetFromOverlapStart(
                    first.segment.timelineStart,
                    first.segment.resolvedTransitionOut.overlapStartS,
                ),
            })

            let cursor = nextEntry
            let cursorPos = i + 1
            while (cursor.segment.resolvedTransitionOut?.kind === "crossfade") {
                const candidateNextEntry = cursorPos < trackSegments.length - 1
                    ? trackSegments[cursorPos + 1]
                    : null
                if (!candidateNextEntry || consumedIndexes.has(candidateNextEntry.index)) break
                if (Math.abs(candidateNextEntry.segment.timelineStart - cursor.segment.timelineEnd) > CLIP_EPSILON) break

                const transitionDuration = Math.max(0, Math.min(
                    cursor.segment.resolvedTransitionOut.duration,
                    getSegmentDuration(cursor.segment),
                    getSegmentDuration(candidateNextEntry.segment),
                ))

                if (transitionDuration <= CLIP_EPSILON) break

                boundaries.push({
                    fromSegmentIndex: cursor.index,
                    toSegmentIndex: candidateNextEntry.index,
                    transition: {
                        type: cursor.segment.resolvedTransitionOut.type,
                        duration: transitionDuration,
                    },
                    duration: transitionDuration,
                    offset: getBoundaryOffsetFromOverlapStart(
                        first.segment.timelineStart,
                        cursor.segment.resolvedTransitionOut.overlapStartS,
                    ),
                })

                segmentIndexes.push(candidateNextEntry.index)
                cursor = candidateNextEntry
                cursorPos += 1
            }

            if (segmentIndexes.length < 2) continue

            for (const idx of segmentIndexes) {
                consumedIndexes.add(idx)
            }

            const firstSeg = visualSegments[segmentIndexes[0]]
            const lastSeg = visualSegments[segmentIndexes[segmentIndexes.length - 1]]

            chains.push({
                segmentIndexes,
                boundaries,
                trackId: firstSeg.trackId,
                trackOrder: firstSeg.trackOrder,
                timelineStart: firstSeg.timelineStart,
                timelineEnd: lastSeg.timelineEnd,
            })
        }
    }

    return chains
}
