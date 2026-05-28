import type { Media, Project } from "../project/projectTypes"
import { httpBlob } from "../api/http"
import { fileCacheService } from "./fileCacheService"
import { hashFile } from "../utils/fileHash"

type TimelineMediaRecord = Media & Record<string, unknown>

export class MediaSyncService {
  private static _instance: MediaSyncService

  static get instance(): MediaSyncService {
    if (!MediaSyncService._instance) {
      MediaSyncService._instance = new MediaSyncService()
    }
    return MediaSyncService._instance
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0
  }

  private pickFirstString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
    for (const key of keys) {
      const value = record[key]
      if (this.isNonEmptyString(value)) return value
    }
    return undefined
  }

  private resolveMediaPath(media: TimelineMediaRecord, projectId: number): string | undefined {
    const direct = this.pickFirstString(media, ["deliveryUrl", "src", "source"])
    if (direct) {
      if (/^https?:\/\//i.test(direct)) return direct
      return direct.startsWith("/") ? direct : `/${direct}`
    }
    return this.isNonEmptyString(media.id) ? `/projects/${projectId}/media/${media.id}` : undefined
  }

  private async fetchMediaFile(media: TimelineMediaRecord, projectId: number): Promise<File | null> {
    const path = this.resolveMediaPath(media, projectId)
    if (!path) return null

    const blob = await httpBlob(path)
    if (!blob) return null

    const fileName = this.pickFirstString(media, ["fileName", "name"]) ?? `${media.id}`
    const mimeType = this.pickFirstString(media, ["mimeType", "format"]) ?? (blob.type || "application/octet-stream")
    return new File([blob], fileName, { type: mimeType })
  }

  async hydrateProjectMediaCache(project: Project, projectId: number): Promise<Project> {
    const hydratedMedia = await Promise.all(
      project.media.map(async item => {
        const media = item as TimelineMediaRecord
        const currentHash = this.isNonEmptyString(media.hash) ? media.hash : undefined
        const hasPlaceholderHash = !!currentHash && currentHash.startsWith("remote:")

        if (currentHash) {
          const cached = await fileCacheService.getFileFromCache(currentHash).catch(() => null)
          if (cached) return item
        }

        const downloaded = await this.fetchMediaFile(media, projectId).catch(() => null)
        if (!downloaded) return item

        const nextHash = !currentHash || hasPlaceholderHash
          ? await hashFile(downloaded)
          : currentHash
        await fileCacheService.saveFileToCache(nextHash, downloaded).catch(() => {})

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
}

export const mediaSyncService = MediaSyncService.instance

export const hydrateProjectMediaCache = (project: Project, projectId: number) =>
  mediaSyncService.hydrateProjectMediaCache(project, projectId)