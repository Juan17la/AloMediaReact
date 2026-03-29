import type { ColorAdjustments } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { InspectorSliderRow } from "../ui/InspectorSliderRow"

// Glass card constant
const glassCard =
  "w-full bg-white/[0.03] border border-white/[0.07] rounded-lg p-3 mb-3"

// Section label constant
const sectionLabel =
  "text-[11px] font-semibold tracking-[0.06em] uppercase text-white/40"

function getStepDecimals(step: number): number {
  const stepString = step.toString()
  const decimalIndex = stepString.indexOf(".")
  return decimalIndex === -1 ? 0 : stepString.length - decimalIndex - 1
}

interface ColorAdjustmentsPanelProps {
  clipId: string
}

export function ColorAdjustmentsPanel({ clipId }: ColorAdjustmentsPanelProps) {
  const updateClipColorAdjustments = useEditorStore(s => s.updateClipColorAdjustments)

  const adj = useEditorStore(s => {
    for (const track of s.project.tracks) {
      const clip = track.clips.find(c => c.id === clipId)
      if (clip && (clip.type === "video" || clip.type === "image")) {
        return clip.colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS
      }
    }
    return DEFAULT_COLOR_ADJUSTMENTS
  })

  function set(key: keyof ColorAdjustments, value: number) {
    updateClipColorAdjustments(clipId, { ...adj, [key]: value })
  }

  function reset(key: keyof ColorAdjustments) {
    updateClipColorAdjustments(clipId, { ...adj, [key]: DEFAULT_COLOR_ADJUSTMENTS[key] })
  }

  const sliders: Array<{
    key: keyof ColorAdjustments
    label: string
    min: number
    max: number
    step: number
  }> = [
      { key: "brightness", label: "Brightness", min: -1, max: 1, step: 0.01 },
      { key: "contrast", label: "Contrast", min: -1, max: 1, step: 0.01 },
      { key: "saturation", label: "Saturation", min: 0, max: 3, step: 0.01 },
      { key: "gamma", label: "Gamma", min: 0.1, max: 10, step: 0.1 },
      { key: "exposure", label: "Exposure", min: -3, max: 3, step: 0.1 },
      { key: "shadow", label: "Shadow", min: -1, max: 1, step: 0.01 },
      { key: "definition", label: "Definition", min: -1, max: 1, step: 0.01 },
    ]

  return (
    <div className={glassCard}>
      {/* Section header */}
      <div className="flex items-center mb-3">
        <span className={sectionLabel}>
          Color Adjustments
        </span>
      </div>

      <div className="flex flex-col">
        {sliders.map(s => (
          <InspectorSliderRow
            key={s.key}
            label={s.label}
            value={(adj[s.key] as number) ?? DEFAULT_COLOR_ADJUSTMENTS[s.key] ?? 0}
            min={s.min}
            max={s.max}
            step={s.step}
            defaultValue={DEFAULT_COLOR_ADJUSTMENTS[s.key] as number ?? 0}
            formatDisplay={value => value.toFixed(getStepDecimals(s.step))}
            onChange={v => set(s.key, v)}
            onReset={() => reset(s.key)}
          />
        ))}
      </div>
    </div>
  )
}
