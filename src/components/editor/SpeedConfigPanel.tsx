import { useEditorStore } from "../../store/editorStore"
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from "../../constants/speed"
import { InspectorSliderRow } from "../ui/InspectorSliderRow"

// Glass card constant
const glassCard =
    "w-full bg-dark border border-dark-border rounded-lg p-3 mb-3"

// Section label constant
const sectionLabel =
    "text-[11px] font-semibold tracking-[0.06em] uppercase text-muted"

// Speed range labels
const speedRangeLabel =
  "text-[9px] text-[var(--color-muted)]"

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

interface SpeedConfigPanelProps {
    clipId: string
}

export function SpeedConfigPanel({ clipId }: SpeedConfigPanelProps) {
    const setClipSpeed = useEditorStore(s => s.setClipSpeed)

    const speed = useEditorStore(s => {
        for (const track of s.project.tracks) {
            const c = track.clips.find(c => c.id === clipId)
            if (c && (c.type === "video" || c.type === "audio")) {
                return c.speed ?? DEFAULT_SPEED
            }
        }
        return DEFAULT_SPEED
    })

    const speedPosition = speedToPosition(Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed)))

    function handleSpeedPositionChange(position: number) {
        const computedSpeed = positionToSpeed(position)
        setClipSpeed(clipId, quantizeSpeed(computedSpeed))
    }

    return (
        <div className={glassCard}>
            {/* Section header */}
            <div className="flex items-center mb-3">
                <span className={sectionLabel}>
                    Speed
                </span>
            </div>

            {/* Min/max labels */}
            <div className="flex justify-between px-2 pb-1 mb-2">
                <span className={speedRangeLabel}>{MIN_SPEED.toFixed(1)}×</span>
                <span className={speedRangeLabel}>{MAX_SPEED.toFixed(1)}×</span>
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
                onChange={nextSpeed => setClipSpeed(clipId, quantizeSpeed(nextSpeed))}
                onReset={() => setClipSpeed(clipId, DEFAULT_SPEED)}
                formatDisplay={currentSpeed => `${currentSpeed.toFixed(2)}×`}
                formatInput={currentSpeed => currentSpeed.toFixed(2)}
                resetAriaLabel="Reset speed to default"
            />
        </div>
    )
}