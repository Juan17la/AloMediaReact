import { useCallback, useEffect, useRef, useState } from "react"
import {
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SquareSplitHorizontal,
  Magnet,
  Film,
  Music,
  Type,
  Link2,
  Unlink2,
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
import { DEFAULT_TEXT_STYLE, DEFAULT_TEXT_TRANSFORM } from "../../constants/textStyle"
import { generateId } from "../../utils/id"
import type { TextClip } from "../../project/projectTypes"

const SHORTCUTS = [
  { keys: "Ctrl+Z",          action: "Undo" },
  { keys: "Ctrl+Y",          action: "Redo" },
  { keys: "Ctrl+C",          action: "Copy selected clip" },
  { keys: "Ctrl+V",          action: "Paste clip" },
  { keys: "Ctrl+X",          action: "Cut selected clip" },
  { keys: "Ctrl+G",          action: "Group selected clips" },
  { keys: "Ctrl+Shift+G",    action: "Ungroup selected clips" },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65"
      style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-panel w-130">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold tracking-[-0.01em] text-white/92">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="flex items-center bg-transparent border-0 rounded-md p-1.5 text-white/55 cursor-pointer transition-[color,background] duration-100 hover:text-white/90 hover:bg-white/7"
          >
            <X size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          {[left, right].map((col, ci) => (
            <div key={ci} className="flex flex-col gap-0.5">
              {col.map(({ keys, action }) => (
                <div key={keys} className="flex items-center justify-between py-0.5">
                  <span className="text-[13px] text-white/80">{action}</span>
                  <kbd className="text-[10px] font-mono bg-black/30 border border-white/8 rounded-md px-2 py-0.5 text-white/60 ml-3 shrink-0">
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
  const btnClass = [
    "flex items-center justify-center w-7 h-7 shrink-0 rounded-md border-0 transition-[background-color,color] duration-100",
    disabled
      ? "opacity-35 cursor-not-allowed text-dark-border-light"
      : snapOn || active
        ? "bg-[rgba(192,57,43,0.12)] text-accent-red cursor-pointer"
        : "bg-transparent text-white/55 hover:bg-white/7 hover:text-white/90 cursor-pointer",
  ].join(" ")

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={() => onPointerLeave?.()}
      onPointerCancel={onPointerCancel}
      className={btnClass}
    >
      <span className="flex items-center w-3.5 h-3.5">
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
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="flex items-center gap-1.25 h-7 px-2 shrink-0 rounded-md border-0 text-[10px] font-semibold tracking-[0.04em] text-muted-light hover:bg-white/7 hover:text-accent-red cursor-pointer transition-[background-color,color] duration-100 font-[inherit]"
    >
      <span className="flex items-center w-3.5 h-3.5">
        {icon}
      </span>
      {label}
    </button>
  )
}

// Vertical divider between groups
function GroupDivider() {
  return (
    <div className="w-px h-5 mx-1.5 bg-dark-border shrink-0" />
  )
}

export function Toolbar() {
  const selectedClipId = useEditorStore(s => s.selectedClipId)
  const selectedClipIds = useEditorStore(s => s.selectedClipIds)
  const selectedClip = useEditorStore(s => {
    if (!s.selectedClipId) return undefined
    for (const track of s.project.tracks) {
      const clip = track.clips.find(c => c.id === s.selectedClipId)
      if (clip) return clip
    }
    return undefined
  })
  const playhead = useEditorStore(s => s.playhead)
  const addClip = useEditorStore(s => s.addClip)
  const setSelectedClip = useEditorStore(s => s.setSelectedClip)
  const splitClip = useEditorStore(s => s.splitClip)
  const copyClip = useEditorStore(s => s.copyClip)
  const pasteClip = useEditorStore(s => s.pasteClip)
  const removeClip = useEditorStore(s => s.removeClip)
  const createGroupFromSelection = useEditorStore(s => s.createGroupFromSelection)
  const ungroupSelected = useEditorStore(s => s.ungroupSelected)
  const extractAudioFromClip = useEditorStore(s => s.extractAudioFromClip)
  const clipboard = useEditorStore(s => s.clipboard)
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

  function handleInsertText() {
    const videoTrack = addTrack("video")
    const duration = 5
    const newClip: TextClip = {
      id: generateId(),
      trackId: videoTrack.id,
      timelineStart: playhead,
      timelineEnd: playhead + duration,
      type: "text",
      content: "Add text",
      transform: { ...DEFAULT_TEXT_TRANSFORM },
      style: { ...DEFAULT_TEXT_STYLE },
    }
    addClip(newClip)
    setSelectedClip(newClip.id)
  }

  // Compute zoom percentage from scale
  const zoomPercent = Math.round((timelineScale / 100) * 100)
  const selectionTargets = selectedClipIds.length > 0 ? selectedClipIds : (selectedClipId ? [selectedClipId] : [])
  const canCopyOrCut = selectionTargets.length > 0
  const canPaste = !!clipboard
  const canDelete = selectionTargets.length > 0
  const canGroup = selectionTargets.length >= 2
  const canUngroup = selectionTargets.length > 0
  const canExtractAudio = selectedClip?.type === "video"

  return (
    <>
      <div
        className="flex items-center shrink-0 h-9 px-2 sticky top-0 z-10 overflow-hidden border-t border-t-white/9 border-b border-b-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.30)]"
        style={{
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
        }}
      >
        {/* Edit group */}
        <ToolbarBtn
          icon={<SquareSplitHorizontal size={18} />}
          label="Cut at playhead"
          disabled={!selectedClipId}
          onClick={() => { if (selectedClipId) splitClip(selectedClipId, playhead) }}
        />
        <ToolbarBtn
          icon={<Copy size={14} />}
          label="Copy"
          disabled={!canCopyOrCut}
          onClick={copyClip}
        />
        <ToolbarBtn
          icon={<Scissors size={14} />}
          label="Cut"
          disabled={!canCopyOrCut}
          onClick={() => {
            if (!canCopyOrCut) return
            copyClip()
            selectionTargets.forEach(id => removeClip(id))
          }}
        />
        <ToolbarBtn
          icon={<Clipboard size={14} />}
          label="Paste"
          disabled={!canPaste}
          onClick={pasteClip}
        />
        <ToolbarBtn
          icon={<Trash2 size={14} />}
          label="Delete"
          disabled={!canDelete}
          onClick={() => {
            if (!canDelete) return
            selectionTargets.forEach(id => removeClip(id))
          }}
        />
        <ToolbarBtn
          icon={<Link2 size={14} />}
          label="Group"
          disabled={!canGroup}
          onClick={() => { if (canGroup) createGroupFromSelection() }}
        />
        <ToolbarBtn
          icon={<Unlink2 size={14} />}
          label="Ungroup"
          disabled={!canUngroup}
          onClick={() => { if (canUngroup) ungroupSelected() }}
        />
        <ToolbarBtn
          icon={<Music size={14} />}
          label="Extract Audio"
          disabled={!canExtractAudio}
          onClick={() => {
            if (!selectedClipId || !canExtractAudio) return
            extractAudioFromClip(selectedClipId)
          }}
        />

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
        <div className="w-11 text-center text-[10px] font-mono text-muted shrink-0">
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
        <TrackBtn
          icon={<Type size={14} />}
          label="+ Text"
          onClick={handleInsertText}
        />

        <div className="flex-1" />

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
