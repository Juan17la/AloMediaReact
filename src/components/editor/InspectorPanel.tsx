import { useMemo, useState } from "react"
import type { Clip } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from "../../constants/speed"
import { InspectorSliderRow } from "../ui/InspectorSliderRow"
import { AudioConfigPanel } from "./AudioConfigPanel"
import { ColorAdjustmentsPanel } from "./ColorAdjustmentsPanel"

type InspectorTab = "video" | "audio" | "speed"

const SPEED_STEP = 0.05
const SPEED_LOG_DENOMINATOR = Math.log(MAX_SPEED) - Math.log(MIN_SPEED)

function positionToSpeed(position: number): number {
  return Math.exp(Math.log(MIN_SPEED) + position * SPEED_LOG_DENOMINATOR)
}

function speedToPosition(speed: number): number {
  return (Math.log(speed) - Math.log(MIN_SPEED)) / SPEED_LOG_DENOMINATOR
}

function quantizeSpeed(speed: number): number {
  const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed))
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(clamped / SPEED_STEP) * SPEED_STEP))
}

interface InspectorPanelProps {
  clip: Clip
}

export function InspectorPanel({ clip }: InspectorPanelProps) {
  const setClipSpeed = useEditorStore(s => s.setClipSpeed)

  const speed = useEditorStore(s => {
    for (const track of s.project.tracks) {
      const c = track.clips.find(c => c.id === clip.id)
      if (c && (c.type === "video" || c.type === "audio")) {
        return c.speed ?? DEFAULT_SPEED
      }
    }
    return DEFAULT_SPEED
  })

  const tabs = useMemo<InspectorTab[]>(() => {
    if (clip.type === "image") return ["video"]
    if (clip.type === "audio") return ["audio", "speed"]
    if (clip.type === "video") return ["video", "audio", "speed"]
    return []
  }, [clip.type])

  const [activeTab, setActiveTab] = useState<InspectorTab>(tabs[0] ?? "video")
  const effectiveTab = tabs.includes(activeTab) ? activeTab : (tabs[0] ?? "video")

  const speedPosition = speedToPosition(Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed)))

  function handleSpeedPositionChange(position: number) {
    const computedSpeed = positionToSpeed(position)
    setClipSpeed(clip.id, quantizeSpeed(computedSpeed))
  }

  function renderContent(): React.ReactNode {
    if (effectiveTab === "video") {
      return <ColorAdjustmentsPanel clipId={clip.id} />
    }

    if (effectiveTab === "audio") {
      return <AudioConfigPanel clipId={clip.id} />
    }

    // Speed tab
    return (
      <div className="w-full">
        {/* Section header */}
        <div
          style={{
            height: 24,
            background: "var(--color-dark)",
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--color-dark-border)",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
            }}
          >
            Speed
          </span>
        </div>

        {/* Min/max labels */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0 8px 4px",
          }}
        >
          <span style={{ fontSize: 9, color: "var(--color-muted)" }}>0.1×</span>
          <span style={{ fontSize: 9, color: "var(--color-muted)" }}>5.0×</span>
        </div>

        <InspectorSliderRow
          label="Playback Speed"
          value={speed}
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={SPEED_STEP}
          defaultValue={DEFAULT_SPEED}
          sliderValue={speedPosition}
          sliderMin={0}
          sliderMax={1}
          sliderStep={0.001}
          onSliderChange={handleSpeedPositionChange}
          onChange={nextSpeed => setClipSpeed(clip.id, quantizeSpeed(nextSpeed))}
          onReset={() => setClipSpeed(clip.id, DEFAULT_SPEED)}
          formatDisplay={currentSpeed => `${currentSpeed.toFixed(2)}×`}
          formatInput={currentSpeed => currentSpeed.toFixed(2)}
          resetAriaLabel="Reset speed to default"
        />
      </div>
    )
  }

  const showTabs = tabs.length > 1

  return (
    <aside
      className="shrink-0 flex flex-col overflow-hidden"
      style={{
        width: 280,
        background: "var(--color-dark-surface)",
        borderLeft: "1px solid var(--color-dark-border)",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 28,
          background: "var(--color-dark)",
          borderBottom: showTabs ? "none" : "1px solid var(--color-dark-border)",
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
          }}
        >
          Inspector
        </span>
      </div>

      {/* Tab bar */}
      {showTabs && (
        <div
          className="flex shrink-0"
          style={{
            height: 32,
            background: "var(--color-dark)",
            borderBottom: "1px solid var(--color-dark-border)",
          }}
        >
          {tabs.map(tab => {
            const active = effectiveTab === tab
            const label = tab === "video" ? "Video" : tab === "audio" ? "Audio" : "Speed"

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
                style={{
                  height: "100%",
                  padding: "0 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 0,
                  border: "none",
                  background: "transparent",
                  color: active ? "var(--color-accent-white)" : "var(--color-muted)",
                  borderBottom: active ? "2px solid var(--color-accent-red)" : "2px solid transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.02em",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      <div className="overflow-y-auto flex-1" style={{ padding: showTabs ? "8px 0" : "8px 0" }}>
        {renderContent()}
      </div>
    </aside>
  )
}
