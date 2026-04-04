export interface SubtitleEntry {
  index: number
  startTime: number
  endTime: number
  text: string
}

const TIMECODE_RE = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{1,3})$/

function parseTimestamp(raw: string): number | null {
  const match = TIMECODE_RE.exec(raw.trim())
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  const milliseconds = Number(match[4].padEnd(3, "0"))

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    !Number.isFinite(milliseconds)
  ) {
    return null
  }

  if (minutes > 59 || seconds > 59) return null

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

function parseTimeRange(line: string): { startTime: number; endTime: number } | null {
  const match = line.match(/(.+?)\s*-->\s*(.+)/)
  if (!match) return null

  const startTime = parseTimestamp(match[1])
  const endTime = parseTimestamp(match[2])
  if (startTime === null || endTime === null || endTime <= startTime) return null

  return { startTime, endTime }
}

export function parseSrtFile(content: string): SubtitleEntry[] {
  const normalized = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()

  if (normalized.length === 0) return []

  const blocks = normalized.split(/\n{2,}/)
  const entries: SubtitleEntry[] = []

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map(line => line.trimEnd())
      .filter(line => line.trim().length > 0)

    if (lines.length < 2) continue

    const maybeIndex = Number(lines[0])
    const hasIndex = Number.isInteger(maybeIndex)
    const timeLine = hasIndex ? lines[1] : lines[0]
    const textLines = hasIndex ? lines.slice(2) : lines.slice(1)

    if (textLines.length === 0) continue

    const timeRange = parseTimeRange(timeLine)
    if (!timeRange) continue

    const text = textLines.join("\n").trim()
    if (!text) continue

    entries.push({
      index: hasIndex ? maybeIndex : entries.length + 1,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      text,
    })
  }

  return entries.sort((a, b) => {
    const delta = a.startTime - b.startTime
    if (Math.abs(delta) > Number.EPSILON) return delta
    return a.index - b.index
  })
}
