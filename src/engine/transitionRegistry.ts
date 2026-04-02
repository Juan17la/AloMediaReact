export interface TransitionParameterSchema {
    durationS: {
        min: number
        max: number
        default: number
    }
}

export interface TransitionFallbackPolicy {
    fallbackId: string
    reason: string
}

export interface CanonicalTransitionEntry {
    id: string
    exportMapping: {
        ffmpegXfade: string
    }
    previewMapping: {
        renderer: string
    }
    parameterSchema: TransitionParameterSchema
    fallbackPolicy: TransitionFallbackPolicy
}

export interface CanonicalTransitionResolution {
    requestedId: string
    canonicalId: string
    normalized: boolean
    entry: CanonicalTransitionEntry
}

const DEFAULT_PARAMETER_SCHEMA: TransitionParameterSchema = {
    durationS: {
        min: 0.1,
        max: 2,
        default: 0.4,
    },
}

const DEFAULT_FALLBACK: TransitionFallbackPolicy = {
    fallbackId: "fade",
    reason: "unsupported-transition-type",
}

const registryList: CanonicalTransitionEntry[] = [
    {
        id: "fade",
        exportMapping: { ffmpegXfade: "fade" },
        previewMapping: { renderer: "fade" },
        parameterSchema: DEFAULT_PARAMETER_SCHEMA,
        fallbackPolicy: DEFAULT_FALLBACK,
    },
    {
        id: "wipeleft",
        exportMapping: { ffmpegXfade: "wipeleft" },
        previewMapping: { renderer: "wipeleft" },
        parameterSchema: DEFAULT_PARAMETER_SCHEMA,
        fallbackPolicy: DEFAULT_FALLBACK,
    },
    {
        id: "wiperight",
        exportMapping: { ffmpegXfade: "wiperight" },
        previewMapping: { renderer: "wiperight" },
        parameterSchema: DEFAULT_PARAMETER_SCHEMA,
        fallbackPolicy: DEFAULT_FALLBACK,
    },
    {
        id: "slideleft",
        exportMapping: { ffmpegXfade: "slideleft" },
        previewMapping: { renderer: "slideleft" },
        parameterSchema: DEFAULT_PARAMETER_SCHEMA,
        fallbackPolicy: DEFAULT_FALLBACK,
    },
    {
        id: "slideright",
        exportMapping: { ffmpegXfade: "slideright" },
        previewMapping: { renderer: "slideright" },
        parameterSchema: DEFAULT_PARAMETER_SCHEMA,
        fallbackPolicy: DEFAULT_FALLBACK,
    },
    {
        id: "circlecrop",
        exportMapping: { ffmpegXfade: "circlecrop" },
        previewMapping: { renderer: "circlecrop" },
        parameterSchema: DEFAULT_PARAMETER_SCHEMA,
        fallbackPolicy: DEFAULT_FALLBACK,
    },
    {
        id: "distance",
        exportMapping: { ffmpegXfade: "distance" },
        previewMapping: { renderer: "distance" },
        parameterSchema: DEFAULT_PARAMETER_SCHEMA,
        fallbackPolicy: DEFAULT_FALLBACK,
    },
]

const TRANSITION_REGISTRY = new Map<string, CanonicalTransitionEntry>(
    registryList.map(entry => [entry.id, entry]),
)

const FALLBACK_ENTRY = TRANSITION_REGISTRY.get("fade")!

export function getCanonicalTransitionRegistry(): CanonicalTransitionEntry[] {
    return registryList.slice()
}

export function resolveCanonicalTransitionType(type: string | undefined): CanonicalTransitionResolution {
    const requestedId = (type ?? "").trim()
    if (!requestedId) {
        return {
            requestedId: "",
            canonicalId: FALLBACK_ENTRY.id,
            normalized: true,
            entry: FALLBACK_ENTRY,
        }
    }

    const entry = TRANSITION_REGISTRY.get(requestedId)
    if (entry) {
        return {
            requestedId,
            canonicalId: entry.id,
            normalized: false,
            entry,
        }
    }

    return {
        requestedId,
        canonicalId: FALLBACK_ENTRY.id,
        normalized: true,
        entry: FALLBACK_ENTRY,
    }
}
