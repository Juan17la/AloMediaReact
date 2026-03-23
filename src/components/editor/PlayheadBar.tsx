import { useRef } from "react"
import { useEditorStore } from "../../store/editorStore"
import { usePlayer } from "../../hooks/usePlayer"
import { formatTimecode, timeToPx, pxToTime, TRACK_HEADER_WIDTH } from "../../utils/time"

interface PlayheadBarProps {
  totalWidth: number
  duration: number
  majorInterval: number
}

export function PlayheadBar({ totalWidth, duration, majorInterval }: PlayheadBarProps) {
  const playhead = useEditorStore(s => s.playhead)
  const timelineScale = useEditorStore(s => s.timelineScale)
  const { seek, pause } = usePlayer()

  const rulerRef = useRef<HTMLDivElement>(null)
  const playheadLeft = timeToPx(playhead, timelineScale)

  const minorInterval = majorInterval / 5
  const rulerEnd = duration + 10
  const tickCount = Math.ceil(rulerEnd / minorInterval) + 1
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const t = i * minorInterval
    const majorIndex = Math.round(t / majorInterval)
    const isMajor = Math.abs(t - (majorIndex * majorInterval)) < 0.0001
    return { t, isMajor }
  })

  function timeFromClientX(clientX: number): number {
    if (!rulerRef.current) return 0
    const rect = rulerRef.current.getBoundingClientRect()
    return Math.max(0, pxToTime(clientX - rect.left - TRACK_HEADER_WIDTH, timelineScale))
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    pause()

    seek(timeFromClientX(e.clientX))

    function onMove(ev: MouseEvent) {
      seek(timeFromClientX(ev.clientX))
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  return (
    <div
      ref={rulerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "relative",
        height: 24,
        minWidth: totalWidth,
        borderBottom: "1px solid var(--color-dark-border)",
        cursor: "pointer",
        userSelect: "none",
        flexShrink: 0,
        background: "var(--color-dark)",
      }}
    >
      {ticks.map(({ t, isMajor }) => (
        <div
          key={t}
          style={{
            position: "absolute",
            left: TRACK_HEADER_WIDTH + timeToPx(t, timelineScale),
            top: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            pointerEvents: "none",
          }}
        >
          {/* Tick mark */}
          <div
            style={{
              width: 1,
              height: isMajor ? 10 : 5,
              background: isMajor
                ? "var(--color-dark-border-light)"
                : "var(--color-dark-border-light)",
              opacity: isMajor ? 1 : 0.5,
            }}
          />
          {isMajor && (
            <span
              style={{
                fontSize: 9,
                fontFamily: "'Courier New', monospace",
                color: "var(--color-muted)",
                marginLeft: 2,
                lineHeight: 1,
              }}
            >
              {formatTimecode(t)}
            </span>
          )}
        </div>
      ))}

      {/* Playhead handle — 8px circle at ruler */}
      <div
        style={{
          position: "absolute",
          left: TRACK_HEADER_WIDTH + playheadLeft - 4,
          top: 8,
          width: 8,
          height: 8,
          background: "var(--color-accent-red)",
          borderRadius: "50%",
          cursor: "ew-resize",
          zIndex: 20,
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
