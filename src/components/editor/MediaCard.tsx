import { useState } from "react"
import { FileText, MoreHorizontal, Plus } from "lucide-react"
import type { Media } from "../../project/projectTypes"
import { MediaContextMenu } from "./MediaContextMenu"

function formatDuration(media: Media): string {
  if (media.type === "image") return "IMG"
  if (media.type === "subtitles") return "SRT"

  const secs = Math.round(media.duration ?? 0)

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return `${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function getTypeBadgeClass(type: Media["type"]): string {
  if (type === "video") return "bg-[#f0d4d4]"
  if (type === "audio") return "bg-[#e8f0e8]"
  if (type === "subtitles") return "bg-[#faf2d8]"
  return "bg-[#f2e4d8]"
}

function getTypeBadgeLabel(type: Media["type"]): string {
  if (type === "video") return "VIDEO"
  if (type === "audio") return "AUDIO"
  if (type === "subtitles") return "SUB"
  return "IMG"
}

function MediaThumbnail({ media, objectUrl }: { media: Media; objectUrl: string | undefined }) {
  if (media.type === "video") {
    return (
      <video
        src={objectUrl}
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
        onLoadedMetadata={e => { (e.currentTarget as HTMLVideoElement).currentTime = 0 }}
      />
    )
  }
  if (media.type === "image") {
    return <img src={objectUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
  }
  if (media.type === "subtitles") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[linear-gradient(135deg,#faf2d8,#f8ead0)]">
        <FileText size={20} className="text-[#c97341]" />
        <span className="text-[9px] font-semibold tracking-[0.08em] text-[#a86b3c]">SUBTITLE FILE</span>
      </div>
    )
  }
  // audio: centered waveform bars
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg width="48" height="28" viewBox="0 0 48 28">
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const h = i % 3 === 0 ? 18 : i % 3 === 1 ? 10 : 5
          return <rect key={i} x={4 + i * 6} y={(28 - h) / 2} width={4} height={h} fill="#8a8a9a" rx="0" />
        })}
      </svg>
    </div>
  )
}

interface MediaCardProps {
  media: Media
  objectUrl: string | undefined
  proxyStatus?: 'pending' | 'ready' | 'error'
  onInsertAtPlayhead: () => void
  onImportSubtitles?: () => void
  onOpenAiTools?: (tool: "clean" | "transcribe") => void
  isImportingSubtitles?: boolean
}

export function MediaCard({
  media,
  objectUrl,
  onInsertAtPlayhead,
  onImportSubtitles,
  onOpenAiTools,
  isImportingSubtitles,
}: MediaCardProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const isSubtitles = media.type === "subtitles"

  function openMenuAt(x: number, y: number) {
    setMenu({ x, y })
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    openMenuAt(e.clientX, e.clientY)
  }

  function handleOpenMenuClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    openMenuAt(rect.left, rect.bottom + 4)
  }

  return (
    <>
      <div
        draggable={!isSubtitles}
        onContextMenu={handleContextMenu}
        onDragStart={e => {
          if (isSubtitles) {
            e.preventDefault()
            return
          }
          const durationSeconds = media.duration ?? 5
          e.dataTransfer.setData("mediaId", media.id)
          e.dataTransfer.setData("clipDuration", String(durationSeconds))
          window.dispatchEvent(new CustomEvent("alomedia:drag-start", {
            detail: {
              kind: "media",
              mediaId: media.id,
              durationSeconds,
            },
          }))
        }}
        onDragEnd={() => {
          window.dispatchEvent(new CustomEvent("alomedia:drag-end"))
        }}
        className="group relative flex flex-col w-full min-h-36 h-auto bg-dark-card border border-dark-border rounded-lg p-2 shadow-[0_2px_6px_rgba(26,26,31,0.08)] cursor-pointer overflow-hidden select-none transition-[background,border-color] duration-120 ease-out hover:bg-dark-elevated hover:border-dark-border-light"
      >
        <button
          type="button"
          aria-label="Open media options"
          onClick={handleOpenMenuClick}
          className="absolute top-3 right-3 z-20 h-6 w-6 rounded-md border border-dark-border bg-dark/90 text-accent-white/75 flex items-center justify-center transition-colors duration-100 hover:bg-dark hover:text-accent-white"
        >
          <MoreHorizontal size={14} />
        </button>

        {/* Thumbnail area — 16:9 */}
        <div className="relative aspect-video bg-dark overflow-hidden rounded-md">
          <MediaThumbnail media={media} objectUrl={objectUrl} />

          {/* Type badge — top-left */}
          <div className={`absolute top-1 left-0 h-3.5 px-1.25 flex items-center ${getTypeBadgeClass(media.type)}`}>
            <span className="text-[8px] font-bold tracking-[0.08em] text-accent-white/85">
              {getTypeBadgeLabel(media.type)}
            </span>
          </div>

          {/* Hover overlay with Plus icon */}
          <div
            className="absolute inset-0 bg-[rgba(212,80,90,0.12)] flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-120"
            onClick={isSubtitles ? onImportSubtitles : onInsertAtPlayhead}
          >
            {isSubtitles ? (
              <span className="text-[10px] font-semibold tracking-[0.08em] text-accent-white">
                {isImportingSubtitles ? "Importing..." : "Import"}
              </span>
            ) : (
              <Plus size={20} className="text-accent-white" />
            )}
          </div>
        </div>

        {/* Info strip */}
        <div className="pt-2 px-0.5 flex flex-col gap-1.5 relative">
          <span className="text-[10px] text-accent-white overflow-hidden text-ellipsis whitespace-nowrap pr-8">
            {media.name}
          </span>
          <div className="flex flex-wrap items-center gap-1 text-[9px] text-muted">
            <span className="rounded bg-dark px-1.5 py-0.5 uppercase tracking-[0.06em]">{media.format || media.type}</span>
            <span className="rounded bg-dark px-1.5 py-0.5 font-mono">{formatDuration(media)}</span>
            <span className="rounded bg-dark px-1.5 py-0.5 font-mono">{formatSize(media.size)}</span>
          </div>

        </div>
      </div>

      {menu && (
        <MediaContextMenu
          mediaId={media.id}
          mediaType={media.type}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onInsertAtPlayhead={onInsertAtPlayhead}
          onImportSubtitles={onImportSubtitles}
          onOpenAiTools={onOpenAiTools}
          isImportingSubtitles={isImportingSubtitles}
        />
      )}
    </>
  )
}

export function LoadingCard({ fileName }: { fileName: string }) {
  return (
    <div className="relative flex flex-col w-full min-h-36 h-auto bg-dark-card border border-dark-border rounded-lg p-1.5 shadow-[0_2px_6px_rgba(26,26,31,0.08)] cursor-pointer overflow-hidden select-none">
      {/* Thumbnail placeholder — 16:9 */}
      <div className="relative aspect-video bg-dark flex items-center justify-center rounded-sm">
        <div className="w-5 h-5 rounded-full border-2 border-dark-border border-t-accent-red animate-spin" />
      </div>
      {/* Info strip */}
      <div className="h-7 px-1.5 flex items-center justify-between gap-1 relative">
        <span className="text-[10px] text-muted overflow-hidden text-ellipsis whitespace-nowrap">
          {fileName}
        </span>
      </div>
    </div>
  )
}
