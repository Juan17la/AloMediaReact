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

function getTypeBadgeColor(type: Media["type"]): string {
  if (type === "video") return "#1a3a5c"
  if (type === "audio") return "#1a3d1a"
  return "#3d2a1a"
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
  const [hovered, setHovered] = useState(false)

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  const proxyBarColor = proxyStatus === 'pending'
    ? "#d4622a"
    : proxyStatus === 'ready'
      ? "#166534"
      : proxyStatus === 'error'
        ? "#7f1d1d"
        : "transparent"

  return (
    <>
      <div
        draggable
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          background: hovered ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${hovered ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 8,
          padding: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          cursor: "pointer",
          overflow: "hidden",
          userSelect: "none",
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      >
        {/* Thumbnail area — 16:9 */}
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
            background: "var(--color-dark)",
            overflow: "hidden",
          }}
        >
          <MediaThumbnail media={media} objectUrl={objectUrl} />

          {/* Type badge — top-left */}
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 0,
              height: 14,
              padding: "0 5px",
              background: getTypeBadgeColor(media.type),
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              {getTypeBadgeLabel(media.type)}
            </span>
          </div>

          {/* Hover overlay with Plus icon */}
          {hovered && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(192,57,43,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={onInsertAtPlayhead}
            >
              <Plus size={20} style={{ color: "#ffffff" }} />
            </div>
          )}
        </div>

        {/* Info strip */}
        <div
          style={{
            height: 28,
            padding: "0 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--color-accent-white)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {media.name}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--color-muted)",
              flexShrink: 0,
              fontFamily: "'Courier New', monospace",
            }}
          >
            {formatDuration(media)}
          </span>

          {/* Proxy status bar — 2px at very bottom */}
          {proxyStatus && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: proxyBarColor,
              }}
            />
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
    <div
      style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          background: "rgba(255,255,255,0.09)",
          border: `1px solid "rgba(255,255,255,0.14)"`,
          borderRadius: 8,
          padding: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          cursor: "pointer",
          overflow: "hidden",
          userSelect: "none",
          transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      {/* Thumbnail placeholder — 16:9 */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          background: "var(--color-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "2px solid var(--color-dark-elevated)",
            borderTopColor: "var(--color-accent-white)",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
      {/* Info strip */}
      <div
        style={{
            height: 28,
            padding: "0 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            position: "relative",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--color-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {fileName}
        </span>
      </div>
    </div>
  )
}
