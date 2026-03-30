import type { Clip, ClipTransition, RenderSegment, XfadeTransitionType } from "../project/projectTypes"
import { CLIP_EPSILON } from "./time"

const KNOWN_XFADE_TRANSITIONS = new Set<string>([
    "fade",
    "wipeleft",
    "wiperight",
    "slideleft",
    "slideright",
    "circlecrop",
    "distance",
])

interface TimelineItem {
    trackId: string
    timelineStart: number
    timelineEnd: number
}

export function supportsOutgoingTransition(
    clipOrSegment: Clip | RenderSegment,
): clipOrSegment is (Clip & { type: "video" }) | (RenderSegment & { type: "video" }) {
    return clipOrSegment.type === "video"
}

export function getOutgoingTransition(clipOrSegment: Clip | RenderSegment): ClipTransition | undefined {
    if (!supportsOutgoingTransition(clipOrSegment)) return undefined
    return clipOrSegment.outTransition
}

export function findNextAdjacentOnSameTrack<T extends TimelineItem>(
    item: T,
    candidates: T[],
    epsilon: number = CLIP_EPSILON,
): T | undefined {
    const sameTrack = candidates
        .filter(candidate => candidate.trackId === item.trackId && candidate !== item)
        .sort((a, b) => a.timelineStart - b.timelineStart)

    for (const candidate of sameTrack) {
        if (candidate.timelineStart < item.timelineEnd - epsilon) continue
        if (Math.abs(candidate.timelineStart - item.timelineEnd) <= epsilon) {
            return candidate
        }
        return undefined
    }

    return undefined
}

export function clampTransitionDuration(
    duration: number,
    currentClipDuration: number,
    nextClipDuration: number,
): number {
    if (!Number.isFinite(duration)) return 0
    const maxDuration = Math.max(0, Math.min(currentClipDuration, nextClipDuration))
    return Math.max(0, Math.min(duration, maxDuration))
}

export function normalizeTransitionType(type: XfadeTransitionType | string | undefined): string {
    if (!type) return "fade"
    return KNOWN_XFADE_TRANSITIONS.has(type) ? type : "fade"
}
