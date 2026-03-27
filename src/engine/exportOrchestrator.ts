import { fetchFile } from "@ffmpeg/util"
import type { FFmpeg } from "@ffmpeg/ffmpeg"
import type { RenderJob } from "../project/projectTypes"
import { buildFilterGraph } from "./filterGraphBuilder"
import type { ExportProgress } from "./exportProgress"
import { estimateTimeRemaining } from "./exportProgress"
import { isFfmpegTerminateError, safeMediaFileName } from "./ffmpegUtils"
import { EXPORT_FORMAT_PROFILES } from "../constants/exportFormats"

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
  const fileNames = new Map<string, string>()
  const uniqueMediaIds = [...new Set(job.segments.map(s => s.mediaId).filter(Boolean))]

  for (let i = 0; i < uniqueMediaIds.length; i++) {
    if (signal.aborted) {
      await cleanup(ffmpeg, written, job.outputFormat)
      throw new DOMException('Export cancelled', 'AbortError')
    }

    const mediaId = uniqueMediaIds[i]
    const file = fileMap.get(mediaId)
    if (!file) {
      throw new Error(`[export] No file found in fileMap for mediaId: ${mediaId}`)
    }

    const outputName = safeMediaFileName(mediaId, file)

    try {
      await ffmpeg.writeFile(outputName, await fetchFile(file), { signal })
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        await cleanup(ffmpeg, written, job.outputFormat)
        throw new DOMException('Export cancelled', 'AbortError')
      }
      throw err
    }

    written.add(outputName)
    fileNames.set(mediaId, outputName)

    if (signal.aborted) {
      await cleanup(ffmpeg, written, job.outputFormat)
      throw new DOMException('Export cancelled', 'AbortError')
    }

    const pct = Math.round(((i + 1) / uniqueMediaIds.length) * 15)
    onProgress({ stage: 'writing-files', percent: pct, secondsRemaining: null })
  }

  // Stage: building-graph (15–20%)
  onProgress({ stage: 'building-graph', percent: 15, secondsRemaining: null })

  if (signal.aborted) {
    await cleanup(ffmpeg, written, job.outputFormat)
    throw new DOMException('Export cancelled', 'AbortError')
  }

  const graph = buildFilterGraph(job, fileNames)

  // Stage: encoding (20–95%)
  onProgress({ stage: 'encoding', percent: 20, secondsRemaining: null })

  const encodingStartedAt = Date.now()

  const onEncodingProgress = ({ progress }: { progress: number }) => {
    const encodingPct = 20 + progress * 75
    const clampedPct = Math.min(95, Math.round(encodingPct))
    const encodingPercent = (clampedPct - 20) / 75 * 100
    const secondsRemaining = estimateTimeRemaining(encodingStartedAt, encodingPercent)
    onProgress({ stage: 'encoding', percent: clampedPct, secondsRemaining })
  }
  ffmpeg.on('progress', onEncodingProgress)

  const handleAbort = () => {
    ffmpeg.terminate()
  }
  signal.addEventListener('abort', handleAbort, { once: true })

  const outputFile = `output.${job.outputFormat}`
  const execArgs = buildExecArgs(graph, job, outputFile)
  console.debug('[export] ffmpeg exec args:', execArgs.join(' '))

  const ffmpegLogs: string[] = []
  const logListener = ({ message }: { type: string; message: string }) => {
    ffmpegLogs.push(message)
  }
  ffmpeg.on('log', logListener)

  let exitCode = -1
  try {
    exitCode = await ffmpeg.exec(execArgs)
  } catch (err) {
    if (signal.aborted || isFfmpegTerminateError(err)) {
      throw new DOMException('Export cancelled', 'AbortError')
    }
    await cleanup(ffmpeg, written, job.outputFormat)
    throw err
  } finally {
    signal.removeEventListener('abort', handleAbort)
    ffmpeg.off('progress', onEncodingProgress)
    ffmpeg.off('log', logListener)
  }

  if (exitCode !== 0) {
    if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError')

    // If the filter complex referenced [inputIdx:a] but the video has no audio stream,
    // FFmpeg exits 1 with a "matches no streams" or similar message. Retry once without
    // trying to extract audio from video inputs — the output will be video-only (or use
    // audio-only clips if any exist).
    const looksLikeAudioStreamError = ffmpegLogs.some(l =>
      /matches no streams|no audio|does not contain any stream|unconnected output|filtergraph/i.test(l),
    )

    if (looksLikeAudioStreamError || exitCode === 1) {
      console.warn('[export] First attempt failed (exit code', exitCode, '), retrying without video audio')
      console.error('[export] First attempt logs:', ffmpegLogs)

      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError')

      const graphFallback = buildFilterGraph(job, fileNames, { skipVideoAudio: true })
      const execArgsFallback = buildExecArgs(graphFallback, job, outputFile)
      console.debug('[export] Fallback ffmpeg exec args:', execArgsFallback.join(' '))

      const ffmpegLogsFallback: string[] = []
      const logListenerFallback = ({ message }: { type: string; message: string }) => {
        ffmpegLogsFallback.push(message)
      }
      ffmpeg.on('log', logListenerFallback)

      let retryCode = -1
      try {
        retryCode = await ffmpeg.exec(execArgsFallback)
      } catch (err) {
        if (isFfmpegTerminateError(err) || signal.aborted) throw new DOMException('Export cancelled', 'AbortError')
        await cleanup(ffmpeg, written, job.outputFormat)
        throw err
      } finally {
        ffmpeg.off('log', logListenerFallback)
      }

      if (retryCode !== 0) {
        await cleanup(ffmpeg, written, job.outputFormat)
        console.error('[export] Fallback logs:', ffmpegLogsFallback)
        const errorLine = ffmpegLogsFallback
          .filter(l => /error|invalid|no such|could not|unknown|failed/i.test(l))
          .slice(-3)
          .join(' | ')
        throw new Error(
          errorLine
            ? `FFmpeg encoding failed: ${errorLine}`
            : `FFmpeg encoding failed (exit code ${retryCode})`,
        )
      }
      // Fallback succeeded — continue to readFile
    } else {
      await cleanup(ffmpeg, written, job.outputFormat)
      console.error('[export] FFmpeg logs:', ffmpegLogs)
      const errorLine = ffmpegLogs
        .filter(l => /error|invalid|no such|could not|unknown|failed/i.test(l))
        .slice(-3)
        .join(' | ')
      throw new Error(
        errorLine
          ? `FFmpeg encoding failed: ${errorLine}`
          : `FFmpeg encoding failed (exit code ${exitCode})`,
      )
    }
  }

  // Stage: reading-output (95–98%)
  onProgress({ stage: 'reading-output', percent: 95, secondsRemaining: null })

  let result: Uint8Array
  try {
    result = await ffmpeg.readFile(outputFile) as Uint8Array
  } catch (err) {
    await cleanup(ffmpeg, written, job.outputFormat)
    throw err
  }

  onProgress({ stage: 'cleanup', percent: 98, secondsRemaining: null })
  await cleanup(ffmpeg, written, job.outputFormat)
  onProgress({ stage: 'done', percent: 100, secondsRemaining: null })

  return result
}

function buildExecArgs(
  graph: ReturnType<typeof buildFilterGraph>,
  job: RenderJob,
  outputFile: string,
): string[] {
  const args: string[] = []
  const profile = EXPORT_FORMAT_PROFILES[job.outputFormat]

  // Base canvas (lavfi color source)
  args.push(...graph.baseArgs)

  // Media file inputs
  for (const inp of graph.inputs) {
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
    args.push('-c:v', profile.videoCodec, ...profile.videoArgs)
  }

  // Audio codec
  if (graph.audioOutputLabel) {
    args.push('-c:a', profile.audioCodec)
  }

  args.push('-t', `${job.projectDuration}`)
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