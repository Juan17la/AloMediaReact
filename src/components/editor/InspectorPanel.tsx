import { useMemo, useState } from "react"
import { AudioConfigPanel } from "./AudioConfigPanel"
import { ColorAdjustmentsPanel } from "./ColorAdjustmentsPanel"
import { SpeedConfigPanel } from "./SpeedConfigPanel"
import { useEditorStore } from "../../store/editorStore"
import { TransitionInspector } from "./TransitionInspector"

type InspectorTab = "video" | "audio" | "speed" | "transitions"

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

export function InspectorPanel() {
  const selectedTransitionClipId = useEditorStore(s => s.selectedTransitionClipId)
  const clip = useEditorStore(s => {
    if (!s.selectedClipId) return null
    for (const track of s.project.tracks) {
      const candidate = track.clips.find(c => c.id === s.selectedClipId)
      if (candidate) return candidate
    }
    return null
  })

  const tabs = useMemo<InspectorTab[]>(() => {
    if (!clip) return []
    if (clip.type === "image") return ["video"]
    if (clip.type === "audio") return ["audio", "speed"]
    if (clip.type === "video") return ["video", "audio", "speed", "transitions"]
    return []
  }, [clip])

  const [activeTab, setActiveTab] = useState<InspectorTab>("video")
  const effectiveTab = tabs.includes(activeTab) ? activeTab : (tabs[0] ?? "video")

  if (selectedTransitionClipId) {
    return (
      <aside
        className="shrink-0 flex flex-col overflow-hidden w-70 backdrop-blur-2xl border-l border-l-white/8"
      >
        <div className="flex items-center shrink-0 h-7 px-4 border-b border-b-white/7">
          <span className={inspectorLabel}>Transition</span>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          <TransitionInspector />
        </div>
      </aside>
    )
  }

  if (!clip) return null
  const inspectorClip = clip

  function renderContent(): React.ReactNode {
    switch (effectiveTab) {
      case "video":
        return <ColorAdjustmentsPanel clipId={inspectorClip.id} />
      case "audio":
        return <AudioConfigPanel clipId={inspectorClip.id} />
      case "speed":
        return <SpeedConfigPanel clipId={inspectorClip.id} />
      case "transitions":
        return <TransitionInspector />
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
            const label = tab === "video" ? "Video" : tab === "audio" ? "Audio" : tab === "speed" ? "Speed" : "Trans."
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
