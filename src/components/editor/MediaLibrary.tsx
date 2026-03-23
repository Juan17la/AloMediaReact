import { useRef, useState, useEffect, useCallback } from "react"
import { FilePlus2, Plus, Search } from "lucide-react"
import { useEditorStore, fileMap } from "../../store/editorStore"
import { MediaCard, LoadingCard } from "./MediaCard"
import { generateId } from "../../utils/id"
import { generateProxy } from "../../engine/proxyEngine"
import type { Clip, Media, Track } from "../../project/projectTypes"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { DEFAULT_SPEED } from "../../constants/speed"
import { toMs, toSeconds } from "../../utils/time"

interface PendingMedia {
  tempId: string
  fileName: string
}

// Module-level ref so keyboard shortcut hook can trigger the file input
export const triggerFileInputRef = { current: null as (() => void) | null }

export function MediaLibrary() {
  const addMedia = useEditorStore(s => s.addMedia)
  const setProxyState = useEditorStore(s => s.setProxyState)
  const proxyMap = useEditorStore(s => s.proxyMap)
  const media = useEditorStore(s => s.project.media ?? [])
  const playhead = useEditorStore(s => s.playhead)
  const tracks = useEditorStore(s => s.project.tracks ?? [])
  const addClip = useEditorStore(s => s.addClip)
  const addTrack = useEditorStore(s => s.addTrack)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingMedia[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const dropZoneRef = useRef<HTMLDivElement>(null)
  // One object URL per mediaId, revoked on unmount
  const objectUrlsRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    triggerFileInputRef.current = () => inputRef.current?.click()
    return () => {
      triggerFileInputRef.current = null
    }
  }, [])

  function getObjectUrl(mediaId: string): string | undefined {
    const existing = objectUrlsRef.current.get(mediaId)
    if (existing) return existing
    const file = fileMap.get(mediaId)
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    objectUrlsRef.current.set(mediaId, url)
    return url
  }

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const fileArray = Array.from(files)
    const newPending: PendingMedia[] = fileArray.map(file => ({ tempId: generateId(), fileName: file.name }))
    setPending(prev => [...prev, ...newPending])
    await Promise.all(
      fileArray.map(async (file, i) => {
        const m = await addMedia(file)
        setPending(prev => prev.filter(p => p.tempId !== newPending[i].tempId))
        if (m.type === 'video') {
          setProxyState(m.id, { status: 'pending', objectUrl: null })
          generateProxy(
            m.id,
            file,
            (url) => setProxyState(m.id, { status: 'ready', objectUrl: url }),
            () => setProxyState(m.id, { status: 'error', objectUrl: null }),
          )
        }
      })
    )
  }

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
    setDropError(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node | null)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const accepted: File[] = []
    const rejected: string[] = []

    Array.from(e.dataTransfer.files).forEach(file => {
      if (file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.startsWith('image/')) {
        accepted.push(file)
      } else {
        rejected.push(file.name)
      }
    })

    if (rejected.length > 0) {
      setDropError(`Unsupported: ${rejected.slice(0, 2).join(', ')}${rejected.length > 2 ? ` +${rejected.length - 2} more` : ''}`)
      setTimeout(() => setDropError(null), 3500)
    }

    if (accepted.length > 0) {
      const dt = new DataTransfer()
      accepted.forEach(f => dt.items.add(f))
      await handleFiles(dt.files)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMedia, setProxyState])

  function insertMediaAtPlayhead(item: Media) {
    const trackType = item.type === "audio" ? "audio" : "video"
    const roundedPlayhead = toSeconds(toMs(playhead))
    const duration = item.duration ?? 5
    const timelineStart = roundedPlayhead
    const timelineEnd = toSeconds(toMs(roundedPlayhead + duration))

    let targetTrack: Track | undefined = tracks.find(track =>
      track.type === trackType
      && !(track.clips ?? []).some(clip => timelineStart < clip.timelineEnd && timelineEnd > clip.timelineStart),
    )

    if (!targetTrack) {
      targetTrack = addTrack(trackType)
    }

    const newClip: Clip = item.type === "audio"
      ? {
        id: generateId(),
        trackId: targetTrack.id,
        type: "audio",
        mediaId: item.id,
        timelineStart,
        timelineEnd,
        mediaStart: 0,
        mediaEnd: duration,
        volume: 1,
        speed: DEFAULT_SPEED,
        audioConfig: { ...DEFAULT_AUDIO_CONFIG },
      }
      : item.type === "image"
        ? {
          id: generateId(),
          trackId: targetTrack.id,
          type: "image",
          mediaId: item.id,
          timelineStart,
          timelineEnd,
          transform: { x: 0, y: 0, width: 1280, height: 720, rotation: 0 },
          colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
        }
        : {
          id: generateId(),
          trackId: targetTrack.id,
          type: "video",
          mediaId: item.id,
          timelineStart,
          timelineEnd,
          mediaStart: 0,
          mediaEnd: duration,
          volume: 1,
          speed: DEFAULT_SPEED,
          transform: { x: 0, y: 0, width: 1280, height: 720, rotation: 0 },
          colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
          audioConfig: { ...DEFAULT_AUDIO_CONFIG },
        }

    addClip(newClip)
  }

  const hasItems = media.length > 0 || pending.length > 0

  const filteredMedia = searchQuery.trim()
    ? media.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : media

  return (
    <div
      ref={dropZoneRef}
      className="flex flex-col h-full overflow-hidden relative"
      style={{ background: "var(--color-dark-surface)" }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none"
          style={{
            background: "rgba(34,34,48,0.85)",
            border: "2px solid var(--color-accent-red)",
          }}
        >
          <FilePlus2 size={28} style={{ color: "var(--color-accent-red)" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent-white)" }}>Drop files here</span>
        </div>
      )}

      {/* Drop error */}
      {dropError && (
        <div
          className="absolute bottom-2 left-2 right-2 z-20 pointer-events-none"
          style={{
            background: "var(--color-dark-elevated)",
            border: "1px solid #7f1d1d",
            padding: "4px 8px",
            fontSize: 10,
            color: "#f87171",
          }}
        >
          {dropError}
        </div>
      )}

      {/* Panel header */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 28,
          background: "var(--color-dark)",
          borderBottom: "1px solid var(--color-dark-border)",
          padding: "0 8px",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
            flex: 1,
          }}
        >
          Media
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          title="Add media"
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--color-dark-elevated)",
            border: "1px solid var(--color-dark-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-muted-light)",
            flexShrink: 0,
          }}
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Search bar */}
      {hasItems && (
        <div
          className="flex items-center shrink-0"
          style={{
            height: 28,
            background: "var(--color-input-bg)",
            borderBottom: "1px solid var(--color-dark-border)",
            padding: "0 8px",
            gap: 6,
          }}
        >
          <Search size={11} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 11,
              color: "var(--color-accent-white)",
              fontFamily: "inherit",
            }}
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = "" }}
      />

      {/* Empty state */}
      {!hasItems && (
        <div
          className="flex flex-col items-center justify-center flex-1 gap-3"
          style={{ padding: 16 }}
        >
          <div
            style={{
              border: "2px dashed var(--color-dark-border)",
              width: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
            }}
            onClick={() => inputRef.current?.click()}
          >
            <FilePlus2 size={24} style={{ color: "var(--color-muted)" }} />
            <span style={{ fontSize: 10, color: "var(--color-muted)", textAlign: "center" }}>
              Click or drop<br />video, audio or images
            </span>
          </div>
        </div>
      )}

      {/* Media grid — 2 cols, 1px gap acts as border */}
      {hasItems && (
        <div
          className="flex-1 overflow-y-auto"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            background: "var(--color-dark-border)",
            alignContent: "start",
          }}
        >
          {filteredMedia.map(item => (
            <div
              key={item.id}
              style={{ minWidth: 0, overflow: "hidden" }}
              onDoubleClick={() => insertMediaAtPlayhead(item)}
            >
              <MediaCard
                media={item}
                objectUrl={getObjectUrl(item.id)}
                proxyStatus={proxyMap[item.id]?.status}
                onInsertAtPlayhead={() => insertMediaAtPlayhead(item)}
              />
            </div>
          ))}
          {pending.map(p => (
            <div key={p.tempId} style={{ minWidth: 0, overflow: "hidden" }}>
              <LoadingCard fileName={p.fileName} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
