import { useMemo, useState } from "react"
import type { Clip } from "../../project/projectTypes"
import { AudioConfigPanel } from "./AudioConfigPanel"
import { ColorAdjustmentsPanel } from "./ColorAdjustmentsPanel"
import { SpeedConfigPanel } from "./SpeedConfigPanel"

type InspectorTab = "video" | "audio" | "speed"

interface InspectorPanelProps {
  clip: Clip
}

// Glass panel constant

// Inspector header label
const inspectorLabel =
  "text-[11px] font-semibold tracking-[0.06em] uppercase text-white/40"

// Tab styling
const tabBase =
  "h-full px-3.5 text-[11px] font-semibold bg-transparent border-0 border-b-2 rounded-none cursor-pointer transition-[color] duration-120"

const tabActive =
  "text-accent-white border-b-accent-red"

const tabInactive =
  "text-muted border-b-transparent"

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
        return <SpeedConfigPanel clipId={clip.id} />
      default:
        return null
    }
  }

  const showTabs = tabs.length > 1

  return (
    <aside
      className="shrink-0 flex flex-col overflow-hidden w-70 backdrop-blur-2xl border-l border-l-white/8"
    >
      {/* Panel header */}
      <div className={`flex items-center shrink-0 h-7 px-4 ${showTabs ? "" : "border-b border-b-white/7"}`}>
        <span className={inspectorLabel}>
          Inspector
        </span>
      </div>

      {showTabs && (
        <div className="flex shrink-0 h-8 border-b border-b-white/7">
          {tabs.map(tab => {
            const active = effectiveTab === tab
            const label = tab === "video" ? "Video" : tab === "audio" ? "Audio" : "Speed"
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  tabBase,
                  active ? tabActive : tabInactive,
                ].join(" ")}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      <div className="overflow-y-auto flex-1 p-3">
        {renderContent()}
      </div>
    </aside>
  )
}
