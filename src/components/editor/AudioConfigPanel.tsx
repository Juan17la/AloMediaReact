import { Volume2, VolumeX } from "lucide-react"
import type { AudioConfig } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { InspectorSliderRow } from "../ui/InspectorSliderRow"

// Glass card constant
const glassCard =
  "w-full bg-white/[0.03] border border-white/[0.07] rounded-lg p-3 mb-3"

// Section label constant
const sectionLabel =
  "text-[11px] font-semibold tracking-[0.06em] uppercase text-white/40"

// Mute button styling
const muteButtonBase =
  "bg-transparent border-none rounded-md p-1.5 transition-[color,background] duration-120 cursor-pointer flex items-center"

const muteButtonActive =
  "text-[var(--color-accent-red)]"

const muteButtonInactive =
  "text-white/55 hover:text-white/80"

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
    <div className={glassCard}>
      {/* Section header */}
      <div className="flex items-center mb-3">
        <span className={sectionLabel}>
          Audio Configuration
        </span>
      </div>

      {/* Mute row */}
      <div className="h-7 flex items-center justify-between gap-3 mb-2.5">
        <span className="text-xs text-white/50">Mute</span>
        <button
          onClick={() => set("muted", !config.muted)}
          aria-label={config.muted ? "Unmute" : "Mute"}
          title={config.muted ? "Unmute" : "Mute"}
          className={[muteButtonBase, config.muted ? muteButtonActive : muteButtonInactive].join(" ")}
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
