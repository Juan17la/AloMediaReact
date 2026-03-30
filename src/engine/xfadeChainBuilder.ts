import type { ClipTransition, RenderSegment } from "../project/projectTypes"
import {
    clampTransitionDuration,
    findNextAdjacentOnSameTrack,
    getOutgoingTransition,
    supportsOutgoingTransition,
} from "../utils/transitions"
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
    timelineStart: number
    timelineEnd: number
}

function getSegmentDuration(segment: RenderSegment): number {
    return Math.max(0, segment.timelineEnd - segment.timelineStart)
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
            if (!supportsOutgoingTransition(first.segment)) continue

            const maybeTransition = getOutgoingTransition(first.segment)
            if (!maybeTransition) continue

            const sameTrackSegments = trackSegments.map(entry => entry.segment)
            const immediateNext = findNextAdjacentOnSameTrack(first.segment, sameTrackSegments)
            if (!immediateNext) continue

            const nextEntry = trackSegments.find(entry => entry.segment === immediateNext)
            if (!nextEntry || consumedIndexes.has(nextEntry.index)) continue

            const segmentIndexes: number[] = [first.index, nextEntry.index]
            const boundaries: XfadeChainBoundary[] = []

            let chainDuration = getSegmentDuration(first.segment)

            const initialDuration = clampTransitionDuration(
                maybeTransition.duration,
                getSegmentDuration(first.segment),
                getSegmentDuration(nextEntry.segment),
            )

            if (initialDuration <= CLIP_EPSILON) continue

            boundaries.push({
                fromSegmentIndex: first.index,
                toSegmentIndex: nextEntry.index,
                transition: maybeTransition,
                duration: initialDuration,
                offset: Math.max(0, chainDuration - initialDuration),
            })

            chainDuration = chainDuration + getSegmentDuration(nextEntry.segment) - initialDuration

            let cursor = nextEntry
            while (supportsOutgoingTransition(cursor.segment)) {
                const outgoing = getOutgoingTransition(cursor.segment)
                if (!outgoing) break

                const candidateNext = findNextAdjacentOnSameTrack(cursor.segment, sameTrackSegments)
                if (!candidateNext) break

                const candidateNextEntry = trackSegments.find(entry => entry.segment === candidateNext)
                if (!candidateNextEntry || consumedIndexes.has(candidateNextEntry.index)) break

                const transitionDuration = clampTransitionDuration(
                    outgoing.duration,
                    getSegmentDuration(cursor.segment),
                    getSegmentDuration(candidateNextEntry.segment),
                )

                if (transitionDuration <= CLIP_EPSILON) break

                boundaries.push({
                    fromSegmentIndex: cursor.index,
                    toSegmentIndex: candidateNextEntry.index,
                    transition: outgoing,
                    duration: transitionDuration,
                    offset: Math.max(0, chainDuration - transitionDuration),
                })

                segmentIndexes.push(candidateNextEntry.index)
                chainDuration = chainDuration + getSegmentDuration(candidateNextEntry.segment) - transitionDuration
                cursor = candidateNextEntry
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
