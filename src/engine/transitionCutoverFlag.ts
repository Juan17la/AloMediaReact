const CUTOVER_FLAG_NAME = "VITE_TRANSITION_COMPILER_CUTOVER"

function toBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value
    if (typeof value !== "string") return false
    const normalized = value.trim().toLowerCase()
    return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes"
}

export function isTransitionCompilerCutoverEnabled(
    env: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>,
): boolean {
    return toBoolean(env[CUTOVER_FLAG_NAME])
}
