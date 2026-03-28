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
  const sanitized = text.replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(sanitized);

  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }
  return parsed / 100;
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
    <div className="w-full" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.07)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.40)",
          }}
        >
          Audio Configuration
        </span>
      </div>

      {/* Mute row */}
      <div
        style={{
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.50)" }}>Mute</span>
        <button
          onClick={() => set("muted", !config.muted)}
          aria-label={config.muted ? "Unmute" : "Mute"}
          title={config.muted ? "Unmute" : "Mute"}
          style={{
            background: "transparent",
            border: "none",
            borderRadius: 6,
            padding: 6,
            color: config.muted ? "var(--color-accent-red)" : "rgba(255, 255, 255, 0.55)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            transition: "color 120ms ease-out, background 120ms ease-out",
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
