import type { Project } from '../project/projectTypes'

export type TimelineState = Project

export function serializeTimeline(timelineState: TimelineState): string {
  return JSON.stringify(timelineState)
}

export function deserializeTimeline(raw: string): TimelineState {
  return JSON.parse(raw) as TimelineState
}
