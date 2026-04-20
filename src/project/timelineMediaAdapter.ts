import type { Media, MediaType, Project } from "./projectTypes"

type TimelineMediaRecord = Media & Record<string, unknown>

const INLINE_PAYLOAD_FIELDS = [
  "data",
  "base64",
  "dataUrl",
  "sourceDataUrl",
  "fileData",
] as const

const REMOTE_METADATA_FIELDS = [
  "storageProvider",
  "storageKey",
  "storageFileId",
  "deliveryUrl",
] as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function pickFirstString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (isNonEmptyString(value)) return value
  }
  return undefined
}

function stripInlinePayload(record: TimelineMediaRecord): TimelineMediaRecord {
  const next: TimelineMediaRecord = { ...record }
  for (const key of INLINE_PAYLOAD_FIELDS) {
    delete next[key]
  }
  return next
}

function hasRemoteStorageMetadata(record: TimelineMediaRecord): boolean {
  return REMOTE_METADATA_FIELDS.some(field => isNonEmptyString(record[field]))
}

function isBlobUrl(value: string | undefined): boolean {
  return !!value && value.startsWith("blob:")
}

function inferMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (
    mimeType === "application/x-subrip" ||
    mimeType === "application/srt" ||
    mimeType === "text/srt" ||
    mimeType === "text/x-srt"
  ) {
    return "subtitles"
  }
  return "image"
}

function normalizeMediaForEditor(media: Media, projectId: number): Media {
  const raw = media as TimelineMediaRecord
  const mediaId = isNonEmptyString(raw.id)
    ? raw.id
    : pickFirstString(raw, ["mediaId", "uuid"]) ?? crypto.randomUUID()
  const mimeType = pickFirstString(raw, ["mimeType", "format"])
  const fileName = pickFirstString(raw, ["fileName", "name"])
  const deliveryUrl = pickFirstString(raw, ["deliveryUrl"])
  const existingSrc = pickFirstString(raw, ["src", "source"])
  const resolvedSrc = deliveryUrl ?? existingSrc ?? `/projects/${projectId}/media/${mediaId}`

  const normalized: TimelineMediaRecord = {
    ...raw,
    id: mediaId,
    name: isNonEmptyString(raw.name) ? raw.name : fileName ?? mediaId,
    type: isNonEmptyString(raw.type)
      ? (raw.type as MediaType)
      : inferMediaTypeFromMime(mimeType ?? "application/octet-stream"),
    format: isNonEmptyString(raw.format)
      ? raw.format
      : mimeType ?? "application/octet-stream",
    duration: typeof raw.duration === "number" ? raw.duration : null,
    size: typeof raw.size === "number" ? raw.size : 0,
    hash: isNonEmptyString(raw.hash) ? raw.hash : `remote:${mediaId}`,
    fileName: fileName ?? (isNonEmptyString(raw.name) ? raw.name : mediaId),
    mimeType: mimeType ?? "application/octet-stream",
    src: resolvedSrc,
  }

  if (deliveryUrl) {
    normalized.deliveryUrl = deliveryUrl
  }

  return stripInlinePayload(normalized) as Media
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file as Data URL"))
    reader.readAsDataURL(file)
  })
}

export function normalizeProjectTimelineFromApi(project: Project, projectId: number): Project {
  return {
    ...project,
    media: project.media.map(media => normalizeMediaForEditor(media, projectId)),
  }
}

export async function serializeProjectTimelineForApi(
  project: Project,
  resolveFile: (mediaId: string) => File | undefined,
): Promise<string> {
  const media = await Promise.all(
    project.media.map(async item => {
      const raw = item as TimelineMediaRecord
      const sanitized = stripInlinePayload(raw)
      const file = resolveFile(item.id)

      if (!file) {
        return sanitized
      }

      const source = pickFirstString(raw, ["src", "source"])
      const shouldInline = !hasRemoteStorageMetadata(raw) || isBlobUrl(source)

      if (!shouldInline) {
        return sanitized
      }

      const dataUrl = await fileToDataUrl(file)
      return {
        ...sanitized,
        fileName: pickFirstString(raw, ["fileName"]) ?? file.name,
        mimeType: pickFirstString(raw, ["mimeType"]) ?? (file.type || "application/octet-stream"),
        dataUrl,
      }
    }),
  )

  return JSON.stringify({
    ...project,
    media,
  })
}