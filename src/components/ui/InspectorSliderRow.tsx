import { RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import { RangeSlider } from "./RangeSlider"

interface InspectorSliderRowProps {
    label: string
    value: number
    min: number
    max: number
    step: number
    defaultValue: number
    onChange: (value: number) => void
    onReset: () => void
    disabled?: boolean
    className?: string
    sliderValue?: number
    sliderMin?: number
    sliderMax?: number
    sliderStep?: number
    onSliderChange?: (value: number) => void
    formatDisplay?: (value: number) => string
    formatInput?: (value: number) => string
    parseInput?: (text: string) => number | null
    resetTitle?: string
    resetAriaLabel?: string
    defaultTolerance?: number
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function getStepDecimals(step: number): number {
    const stepString = step.toString()
    const decimalIndex = stepString.indexOf(".")
    return decimalIndex === -1 ? 0 : stepString.length - decimalIndex - 1
}

function applyStep(value: number, min: number, step: number): number {
    if (step <= 0) return value
    const decimals = getStepDecimals(step)
    const stepped = min + Math.round((value - min) / step) * step
    return Number(stepped.toFixed(decimals))
}

function defaultParseInput(text: string): number | null {
    const parsed = Number.parseFloat(text)
    return Number.isFinite(parsed) ? parsed : null
}

export function InspectorSliderRow({
    label,
    value,
    min,
    max,
    step,
    defaultValue,
    onChange,
    onReset,
    disabled = false,
    className = "",
    sliderValue,
    sliderMin,
    sliderMax,
    sliderStep,
    onSliderChange,
    formatDisplay,
    formatInput,
    parseInput,
    resetTitle = "Reset to default",
    resetAriaLabel,
    defaultTolerance = 0.001,
}: InspectorSliderRowProps) {
    const effectiveSliderValue = sliderValue ?? value;
    const effectiveSliderMin = sliderMin ?? min;
    const effectiveSliderMax = sliderMax ?? max;
    const effectiveSliderStep = sliderStep ?? step;

    const defaultInputFormatter = useMemo(() => {
        const decimals = getStepDecimals(step);
        return (current: number) => current.toFixed(decimals);
    }, [step]);

    const toInput = formatInput ?? defaultInputFormatter;
    const toDisplay = formatDisplay ?? toInput;
    const inputParser = parseInput ?? defaultParseInput;

    const [draftValue, setDraftValue] = useState(() => toInput(value));
    const [isEditing, setIsEditing] = useState(false);

    const isDefault = Math.abs(value - defaultValue) <= defaultTolerance;

    return (
        <div
            className={`flex flex-col editor-transition ${disabled ? "opacity-40 pointer-events-none" : "opacity-100"} ${className}`}
            style={{ marginBottom: 10, gap: 4 }}
        >
            {/* Label Row */}
            <div className="flex justify-between items-center">
                <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.50)" }} className="select-none">
                    {label}
                </span>
            </div>

            <div className="flex items-center gap-2">
                {/* The Slider */}
                <div className="flex-1 flex items-center">
                    <RangeSlider
                        value={effectiveSliderValue}
                        min={effectiveSliderMin}
                        max={effectiveSliderMax}
                        step={effectiveSliderStep}
                        label={label}
                        onChange={onSliderChange ?? onChange}
                        className="w-full"
                    />
                </div>

                {/* The Value Input */}
                <input
                    type="text"
                    value={isEditing ? draftValue : toDisplay(value)}
                    aria-label={`${label} value`}
                    onFocus={() => {
                        setDraftValue(toInput(value));
                        setIsEditing(true);
                    }}
                    onChange={event => setDraftValue(event.target.value)}
                    onBlur={() => {
                        const parsed = inputParser(draftValue.trim());
                        if (parsed !== null) {
                            const clamped = clamp(parsed, min, max);
                            const normalized = applyStep(clamped, min, step);
                            onChange(normalized);
                            setDraftValue(toInput(normalized));
                        } else {
                            setDraftValue(toInput(value));
                        }
                        setIsEditing(false);
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                            setDraftValue(toInput(value));
                            setIsEditing(false);
                        }
                    }}
                    className="w-9 h-5 glass-input text-[10px] font-mono text-right px-1 outline-none"
                />

                {/* Reset Button */}
                <button
                    onClick={onReset}
                    disabled={isDefault}
                    title={resetTitle}
                    className={`p-1 rounded-sm editor-transition group ${isDefault ? "opacity-20 cursor-default" : "opacity-60 hover:opacity-100 hover:bg-white/5 cursor-pointer"}`}
                    aria-label={resetAriaLabel ?? `Reset ${label} to default`}
                >
                    <RotateCcw size={10} className={`transform ${isDefault ? "" : "group-hover:-rotate-45 transition-transform"}`} />
                </button>
            </div>
        </div>
    );
}