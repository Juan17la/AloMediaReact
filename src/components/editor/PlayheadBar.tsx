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
      className="sticky top-0 z-30 h-6 shrink-0 border-b border-b-white/8 cursor-pointer select-none bg-white/3"
      style={{ minWidth: totalWidth }}
    >
      {ticks.map(({ t, isMajor }) => (
        <div
          key={t}
          className="absolute top-0 flex flex-col items-start pointer-events-none"
          style={{ left: TRACK_HEADER_WIDTH + timeToPx(t, timelineScale) }}
        >
          {/* Tick mark */}
          <div
            className={`w-px bg-white/15 ${isMajor ? "opacity-100" : "opacity-50"}`}
            style={{ height: isMajor ? 10 : 5 }}
          />
          {isMajor && (
            <span className="text-[10px] font-mono text-white/35 tracking-[0.03em] ml-0.5 leading-none">
              {formatTimecode(t)}
            </span>
          )}
        </div>
      ))}

      {/* Playhead handle — 8px circle at ruler */}
      <div
        className="absolute w-2 h-2 bg-accent-red rounded-full cursor-ew-resize z-20 pointer-events-none"
        style={{ left: TRACK_HEADER_WIDTH + playheadLeft - 4, top: 8 }}
      />
    </div>
  )
}
