import { Volume2, VolumeX } from "lucide-react"
import type { AudioConfig } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { InspectorSliderRow } from "../ui/InspectorSliderRow"

function formatBalance(v: number): string {
  if (Math.abs(v) <= 0.001) return "C"
  if (Math.abs(v - -1.0) <= 0.001) return "L"
  if (Math.abs(v - 1.0) <= 0.001) return "R"
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)
}

function parseVolumePercentInput(text: string): number | null {
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed)) return null
  return parsed / 100
}

interface AudioConfigPanelProps {
  clipId: string
}

export function AudioConfigPanel({ clipId }: AudioConfigPanelProps) {
  const updateClipAudioConfig = useEditorStore(s => s.updateClipAudioConfig)

  const config = useEditorStore(s => {
    for (const track of s.project.tracks) {
      const c = track.clips.find(c => c.id === clipId)
      if (c && (c.type === "video" || c.type === "audio")) {
        return (c as { audioConfig?: AudioConfig }).audioConfig ?? DEFAULT_AUDIO_CONFIG
      }
    }
    return DEFAULT_AUDIO_CONFIG
  })

  function set(key: keyof AudioConfig, value: number | boolean) {
    updateClipAudioConfig(clipId, { [key]: value })
  }

  function reset(key: keyof AudioConfig) {
    updateClipAudioConfig(clipId, { [key]: DEFAULT_AUDIO_CONFIG[key] })
  }

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
          marginBottom: 4,
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
          Audio Configuration
        </span>
      </div>

      {/* Mute row */}
      <div
        style={{
          height: 28,
          padding: "0 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--color-muted-light)" }}>Mute</span>
        <button
          onClick={() => set("muted", !config.muted)}
          aria-label={config.muted ? "Unmute" : "Mute"}
          title={config.muted ? "Unmute" : "Mute"}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          {config.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      <InspectorSliderRow
        label="Volume"
        value={config.volume}
        min={0}
        max={2}
        step={0.01}
        defaultValue={DEFAULT_AUDIO_CONFIG.volume}
        formatDisplay={value => `${Math.round(value * 100)}%`}
        formatInput={value => Math.round(value * 100).toString()}
        parseInput={parseVolumePercentInput}
        onChange={v => set("volume", v)}
        onReset={() => reset("volume")}
        disabled={config.muted}
      />

      <InspectorSliderRow
        label="Fade In"
        value={config.fadeInDuration}
        min={0}
        max={10}
        step={0.1}
        defaultValue={DEFAULT_AUDIO_CONFIG.fadeInDuration}
        formatDisplay={value => `${value.toFixed(1)}s`}
        formatInput={value => value.toFixed(1)}
        onChange={v => set("fadeInDuration", v)}
        onReset={() => reset("fadeInDuration")}
      />

      <InspectorSliderRow
        label="Fade Out"
        value={config.fadeOutDuration}
        min={0}
        max={10}
        step={0.1}
        defaultValue={DEFAULT_AUDIO_CONFIG.fadeOutDuration}
        formatDisplay={value => `${value.toFixed(1)}s`}
        formatInput={value => value.toFixed(1)}
        onChange={v => set("fadeOutDuration", v)}
        onReset={() => reset("fadeOutDuration")}
      />

      <InspectorSliderRow
        label="Balance"
        value={config.balance}
        min={-1}
        max={1}
        step={0.01}
        defaultValue={DEFAULT_AUDIO_CONFIG.balance}
        formatDisplay={formatBalance}
        formatInput={value => value.toFixed(2)}
        onChange={v => set("balance", v)}
        onReset={() => reset("balance")}
      />
    </div>
  )
}
