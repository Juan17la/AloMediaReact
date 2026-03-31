import type { VideoClip } from "../../project/projectTypes"
import { CLIP_EPSILON } from "../../utils/time"
import { applyColorAdjustmentsToEl } from "../render/transformUtils"

export interface TransitionSwapMetadata {
    type: string
    duration: number
}

type PreviewTransitionType =
    | "fade"
    | "fadeblack"
    | "fadewhite"
    | "dissolve"
    | "wipeleft"
    | "wiperight"
    | "wipeup"
    | "wipedown"
    | "slideleft"
    | "slideright"
    | "slideup"
    | "slidedown"
    | "circlecrop"
    | "distance"

function normalizePreviewTransitionType(type: string | undefined): PreviewTransitionType {
    switch (type) {
        case "fadeblack":
        case "fadewhite":
        case "dissolve":
        case "wipeleft":
        case "wiperight":
        case "wipeup":
        case "wipedown":
        case "slideleft":
        case "slideright":
        case "slideup":
        case "slidedown":
        case "circlecrop":
        case "distance":
            return type
        default:
            return "fade"
    }
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
    // Use an easing curve instead of linear for a more cinematic feel
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
    incomingEl.style.opacity = "0"

    switch (t) {
        case "fadeblack": {
            outgoingEl.style.filter = "brightness(1)"
            incomingEl.style.filter = "brightness(0)"
            break
        }
        case "fadewhite": {
            outgoingEl.style.filter = "brightness(1)"
            incomingEl.style.filter = "brightness(2)"
            break
        }
        case "wipeleft": {
            incomingEl.style.opacity = "1"
            incomingEl.style.clipPath = "inset(0 100% 0 0)"
            outgoingEl.style.scale = "1"
            break
        }
        case "wiperight": {
            incomingEl.style.opacity = "1"
            incomingEl.style.clipPath = "inset(0 0 0 100%)"
            outgoingEl.style.scale = "1"
            break
        }
        case "wipeup": {
            incomingEl.style.opacity = "1"
            incomingEl.style.clipPath = "inset(100% 0 0 0)"
            outgoingEl.style.scale = "1"
            break
        }
        case "wipedown": {
            incomingEl.style.opacity = "1"
            incomingEl.style.clipPath = "inset(0 0 100% 0)"
            outgoingEl.style.scale = "1"
            break
        }
        case "slideleft": {
            incomingEl.style.opacity = "1"
            incomingEl.style.setProperty("translate", "100% 0")
            outgoingEl.style.setProperty("translate", "0 0")
            outgoingEl.style.scale = "1"
            break
        }
        case "slideright": {
            incomingEl.style.opacity = "1"
            incomingEl.style.setProperty("translate", "-100% 0")
            outgoingEl.style.setProperty("translate", "0 0")
            outgoingEl.style.scale = "1"
            break
        }
        case "slideup": {
            incomingEl.style.opacity = "1"
            incomingEl.style.setProperty("translate", "0 100%")
            outgoingEl.style.setProperty("translate", "0 0")
            outgoingEl.style.scale = "1"
            break
        }
        case "slidedown": {
            incomingEl.style.opacity = "1"
            incomingEl.style.setProperty("translate", "0 -100%")
            outgoingEl.style.setProperty("translate", "0 0")
            outgoingEl.style.scale = "1"
            break
        }
        case "circlecrop": {
            incomingEl.style.opacity = "1"
            incomingEl.style.clipPath = "circle(0% at 50% 50%)"
            break
        }
        case "distance": {
            incomingEl.style.opacity = "0"
            incomingEl.style.scale = "0.5"
            outgoingEl.style.scale = "1"
            break
        }
        case "dissolve":
        case "fade":
        default:
            break
    }

    requestAnimationFrame(() => {
        outgoingEl.style.transition = `opacity ${transitionCss}, clip-path ${transitionCss}, translate ${transitionCss}, scale ${transitionCss}, filter ${transitionCss}`
        incomingEl.style.transition = `opacity ${transitionCss}, clip-path ${transitionCss}, translate ${transitionCss}, scale ${transitionCss}, filter ${transitionCss}`

        switch (t) {
            case "fadeblack": {
                outgoingEl.style.opacity = "0"
                outgoingEl.style.filter = "brightness(0)"
                incomingEl.style.opacity = "1"
                incomingEl.style.filter = "brightness(1)"
                break
            }
            case "fadewhite": {
                outgoingEl.style.opacity = "0"
                outgoingEl.style.filter = "brightness(2)"
                incomingEl.style.opacity = "1"
                incomingEl.style.filter = "brightness(1)"
                break
            }
            case "wipeleft":
            case "wiperight":
            case "wipeup":
            case "wipedown": {
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "1.05"
                incomingEl.style.clipPath = "inset(0 0 0 0)"
                incomingEl.style.opacity = "1"
                break
            }
            case "slideleft": {
                outgoingEl.style.setProperty("translate", "-100% 0")
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "0.95"
                incomingEl.style.setProperty("translate", "0 0")
                incomingEl.style.opacity = "1"
                break
            }
            case "slideright": {
                outgoingEl.style.setProperty("translate", "100% 0")
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "0.95"
                incomingEl.style.setProperty("translate", "0 0")
                incomingEl.style.opacity = "1"
                break
            }
            case "slideup": {
                outgoingEl.style.setProperty("translate", "0 -100%")
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "0.95"
                incomingEl.style.setProperty("translate", "0 0")
                incomingEl.style.opacity = "1"
                break
            }
            case "slidedown": {
                outgoingEl.style.setProperty("translate", "0 100%")
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "0.95"
                incomingEl.style.setProperty("translate", "0 0")
                incomingEl.style.opacity = "1"
                break
            }
            case "circlecrop": {
                outgoingEl.style.opacity = "0"
                incomingEl.style.clipPath = "circle(100% at 50% 50%)"
                break
            }
            case "distance": {
                outgoingEl.style.opacity = "0"
                outgoingEl.style.scale = "2"
                incomingEl.style.opacity = "1"
                incomingEl.style.scale = "1"
                break
            }
            case "dissolve":
            case "fade":
            default: {
                outgoingEl.style.opacity = "0"
                incomingEl.style.opacity = "1"
                break
            }
        }
    })

    return setTimeout(() => {
        clearTransitionStyles(outgoingEl, incomingEl)
        outgoingEl.style.opacity = "0"
        incomingEl.style.opacity = "1"
        applyColorAdjustmentsToEl(incomingEl, nextClip.colorAdjustments)
    }, Math.ceil(duration * 1000) + 50)
}