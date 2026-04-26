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

// Slider row container
const sliderRowContainer =
  "flex flex-col editor-transition mb-2.5 gap-1"

const sliderRowDisabled =
  "opacity-40 pointer-events-none"

const sliderRowEnabled =
  "opacity-100"

// Label styling
const labelRow =
  "flex justify-between items-center"

const labelText =
    "text-xs text-muted select-none"

// Slider and input wrapper
const sliderInputWrapper =
  "flex items-center gap-2"

const sliderFlex =
  "flex-1 flex items-center"

// Input styling
const inputValue =
    "w-9 h-5 bg-dark border border-dark-border rounded-md px-1 text-[10px] font-mono text-right text-accent-white placeholder:text-muted-light focus:border-[var(--color-accent-red)]/55 focus:ring-2 focus:ring-[var(--color-accent-red)]/12 transition-all duration-150 box-border outline-none"

// Reset button styling
const resetButtonBase =
  "p-1 rounded-sm editor-transition group"

const resetButtonActive =
    "opacity-60 hover:opacity-100 hover:bg-dark-card cursor-pointer"

const resetButtonDisabled =
  "opacity-20 cursor-default"

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
            className={[sliderRowContainer, disabled ? sliderRowDisabled : sliderRowEnabled, className].filter(Boolean).join(" ")}
        >
            {/* Label Row */}
            <div className={labelRow}>
                <span className={labelText}>
                    {label}
                </span>
            </div>

            <div className={sliderInputWrapper}>
                {/* The Slider */}
                <div className={sliderFlex}>
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
                    className={inputValue}
                />

                {/* Reset Button */}
                <button
                    onClick={onReset}
                    disabled={isDefault}
                    title={resetTitle}
                    className={[resetButtonBase, isDefault ? resetButtonDisabled : resetButtonActive].join(" ")}
                    aria-label={resetAriaLabel ?? `Reset ${label} to default`}
                >
                    <RotateCcw size={10} className={`transform ${isDefault ? "" : "group-hover:-rotate-45 transition-transform"}`} />
                </button>
            </div>
        </div>
    );
}