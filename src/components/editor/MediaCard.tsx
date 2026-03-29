import { useState } from "react"
import { Plus } from "lucide-react"
import type { Media } from "../../project/projectTypes"
import { MediaContextMenu } from "./MediaContextMenu"

function formatDuration(media: Media): string {
  if (media.type === "image") return "IMG"

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

function getTypeBadgeClass(type: Media["type"]): string {
  if (type === "video") return "bg-[#1a3a5c]"
  if (type === "audio") return "bg-[#1a3d1a]"
  return "bg-[#3d2a1a]"
}

function getTypeBadgeLabel(type: Media["type"]): string {
  if (type === "video") return "VIDEO"
  if (type === "audio") return "AUDIO"
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
}

export function MediaCard({ media, objectUrl, proxyStatus, onInsertAtPlayhead }: MediaCardProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  const proxyBarClass = proxyStatus === 'pending'
    ? "bg-[#d4622a]"
    : proxyStatus === 'ready'
      ? "bg-[#166534]"
      : proxyStatus === 'error'
        ? "bg-[#7f1d1d]"
        : "bg-transparent"

  return (
    <>
      <div
        draggable
        onContextMenu={handleContextMenu}
        onDragStart={e => {
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
        className="group relative flex flex-col w-full bg-white/5 border border-white/7 rounded-lg p-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.25)] cursor-pointer overflow-hidden select-none transition-[background,border-color] duration-120 ease-out hover:bg-white/9 hover:border-white/[0.14]"
      >
        {/* Thumbnail area — 16:9 */}
        <div className="relative aspect-video bg-dark overflow-hidden">
          <MediaThumbnail media={media} objectUrl={objectUrl} />

          {/* Type badge — top-left */}
          <div className={`absolute top-1 left-0 h-3.5 px-1.25 flex items-center ${getTypeBadgeClass(media.type)}`}>
            <span className="text-[8px] font-bold tracking-[0.08em] text-white/85">
              {getTypeBadgeLabel(media.type)}
            </span>
          </div>

          {/* Hover overlay with Plus icon */}
          <div
            className="absolute inset-0 bg-[rgba(192,57,43,0.15)] flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-120"
            onClick={onInsertAtPlayhead}
          >
            <Plus size={20} className="text-white" />
          </div>
        </div>

        {/* Info strip */}
        <div className="h-7 px-1.5 flex items-center justify-between gap-1 relative">
          <span className="text-[10px] text-accent-white overflow-hidden text-ellipsis whitespace-nowrap flex-1">
            {media.name}
          </span>
          <span className="text-[10px] text-muted shrink-0 font-mono">
            {formatDuration(media)}
          </span>

          {/* Proxy status bar — 2px at very bottom */}
          {proxyStatus && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${proxyBarClass}`} />
          )}
        </div>
      </div>

      {menu && (
        <MediaContextMenu
          mediaId={media.id}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onInsertAtPlayhead={onInsertAtPlayhead}
        />
      )}
    </>
  )
}

export function LoadingCard({ fileName }: { fileName: string }) {
  return (
    <div className="relative flex flex-col w-full bg-white/9 border border-white/[0.14] rounded-lg p-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.25)] cursor-pointer overflow-hidden select-none">
      {/* Thumbnail placeholder — 16:9 */}
      <div className="relative aspect-video bg-dark flex items-center justify-center rounded-sm">
        <div className="w-5 h-5 rounded-full border-2 border-dark-elevated border-t-accent-white animate-spin" />
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
