import { fetchFile } from "@ffmpeg/util"
import type { FFmpeg } from "@ffmpeg/ffmpeg"
import type { RenderJob } from "../project/projectTypes"
import { buildFilterGraph } from "./filterGraphBuilder"
import type { ExportProgress } from "./exportProgress"
import { estimateTimeRemaining } from "./exportProgress"

export async function runExport(
  ffmpeg: FFmpeg,
  job: RenderJob,
  fileMap: Map<string, File>,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Uint8Array> {
  // Stage: writing-files (0–15%) 
  onProgress({ stage: 'writing-files', percent: 0, secondsRemaining: null })

  const written = new Set<string>()
  const uniqueMediaIds = [...new Set(job.segments.map(s => s.mediaId).filter(Boolean))]

  for (let i = 0; i < uniqueMediaIds.length; i++) {
    if (signal.aborted) {
      await cleanup(ffmpeg, written, job.outputFormat)
      throw new DOMException('Export cancelled', 'AbortError')
    }

    const mediaId = uniqueMediaIds[i]
    const file = fileMap.get(mediaId)
    if (!file) continue

    await ffmpeg.writeFile(`media_${mediaId}`, await fetchFile(file))
    written.add(`media_${mediaId}`)

    const pct = Math.round(((i + 1) / uniqueMediaIds.length) * 15)
    onProgress({ stage: 'writing-files', percent: pct, secondsRemaining: null })
  }

  // Stage: building-graph (15–20%) 
  onProgress({ stage: 'building-graph', percent: 15, secondsRemaining: null })

  if (signal.aborted) {
    await cleanup(ffmpeg, written, job.outputFormat)
    throw new DOMException('Export cancelled', 'AbortError')
  }

  const graph = buildFilterGraph(job)

  // Stage: encoding (20–95%) 
  onProgress({ stage: 'encoding', percent: 20, secondsRemaining: null })

  const encodingStartedAt = Date.now()

  ffmpeg.on('progress', ({ progress }) => {
    const encodingPct = 20 + progress * 75
    const clampedPct = Math.min(95, Math.round(encodingPct))
    const encodingPercent = (clampedPct - 20) / 75 * 100
    const secondsRemaining = estimateTimeRemaining(encodingStartedAt, encodingPercent)
    onProgress({ stage: 'encoding', percent: clampedPct, secondsRemaining })
  })

  const outputFile = `output.${job.outputFormat}`
  const execArgs = buildExecArgs(graph, job, outputFile)

  try {
    await ffmpeg.exec(execArgs)
  } catch (err) {
    await cleanup(ffmpeg, written, job.outputFormat)
    throw err
  }

  // Stage: reading-output (95–98%) 
  onProgress({ stage: 'reading-output', percent: 95, secondsRemaining: null })

  let result: Uint8Array | undefined

  try {
    result = await ffmpeg.readFile(outputFile) as Uint8Array
  } finally {
    // Stage: cleanup (98–100%)
    onProgress({ stage: 'cleanup', percent: 98, secondsRemaining: null })
    await cleanup(ffmpeg, written, job.outputFormat)
    onProgress({ stage: 'done', percent: 100, secondsRemaining: null })
  }

  return result!
}

function buildExecArgs(
  graph: ReturnType<typeof buildFilterGraph>,
  job: RenderJob,
  outputFile: string,
): string[] {
  const args: string[] = []

  // Base canvas (lavfi color source)
  args.push(...graph.baseArgs)

  // Media file inputs
  for (const inp of graph.inputs) {
    if (inp.isImage) {
      args.push('-loop', '1')
    }
    args.push('-i', inp.filePath)
  }

  // Filter complex
  if (graph.filterComplex) {
    args.push('-filter_complex', graph.filterComplex)
  }

  // Stream mapping
  if (graph.videoOutputLabel) {
    args.push('-map', graph.videoOutputLabel)
  }
  if (graph.audioOutputLabel) {
    args.push('-map', graph.audioOutputLabel)
  }

  // Video codec
  if (graph.videoOutputLabel) {
    if (job.outputFormat === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30')
    } else {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23')
    }
  }

  // Audio codec
  if (graph.audioOutputLabel) {
    if (job.outputFormat === 'webm') {
      args.push('-c:a', 'libopus')
    } else {
      args.push('-c:a', 'aac')
    }
  }

  args.push('-y', outputFile)
  return args
}

async function cleanup(
  ffmpeg: FFmpeg,
  written: Set<string>,
  outputFormat: string,
): Promise<void> {
  const toDelete = [...written, `output.${outputFormat}`]
  for (const path of toDelete) {
    try {
      await ffmpeg.deleteFile(path)
    } catch {
      // File may not exist; ignore
    }
  }
}
