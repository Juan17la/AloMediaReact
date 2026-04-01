import type { VideoClip } from "../../project/projectTypes"
import { CLIP_EPSILON } from "../../utils/time"
import { applyColorAdjustmentsToEl } from "../render/transformUtils"
import { resolveCanonicalTransitionType } from "../../engine/transitionRegistry"

export interface TransitionSwapMetadata {
    type: string
    duration: number
}

type PreviewTransitionType =
    | "fade"
    | "wipeleft"
    | "wiperight"
    | "slideleft"
    | "slideright"
    | "circlecrop"
    | "distance"

function normalizePreviewTransitionType(type: string | undefined): PreviewTransitionType {
    return resolveCanonicalTransitionType(type).entry.previewMapping.renderer as PreviewTransitionType
}

function clearTransitionStyles(outgoingEl: HTMLVideoElement, incomingEl: HTMLVideoElement): void {
    outgoingEl.style.transition = ""
    incomingEl.style.transition = ""
    outgoingEl.style.willChange = "transform"
    incomingEl.style.willChange = "transform"
    outgoingEl.style.clipPath = ""
    incomingEl.style.clipPath = ""
    outgoingEl.style.removeProperty("translate")
    incomingEl.style.removeProperty("translate")
    outgoingEl.style.removeProperty("scale")
    incomingEl.style.removeProperty("scale")
    outgoingEl.style.filter = ""
    incomingEl.style.filter = ""
    outgoingEl.style.zIndex = ""
    incomingEl.style.zIndex = ""
}

interface RunTransitionApproximationArgs {
    outgoingEl: HTMLVideoElement
    incomingEl: HTMLVideoElement
    nextClip: VideoClip
    transition: TransitionSwapMetadata | undefined
    existingCleanupTimeout: ReturnType<typeof setTimeout> | null
}

export function runTransitionApproximation({
    outgoingEl,
    incomingEl,
    nextClip,
    transition,
    existingCleanupTimeout,
}: RunTransitionApproximationArgs): ReturnType<typeof setTimeout> | null {
    if (!transition || transition.duration <= CLIP_EPSILON) {
        outgoingEl.style.opacity = "0"
        incomingEl.style.opacity = "1"
        clearTransitionStyles(outgoingEl, incomingEl)
        applyColorAdjustmentsToEl(incomingEl, nextClip.colorAdjustments)
        return null
    }

    if (existingCleanupTimeout) {
        clearTimeout(existingCleanupTimeout)
    }

    const duration = Math.max(0.08, transition.duration)
    const easing = "cubic-bezier(0.25, 1, 0.5, 1)"
    const transitionCss = `${duration}s ${easing}`
    const t = normalizePreviewTransitionType(transition.type)

    outgoingEl.style.transition = "none"
    incomingEl.style.transition = "none"
    outgoingEl.style.willChange = "opacity, clip-path, translate, scale, filter"
    incomingEl.style.willChange = "opacity, clip-path, translate, scale, filter"
    outgoingEl.style.clipPath = ""
    incomingEl.style.clipPath = ""
    outgoingEl.style.removeProperty("translate")
    incomingEl.style.removeProperty("translate")
    outgoingEl.style.removeProperty("scale")
    incomingEl.style.removeProperty("scale")
    outgoingEl.style.filter = ""
    incomingEl.style.filter = ""
    outgoingEl.style.zIndex = "1"
    incomingEl.style.zIndex = "2"
    outgoingEl.style.opacity = "1"
    incomingEl.style.opacity = "0" // always hidden until the rAF commits initial state

    requestAnimationFrame(() => {

        // opacity and spatial properties (clip-path / translate) are written in
        // the same synchronous block, so the browser commits them together.
        // A forced reflow after this block guarantees they are all applied
        // before the CSS transition is enabled – no intermediate flash possible.
        switch (t) {
            case "wipeleft":
                incomingEl.style.opacity = "1"
                incomingEl.style.clipPath = "inset(0 100% 0 0)"
                outgoingEl.style.scale = "1"
                break
            case "wiperight":
                incomingEl.style.opacity = "1"
                incomingEl.style.clipPath = "inset(0 0 0 100%)"
                outgoingEl.style.scale = "1"
                break
            case "slideleft":
                incomingEl.style.opacity = "1"
                incomingEl.style.setProperty("translate", "100% 0")
                outgoingEl.style.setProperty("translate", "0 0")
                outgoingEl.style.scale = "1"
                break
            case "slideright":
                incomingEl.style.opacity = "1"
                incomingEl.style.setProperty("translate", "-100% 0")
                outgoingEl.style.setProperty("translate", "0 0")
                outgoingEl.style.scale = "1"
                break
            case "circlecrop":
                incomingEl.style.opacity = "1"
                incomingEl.style.clipPath = "circle(0% at 50% 50%)"
                break
            case "distance":
                // Intentionally keep opacity at 0 — we fade + scale-up simultaneously
                incomingEl.style.scale = "0.5"
                break
            // fade: incoming stays at opacity:0
            // set in Phase 1; Phase 2B will transition it to 1.
        }

        void incomingEl.offsetWidth

        const transitionValue = `opacity ${transitionCss}, clip-path ${transitionCss}, translate ${transitionCss}, scale ${transitionCss}, filter ${transitionCss}`
        outgoingEl.style.transition = transitionValue
        incomingEl.style.transition = transitionValue

        switch (t) {
            case "wipeleft":
            case "wiperight":
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "1.05"
                incomingEl.style.clipPath = "inset(0 0 0 0)"
                // incomingEl opacity already 1 from Phase 2A, no change needed
                break
            case "slideleft":
                outgoingEl.style.setProperty("translate", "-100% 0")
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "0.95"
                incomingEl.style.setProperty("translate", "0 0")
                // incomingEl opacity already 1 from Phase 2A
                break
            case "slideright":
                outgoingEl.style.setProperty("translate", "100% 0")
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "0.95"
                incomingEl.style.setProperty("translate", "0 0")
                break
            case "circlecrop":
                outgoingEl.style.opacity = "0"
                incomingEl.style.clipPath = "circle(100% at 50% 50%)"
                // incomingEl opacity already 1 from Phase 2A
                break
            case "distance":
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "2"
                incomingEl.style.opacity = "1"
                incomingEl.style.scale = "1"
                break
            case "fade":
            default:
                outgoingEl.style.opacity = "0"
                incomingEl.style.opacity = "1"
                break
        }
    })

    return setTimeout(() => {
        clearTransitionStyles(outgoingEl, incomingEl)
        outgoingEl.style.opacity = "0"
        incomingEl.style.opacity = "1"
        applyColorAdjustmentsToEl(incomingEl, nextClip.colorAdjustments)
    }, Math.ceil(duration * 1000) + 50)
}