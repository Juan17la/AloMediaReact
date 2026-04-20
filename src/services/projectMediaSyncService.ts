import Cookies from "js-cookie"
import type { Media, Project } from "../project/projectTypes"
import { getFileFromCache, saveFileToCache } from "./fileCacheService"
import { hashFile } from "../utils/fileHash"

const BASE_URL = import.meta.env.VITE_BASE_URL

type TimelineMediaRecord = Media & Record<string, unknown>

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

function toAbsoluteApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}

function resolveMediaPath(media: TimelineMediaRecord, projectId: number): string | undefined {
  const direct = pickFirstString(media, ["deliveryUrl", "src", "source"])
  if (direct) return direct
  return isNonEmptyString(media.id) ? `/projects/${projectId}/media/${media.id}` : undefined
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchMediaFile(media: TimelineMediaRecord, projectId: number): Promise<File | null> {
  const path = resolveMediaPath(media, projectId)
  if (!path) return null

  const response = await fetch(toAbsoluteApiUrl(path), {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  if (!response.ok) return null

  const blob = await response.blob()
  const fileName = pickFirstString(media, ["fileName", "name"]) ?? `${media.id}`
  const mimeType = pickFirstString(media, ["mimeType", "format"]) ?? (blob.type || "application/octet-stream")
  return new File([blob], fileName, { type: mimeType })
}

export async function hydrateProjectMediaCache(project: Project, projectId: number): Promise<Project> {
  const hydratedMedia = await Promise.all(
    project.media.map(async item => {
      const media = item as TimelineMediaRecord
      const currentHash = isNonEmptyString(media.hash) ? media.hash : undefined
      const hasPlaceholderHash = !!currentHash && currentHash.startsWith("remote:")

      if (currentHash) {
        const cached = await getFileFromCache(currentHash).catch(() => null)
        if (cached) return item
      }

      const downloaded = await fetchMediaFile(media, projectId).catch(() => null)
      if (!downloaded) return item

      const nextHash = !currentHash || hasPlaceholderHash
        ? await hashFile(downloaded)
        : currentHash
      await saveFileToCache(nextHash, downloaded).catch(() => {})

      if (nextHash === item.hash && item.size > 0 && item.format) {
        return item
      }

      return {
        ...item,
        hash: nextHash,
        size: item.size > 0 ? item.size : downloaded.size,
        format: item.format || downloaded.type || "application/octet-stream",
        name: item.name || downloaded.name,
      }
    }),
  )

  return {
    ...project,
    media: hydratedMedia,
  }
}