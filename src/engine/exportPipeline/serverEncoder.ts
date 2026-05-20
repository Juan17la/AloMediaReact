import type { RenderPlan, ExportPipelineCallbacks, EngineCapabilities } from "./types"
import { stageProgress } from "./progressTracker"

// VITE_EXPORT_SERVER_URL points to the export server (Railway in production).
// e.g. https://alomediaserverexport-production.up.railway.app
const serverUrl = import.meta.env.VITE_EXPORT_SERVER_URL as string | undefined ?? ""
const BASE_URL = serverUrl || ""
const HEALTH_ENDPOINT = `${BASE_URL}/api/health`
const EXPORT_ENDPOINT = `${BASE_URL}/api/export`
const STATUS_ENDPOINT = (id: string) => `${BASE_URL}/api/export/${id}/status`
const DOWNLOAD_ENDPOINT = (id: string) => `${BASE_URL}/api/export/${id}/download`
const CANCEL_ENDPOINT = (id: string) => `${BASE_URL}/api/export/${id}`

const POLL_INTERVAL_MS = 500
const REQUEST_TIMEOUT_MS = 30000

let cachedCapabilities: EngineCapabilities | null = null

export async function checkServerAvailability(): Promise<EngineCapabilities> {
  // Only return cached result if server was previously confirmed available
  if (cachedCapabilities?.available) {
    return cachedCapabilities
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const response = await fetch(HEALTH_ENDPOINT, {
      method: "GET",
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      console.warn("[serverEncoder] Health check returned status", response.status)
      // Don't cache failures — server might come back up
      return { available: false, gpuAccel: false, gpuCodec: null, maxConcurrentJobs: 0 }
    }

    const data = await response.json()
    cachedCapabilities = {
      available: true,
      gpuAccel: data.gpuAccel ?? false,
      gpuCodec: data.gpuCodec ?? null,
      maxConcurrentJobs: data.maxConcurrentJobs ?? 1,
    }
    console.log("[serverEncoder] Server available. GPU:", cachedCapabilities.gpuAccel, "Codec:", cachedCapabilities.gpuCodec)
    return cachedCapabilities
  } catch (err) {
    // Don't cache connection failures — server might start later
    const msg = err instanceof Error ? err.message : String(err)
    console.log("[serverEncoder] Server not available:", msg)
    return { available: false, gpuAccel: false, gpuCodec: null, maxConcurrentJobs: 0 }
  }
}

export function invalidateServerCache(): void {
  cachedCapabilities = null
}

export async function executeServerExport(
  plan: RenderPlan,
  mediaFiles: Map<string, File>,
  callbacks: ExportPipelineCallbacks,
  abortSignal: AbortSignal,
): Promise<void> {
  const onProgress = callbacks.onProgress

  try {
    onProgress(stageProgress("probing", 2, 0, plan.estimatedTotalFrames))

    const formData = new FormData()
    // Serialize Map to plain object for JSON
    const planJson = JSON.stringify({
      ...plan,
      mediaFileNames: Object.fromEntries(plan.mediaFileNames),
    })
    formData.append("plan", planJson)

    // Debug logging
    console.log("[serverEncoder] Plan media file names:", Object.fromEntries(plan.mediaFileNames))
    console.log("[serverEncoder] Plan segments count:", plan.segments.length)
    console.log("[serverEncoder] Plan segments with mediaId:", plan.segments.filter(s => s.mediaId).map(s => ({ id: s.id, mediaId: s.mediaId, type: s.type })))
    console.log("[serverEncoder] Available mediaFiles in Map:", Array.from(mediaFiles.keys()))

    let totalBytes = 0
    const uploadedFiles: string[] = []
    for (const [mediaId, file] of mediaFiles) {
      const fieldName = `file_${mediaId}`
      const fileName = plan.mediaFileNames.get(mediaId) ?? file.name
      formData.append(fieldName, file, fileName)
      uploadedFiles.push(fieldName)
      totalBytes += file.size
      console.log(`[serverEncoder] Appending ${fieldName}: ${fileName} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
    }
    console.log("[serverEncoder] Uploading", mediaFiles.size, "files:", uploadedFiles, "Total:", (totalBytes / 1024 / 1024).toFixed(1), "MB")

    onProgress(stageProgress("planning", 8, 0, plan.estimatedTotalFrames))

    const submitResponse = await fetch(EXPORT_ENDPOINT, {
      method: "POST",
      body: formData,
      signal: abortSignal,
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      console.error("[serverEncoder] Submit failed:", submitResponse.status)
      console.error("[serverEncoder] Response body:", errorText)
      try {
        const errorJson = JSON.parse(errorText)
        console.error("[serverEncoder] Parsed error:", JSON.stringify(errorJson, null, 2))
      } catch {
        // Not JSON, already logged as text
      }
      callbacks.onError(`Server export failed (${submitResponse.status}): ${errorText}`)
      return
    }

    const { jobId } = await submitResponse.json() as { jobId: string }
    console.log("[serverEncoder] Job submitted:", jobId)

    onProgress(stageProgress("planning", 10, 0, plan.estimatedTotalFrames))

    // Poll for progress
    while (!abortSignal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

      if (abortSignal.aborted) {
        await fetch(CANCEL_ENDPOINT(jobId), { method: "DELETE" }).catch(() => {})
        callbacks.onError("Export cancelled")
        return
      }

      try {
        const statusResponse = await fetch(STATUS_ENDPOINT(jobId))
        if (!statusResponse.ok) continue

        const status = await statusResponse.json() as {
          status: string
          progress: number
          framesProcessed: number
          framesTotal: number
          error: string | null
        }

        onProgress({
          stage: mapServerStatus(status.status),
          percent: status.progress,
          framesProcessed: status.framesProcessed,
          framesTotal: status.framesTotal || plan.estimatedTotalFrames,
          secondsRemaining: null,
          errorMessage: status.error,
        })

        if (status.status === "done") {
          const downloadResponse = await fetch(DOWNLOAD_ENDPOINT(jobId))
          if (!downloadResponse.ok) {
            callbacks.onError("Failed to download export result")
            return
          }

          const blob = await downloadResponse.blob()
          console.log("[serverEncoder] Download complete:", (blob.size / 1024 / 1024).toFixed(1), "MB")
          onProgress(stageProgress("done", 100, plan.estimatedTotalFrames, plan.estimatedTotalFrames))
          callbacks.onComplete(blob)
          return
        }

        if (status.status === "failed") {
          console.error("[serverEncoder] Job failed:", status.error)
          callbacks.onError(status.error ?? "Server export failed")
          return
        }
      } catch {
        // Continue polling on transient network errors
      }
    }

    // Aborted during polling
    await fetch(CANCEL_ENDPOINT(jobId), { method: "DELETE" }).catch(() => {})
    callbacks.onError("Export cancelled")
  } catch (err) {
    if (abortSignal.aborted) {
      callbacks.onError("Export cancelled")
      return
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[serverEncoder] Export error:", message)
    callbacks.onError(message)
  }
}

function mapServerStatus(status: string): "pending" | "probing" | "planning" | "encoding" | "merging" | "finalizing" | "done" | "failed" | "cancelled" {
  const map: Record<string, "pending" | "probing" | "planning" | "encoding" | "merging" | "finalizing" | "done" | "failed" | "cancelled"> = {
    pending: "pending",
    probing: "probing",
    planning: "planning",
    encoding: "encoding",
    merging: "merging",
    finalizing: "finalizing",
    done: "done",
    failed: "failed",
    cancelled: "cancelled",
  }
  return map[status] ?? "pending"
}