import type { ColorAdjustments } from "../project/projectTypes"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../constants/colorAdjustments"

// Per-parameter curve functions 
// Each function maps a raw user slider value to the effective adjustment value.
// All filter math lives here — components never compute curves directly.

/** Brightness: signed square.
 *  Compresses center travel so moderate positions stay gentle; extremes are strong. */
export function applyBrightnessCurve(v: number): number {
  return Math.sign(v) * v * v
}

/** Contrast: signed square root.
 *  Softens the low-to-mid range; FFmpeg contrast is already aggressive. */
export function applyContrastCurve(v: number): number {
  return Math.sign(v) * Math.sqrt(Math.abs(v))
}

/** Saturation: quadratic ease-in over [0, 3].
 *  Keeps desaturation gradual; full saturation peaks only near the right extreme.
 *  curve(0) = 0, curve(1) = 1 (neutral), curve(3) = 9 (extreme). */
export function applySaturationCurve(v: number): number {
  return v * v
}

/** Gamma: direct passthrough over [0.1, 10].
 *  The slider value is the FFmpeg gamma parameter directly; curve(1) = 1 (neutral). */
export function applyGammaCurve(v: number): number {
  return v
}

/** Shadow: signed cube.
 *  Subtle at moderate values, only strong when the user explicitly pushes extremes. */
export function applyShadowCurve(v: number): number {
  return v * v * v
}

/** Definition: linear passthrough.
 *  The unsharp mask luma_amount is already perceptually linear. */
export function applyDefinitionCurve(v: number): number {
  return v
}

// FFmpeg filter builders 

/**
 * Builds an FFmpeg `eq` filter string for brightness, contrast, saturation, gamma,
 * and exposure. Returns null when all values are at their defaults.
 *
 * Curve mapping applied before FFmpeg values:
 *  - brightness: signed-square curve; exposure EV folded in after
 *  - contrast:   signed-sqrt curve; then mapped to FFmpeg log scale 10^(x*3)
 *  - saturation: quadratic ease-in curve
 *  - gamma:      logarithmic remap
 */
export function buildEqFilter(adj: ColorAdjustments): string | null {
  const d = DEFAULT_COLOR_ADJUSTMENTS
  const exposure = adj.exposure ?? d.exposure
  const rawBrightness = adj.brightness ?? d.brightness
  const mappedBrightness = applyBrightnessCurve(rawBrightness)
  // Align with CSS preview: CSS brightness is multiplicative (1=neutral).
  // Convert to FFmpeg eq=brightness additive scale (-1..1, 0=neutral).
  const cssBrightness = (mappedBrightness + 1) * Math.pow(2, exposure)
  const combinedBrightness = Math.max(-1, Math.min(1, cssBrightness - 1))

  const parts: string[] = []

  if (rawBrightness !== d.brightness || exposure !== d.exposure) {
    parts.push(`brightness=${combinedBrightness.toFixed(4)}`)
  }

  const rawContrast = adj.contrast ?? d.contrast
  if (rawContrast !== d.contrast) {
    const mappedContrast = applyContrastCurve(rawContrast)
    // Align with CSS preview: CSS contrast is multiplicative (1=neutral).
    // FFmpeg eq=contrast is also multiplicative (1=neutral).
    const ffmpegContrast = mappedContrast + 1
    parts.push(`contrast=${ffmpegContrast.toFixed(4)}`)
  }

  const rawSaturation = adj.saturation ?? d.saturation
  if (rawSaturation !== d.saturation) {
    const mappedSaturation = applySaturationCurve(rawSaturation)
    parts.push(`saturation=${mappedSaturation.toFixed(4)}`)
  }

  const rawGamma = adj.gamma ?? d.gamma
  if (rawGamma !== d.gamma) {
    const mappedGamma = applyGammaCurve(rawGamma)
    parts.push(`gamma=${mappedGamma.toFixed(4)}`)
  }

  return parts.length > 0 ? `eq=${parts.join(":")}` : null
}

/**
 * Builds an FFmpeg `curves` filter string for shadow adjustment.
 * Returns null when shadow is at its default (0).
 *
 * Shadow: signed-cube curve applied; result mapped to a ±0.15 black-point shift.
 * Positive values lift the shadow floor; negative values crush it.
 */
export function buildShadowFilter(adj: ColorAdjustments): string | null {
  const rawShadow = adj.shadow ?? DEFAULT_COLOR_ADJUSTMENTS.shadow ?? 0
  if (rawShadow === 0) return null
  const mapped = applyShadowCurve(rawShadow)
  const amount = mapped * 0.15
  if (amount > 0) {
    return `curves=all='0/${amount.toFixed(4)} 1/1'`
  } else {
    const crush = Math.abs(amount)
    return `curves=all='0/0 ${crush.toFixed(4)}/0 1/1'`
  }
}

/**
 * Builds an FFmpeg `unsharp` filter string for definition (local contrast/clarity).
 * Returns null when definition is at its default (0).
 *
 * Definition: linear passthrough; user ±1.0 maps to luma_amount ±1.5.
 */
export function buildDefinitionFilter(adj: ColorAdjustments): string | null {
  const rawDef = adj.definition ?? DEFAULT_COLOR_ADJUSTMENTS.definition ?? 0
  if (rawDef === 0) return null
  const lumaAmount = applyDefinitionCurve(rawDef) * 1.5
  return `unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=${lumaAmount.toFixed(4)}`
}

/**
 * Builds a CSS filter string for real-time canvas preview.
 *
 * Per-parameter curve corrections are applied before computing CSS values:
 *  - brightness: signed-square curve; EV exposure folded in after
 *  - contrast:   signed-sqrt curve; then shifted to CSS neutral (1.0)
 *  - saturation: quadratic ease-in curve
 *  - gamma, shadow, definition: no CSS equivalent — omitted from preview
 */
export function buildCssFilter(adj: ColorAdjustments): string {
  const d = DEFAULT_COLOR_ADJUSTMENTS

  // Skip all computation when every parameter is at its neutral default.
  if (
    (adj.brightness ?? d.brightness) === d.brightness &&
    (adj.contrast ?? d.contrast) === d.contrast &&
    (adj.saturation ?? d.saturation) === d.saturation &&
    (adj.exposure ?? d.exposure) === d.exposure
  ) {
    return ''
  }

  const exposure = adj.exposure ?? d.exposure
  const rawBrightness = adj.brightness ?? d.brightness
  const mappedBrightness = applyBrightnessCurve(rawBrightness)
  // CSS brightness(1) = neutral; map corrected [-1,1] + EV to a multiplicative factor
  const cssBrightness = (mappedBrightness + 1) * Math.pow(2, exposure)

  const rawContrast = adj.contrast ?? d.contrast
  const mappedContrast = applyContrastCurve(rawContrast)
  // CSS contrast(1) = neutral; shift corrected value by +1
  const cssContrast = mappedContrast + 1

  const rawSaturation = adj.saturation ?? d.saturation
  const cssSaturation = applySaturationCurve(rawSaturation)

  return [
    `brightness(${cssBrightness.toFixed(3)})`,
    `contrast(${cssContrast.toFixed(3)})`,
    `saturate(${cssSaturation.toFixed(3)})`,
  ].join(" ")
}
