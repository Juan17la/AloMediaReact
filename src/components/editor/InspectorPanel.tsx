import { useMemo, useState } from "react"
import type { Clip } from "../../project/projectTypes"
import { AudioConfigPanel } from "./AudioConfigPanel"
import { ColorAdjustmentsPanel } from "./ColorAdjustmentsPanel"
import { SpeedConfigPanel } from "./SpeedConfigPanel" // Import the new panel

type InspectorTab = "video" | "audio" | "speed"

interface InspectorPanelProps {
  clip: Clip
}

export function InspectorPanel({ clip }: InspectorPanelProps) {

  const tabs = useMemo<InspectorTab[]>(() => {
    if (clip.type === "image") return ["video"]
    if (clip.type === "audio") return ["audio", "speed"]
    if (clip.type === "video") return ["video", "audio", "speed"]
    return []
  }, [clip.type])

  const [activeTab, setActiveTab] = useState<InspectorTab>(tabs[0] ?? "video")
  const effectiveTab = tabs.includes(activeTab) ? activeTab : (tabs[0] ?? "video")

  function renderContent(): React.ReactNode {
    switch (effectiveTab) {
      case "video":
        return <ColorAdjustmentsPanel clipId={clip.id} />
      case "audio":
        return <AudioConfigPanel clipId={clip.id} />
      case "speed":
        return <SpeedConfigPanel clipId={clip.id} /> // Use the new component
      default:
        return null
    }
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
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted)" }}>
          Inspector
        </span>
      </div>

      {showTabs && (
        <div className="flex shrink-0" style={{ height: 32, background: "var(--color-dark)", borderBottom: "1px solid var(--color-dark-border)" }}>
          {tabs.map(tab => {
            const active = effectiveTab === tab
            const label = tab === "video" ? "Video" : tab === "audio" ? "Audio" : "Speed"
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  height: "100%",
                  padding: "0 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  background: "transparent",
                  color: active ? "var(--color-accent-white)" : "var(--color-muted)",
                  borderBottom: active ? "2px solid var(--color-accent-red)" : "2px solid transparent",
                  cursor: "pointer",
                  border: "none"
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      <div className="overflow-y-auto flex-1">
        {renderContent()}
      </div>
    </aside>
  )
}