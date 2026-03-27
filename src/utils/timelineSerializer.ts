import type { Project } from '../project/projectTypes'

export type TimelineState = Project

export function serializeTimeline(timelineState: TimelineState): string {
  return JSON.stringify(timelineState)
}

export function deserializeTimeline(raw: string): TimelineState {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Project data is not valid JSON.')
  }
  const p = parsed as TimelineState
  if (
    typeof p !== 'object' || p === null ||
    typeof p.id !== 'string' ||
    !Array.isArray(p.tracks) ||
    !Array.isArray(p.media)
  ) {
    throw new Error('Project data is corrupt or incompatible.')
  }
  return p
}
