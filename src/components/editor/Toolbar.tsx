import { useCallback, useEffect, useRef, useState } from "react"
import {
  Scissors,
  Copy,
  Clipboard,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  Film,
  Music,
  HelpCircle,
  X,
} from "lucide-react"
import { useEditorStore } from "../../store/editorStore"
import { usePlayer } from "../../hooks/usePlayer"
import {
  TIMELINE_ZOOM,
  MIN_PIXELS_PER_SECOND,
  MAX_PIXELS_PER_SECOND,
} from "../../constants/timeline"

const SHORTCUTS = [
  { keys: "Ctrl+Z",          action: "Undo" },
  { keys: "Ctrl+Y",          action: "Redo" },
  { keys: "Ctrl+C",          action: "Copy selected clip" },
  { keys: "Ctrl+V",          action: "Paste clip" },
  { keys: "Ctrl+X",          action: "Cut selected clip" },
  { keys: "Space",           action: "Play / Pause" },
  { keys: "Shift+I",         action: "Add media (open picker)" },
  { keys: "Shift+S",         action: "Split clip at playhead" },
  { keys: "Shift++",         action: "Zoom in" },
  { keys: "Shift+−",         action: "Zoom out" },
  { keys: "Delete",          action: "Delete selected clip" },
  { keys: ",",               action: "Seek back 1 frame" },
  { keys: ".",               action: "Seek forward 1 frame" },
]

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [onClose])

  const half = Math.ceil(SHORTCUTS.length / 2)
  const left = SHORTCUTS.slice(0, half)
  const right = SHORTCUTS.slice(half)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-panel"
        style={{
          width: 520,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "rgba(255, 255, 255, 0.92)",
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", borderRadius: 6, padding: 6, color: "rgba(255, 255, 255, 0.55)", cursor: "pointer", display: "flex", alignItems: "center", transition: "color 120ms ease-out, background 120ms ease-out" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255, 255, 255, 0.90)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.07)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255, 255, 255, 0.55)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
          {[left, right].map((col, ci) => (
            <div key={ci} className="flex flex-col" style={{ gap: 2 }}>
              {col.map(({ keys, action }) => (
                <div key={keys} className="flex items-center justify-between" style={{ padding: "2px 0" }}>
                  <span style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.80)" }}>{action}</span>
                  <kbd
                    style={{
                      fontSize: 10,
                      fontFamily: "'Courier New', monospace",
                      background: "rgba(0, 0, 0, 0.30)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 6,
                      padding: "2px 8px",
                      color: "rgba(255, 255, 255, 0.60)",
                      marginLeft: 12,
                      flexShrink: 0,
                    }}
                  >
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Reusable toolbar button
function ToolbarBtn({
  icon,
  label,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  active = false,
  snapOn = false,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  onPointerDown?: () => void
  onPointerUp?: () => void
  onPointerLeave?: () => void
  onPointerCancel?: () => void
  active?: boolean
  snapOn?: boolean
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  const bg = snapOn
    ? "rgba(192, 57, 43, 0.12)"
    : active || hovered
      ? "rgba(255, 255, 255, 0.07)"
      : "transparent"

  const iconColor = disabled
    ? "var(--color-dark-border-light)"
    : snapOn || active
      ? "var(--color-accent-red)"
      : hovered
        ? "rgba(255, 255, 255, 0.90)"
        : "rgba(255, 255, 255, 0.55)"

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { setHovered(false); onPointerLeave?.() }}
      onPointerCancel={onPointerCancel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="toolbar-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        background: bg,
        color: iconColor,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        transition: "background-color 120ms ease-out, color 120ms ease-out",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", width: 14, height: 14 }}>
        {icon}
      </span>
    </button>
  )
}

// Track add button with label
function TrackBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        height: 28,
        padding: "0 8px",
        borderRadius: 6,
        border: "none",
        background: hovered ? "rgba(255, 255, 255, 0.07)" : "transparent",
        color: hovered ? "var(--color-accent-red)" : "var(--color-muted-light)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background-color 120ms ease-out, color 120ms ease-out",
        fontFamily: "inherit",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", width: 14, height: 14 }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// Vertical divider between groups
function GroupDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        margin: "0 6px",
        background: "var(--color-dark-border)",
        flexShrink: 0,
      }}
    />
  )
}

export function Toolbar() {
  const selectedClipId = useEditorStore(s => s.selectedClipId)
  const playhead = useEditorStore(s => s.playhead)
  const splitClip = useEditorStore(s => s.splitClip)
  const copyClip = useEditorStore(s => s.copyClip)
  const pasteClip = useEditorStore(s => s.pasteClip)
  const undo = useEditorStore(s => s.undo)
  const redo = useEditorStore(s => s.redo)
  const addTrack = useEditorStore(s => s.addTrack)
  const setTimelineScale = useEditorStore(s => s.setTimelineScale)
  const timelineScale = useEditorStore(s => s.timelineScale)
  const [snapEnabled, setSnapEnabled] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const { seek } = usePlayer()

  // Hold-to-zoom refs
  const zoomInIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const zoomInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoomOutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const zoomOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearZoomIn() {
    if (zoomInIntervalRef.current !== null) { clearInterval(zoomInIntervalRef.current); zoomInIntervalRef.current = null }
    if (zoomInTimeoutRef.current !== null) { clearTimeout(zoomInTimeoutRef.current); zoomInTimeoutRef.current = null }
  }
  function clearZoomOut() {
    if (zoomOutIntervalRef.current !== null) { clearInterval(zoomOutIntervalRef.current); zoomOutIntervalRef.current = null }
    if (zoomOutTimeoutRef.current !== null) { clearTimeout(zoomOutTimeoutRef.current); zoomOutTimeoutRef.current = null }
  }

  useEffect(() => () => { clearZoomIn(); clearZoomOut() }, [])

  const applyZoomIn = useCallback(() => {
    const current = useEditorStore.getState().timelineScale
    const next = Math.min(MAX_PIXELS_PER_SECOND, current + TIMELINE_ZOOM.STEP_BUTTON)
    setTimelineScale(next)
    if (next >= MAX_PIXELS_PER_SECOND) clearZoomIn()
  }, [setTimelineScale])

  const applyZoomOut = useCallback(() => {
    const current = useEditorStore.getState().timelineScale
    const next = Math.max(MIN_PIXELS_PER_SECOND, current - TIMELINE_ZOOM.STEP_BUTTON)
    setTimelineScale(next)
    if (next <= MIN_PIXELS_PER_SECOND) clearZoomOut()
  }, [setTimelineScale])

  function startZoomIn() {
    applyZoomIn()
    zoomInTimeoutRef.current = setTimeout(() => {
      zoomInIntervalRef.current = setInterval(applyZoomIn, 80)
    }, 400)
  }

  function startZoomOut() {
    applyZoomOut()
    zoomOutTimeoutRef.current = setTimeout(() => {
      zoomOutIntervalRef.current = setInterval(applyZoomOut, 80)
    }, 400)
  }

  // Compute zoom percentage from scale
  const zoomPercent = Math.round((timelineScale / 100) * 100)

  return (
    <>
      <div
        className="flex items-center shrink-0"
        style={{
          height: 36,
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.30)",
          padding: "0 8px",
          gap: 0,
          position: "sticky",
          top: 0,
          zIndex: 10,
          overflow: "hidden",
        }}
      >
        {/* Edit group */}
        <ToolbarBtn
          icon={<Scissors size={14} />}
          label="Cut at playhead"
          disabled={!selectedClipId}
          onClick={() => { if (selectedClipId) splitClip(selectedClipId, playhead) }}
        />
        <ToolbarBtn icon={<Copy size={14} />} label="Copy" onClick={copyClip} />
        <ToolbarBtn icon={<Clipboard size={14} />} label="Paste" onClick={pasteClip} />

        <GroupDivider />

        {/* History group */}
        <ToolbarBtn icon={<Undo2 size={14} />} label="Undo" onClick={undo} />
        <ToolbarBtn icon={<Redo2 size={14} />} label="Redo" onClick={redo} />

        <GroupDivider />

        {/* Zoom group */}
        <ToolbarBtn
          icon={<ZoomOut size={14} />}
          label="Zoom out"
          onPointerDown={startZoomOut}
          onPointerUp={clearZoomOut}
          onPointerLeave={clearZoomOut}
          onPointerCancel={clearZoomOut}
        />
        {/* Zoom percentage display */}
        <div
          style={{
            width: 44,
            textAlign: "center",
            fontSize: 10,
            fontFamily: "'Courier New', monospace",
            color: "var(--color-muted)",
            flexShrink: 0,
          }}
        >
          {zoomPercent}%
        </div>
        <ToolbarBtn
          icon={<ZoomIn size={14} />}
          label="Zoom in"
          onPointerDown={startZoomIn}
          onPointerUp={clearZoomIn}
          onPointerLeave={clearZoomIn}
          onPointerCancel={clearZoomIn}
        />
        <ToolbarBtn
          icon={<Maximize2 size={14} />}
          label="Fit to screen"
          onClick={() => seek(0)}
        />

        <GroupDivider />

        {/* Snap toggle */}
        <ToolbarBtn
          icon={<Magnet size={14} />}
          label={snapEnabled ? "Disable snap" : "Enable snap"}
          snapOn={snapEnabled}
          onClick={() => setSnapEnabled(v => !v)}
        />

        <GroupDivider />

        {/* Track buttons */}
        <TrackBtn
          icon={<Film size={14} />}
          label="+ Video Track"
          onClick={() => addTrack("video")}
        />
        <TrackBtn
          icon={<Music size={14} />}
          label="+ Audio Track"
          onClick={() => addTrack("audio")}
        />

        <div style={{ flex: 1 }} />

        {/* Help */}
        <ToolbarBtn
          icon={<HelpCircle size={14} />}
          label="Keyboard shortcuts"
          onClick={() => setShowShortcuts(true)}
        />
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  )
}
