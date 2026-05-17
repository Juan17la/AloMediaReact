import type { FFmpeg } from "@ffmpeg/ffmpeg"
import type { RenderJob, CompiledTransition } from "../project/projectTypes"
import { buildFilterGraph } from "./filterGraphBuilder"
import type { ExportProgress } from "./exportProgress"
import { EXPORT_FORMAT_PROFILES } from "../constants/exportFormats"
import { buildExecArgs } from "./exportOrchestrator"

const CHUNK_DURATION_SECONDS = 45
const CHUNK_MIN_DURATION = 10
const CHUNK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes per chunk (generous for ST core)

interface ChunkWindow {
  start: number
  end: number
}

function computeChunkWindows(duration: number, transitions: CompiledTransition[]): ChunkWindow[] {
  const boundaries: number[] = [0]
  let current = 0

  while (current < duration) {
    let nextBoundary = current + CHUNK_DURATION_SECONDS

    if (duration - nextBoundary > 0 && duration - nextBoundary < CHUNK_MIN_DURATION) {
      nextBoundary = duration
    }

    if (nextBoundary >= duration) {
      boundaries.push(duration)
      break
    }

    const splitTransition = transitions.find(t => {
      const spans = t.startTimeS < nextBoundary && t.endTimeS > nextBoundary
      if (!spans) return false
      const isCrossfade = !!t.clipARef.clipId && !!t.clipBRef.clipId
      return isCrossfade
    })

    if (splitTransition) {
      nextBoundary = splitTransition.endTimeS
    }

    boundaries.push(nextBoundary)
    current = nextBoundary
  }

  const windows: ChunkWindow[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    windows.push({ start: boundaries[i], end: boundaries[i + 1] })
  }

  console.log(`[chunkedExport] Timeline ${duration.toFixed(2)}s split into ${windows.length} chunks:`)
  windows.forEach((w, i) => console.log(`  Chunk ${i}: ${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s (duration: ${(w.end - w.start).toFixed(2)}s)`))

  return windows
}

function sliceJobToChunk(job: RenderJob, chunkStart: number, chunkEnd: number): RenderJob {
  const chunkDuration = chunkEnd - chunkStart

  const segments = job.segments
    .filter(seg => seg.timelineStart < chunkEnd && seg.timelineEnd > chunkStart)
    .map(seg => {
      const overlapStart = Math.max(chunkStart, seg.timelineStart)
      const overlapEnd = Math.min(chunkEnd, seg.timelineEnd)
      const overlapDuration = overlapEnd - overlapStart

      if (overlapDuration <= 0) return null

      const originalDuration = seg.timelineEnd - seg.timelineStart
      const mediaDuration = seg.mediaEnd - seg.mediaStart
      const timeScale = originalDuration > 0 ? mediaDuration / originalDuration : 0

      const mediaStartOffset = (overlapStart - seg.timelineStart) * timeScale
      const mediaEndOffset = (overlapEnd - seg.timelineStart) * timeScale

      const newSeg: typeof seg = {
        ...seg,
        timelineStart: overlapStart - chunkStart,
        timelineEnd: overlapEnd - chunkStart,
        mediaStart: seg.mediaStart + mediaStartOffset,
        mediaEnd: seg.mediaStart + mediaEndOffset,
      }

      if (newSeg.resolvedTransitionIn) {
        const absStart = newSeg.resolvedTransitionIn.overlapStartS
        if (absStart < chunkStart || absStart > chunkEnd) {
          newSeg.resolvedTransitionIn = undefined
        } else {
          newSeg.resolvedTransitionIn = {
            ...newSeg.resolvedTransitionIn,
            overlapStartS: absStart - chunkStart,
          }
        }
      }

      if (newSeg.resolvedTransitionOut) {
        const absStart = newSeg.resolvedTransitionOut.overlapStartS
        if (absStart < chunkStart || absStart > chunkEnd) {
          newSeg.resolvedTransitionOut = undefined
        } else {
          newSeg.resolvedTransitionOut = {
            ...newSeg.resolvedTransitionOut,
            overlapStartS: absStart - chunkStart,
          }
        }
      }

      return newSeg
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  return {
    ...job,
    segments,
    projectDuration: chunkDuration,
  }
}

async function executeChunk(
  ffmpeg: FFmpeg,
  job: RenderJob,
  fileNames: Map<string, string>,
  outputFile: string,
  chunkLabel: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const hasVisuals = job.segments.some(s => s.type === 'video' || s.type === 'image' || s.type === 'text')

  console.log(`[chunkedExport] ${chunkLabel} building filter graph...`)
  console.log(`[chunkedExport] ${chunkLabel} segments:`, job.segments.map(s => ({
    type: s.type,
    mediaId: s.mediaId,
    timeline: `${s.timelineStart.toFixed(2)}-${s.timelineEnd.toFixed(2)}`,
    media: `${s.mediaStart.toFixed(2)}-${s.mediaEnd.toFixed(2)}`,
  })))

  const graph = buildFilterGraph(job, fileNames, {
    forceVideoOutput: !hasVisuals,
  })

  const execArgs = buildExecArgs(graph, job, outputFile)

  // Insert force_key_frames before -y
  const yIdx = execArgs.indexOf('-y')
  if (yIdx > 0) {
    execArgs.splice(yIdx, 0, '-force_key_frames', 'expr:gte(t,n_forced*2)')
  }

  console.log(`[chunkedExport] ${chunkLabel} ffmpeg args: ffmpeg ${execArgs.join(' ')}`)
  console.log(`[chunkedExport] ${chunkLabel} filterComplex length: ${graph.filterComplex.length} chars`)
  console.log(`[chunkedExport] ${chunkLabel} filterComplex (first 500 chars):`, graph.filterComplex.slice(0, 500))

  const handleProgress = onProgress
    ? ({ progress }: { progress: number }) => onProgress(progress)
    : undefined

  if (handleProgress) ffmpeg.on('progress', handleProgress)

  // Capture ffmpeg logs
  const chunkLogs: string[] = []
  const logListener = ({ message }: { type: string; message: string }) => {
    chunkLogs.push(message)
    // Show key progress indicators in real-time
    if (/frame=|time=|speed=|fps=/.test(message)) {
      console.log(`[chunkedExport] ${chunkLabel} ${message.trim()}`)
    }
  }
  ffmpeg.on('log', logListener)

  const handleAbort = signal ? () => {
    console.log(`[chunkedExport] ${chunkLabel} abort signal received, terminating ffmpeg...`)
    ffmpeg.terminate()
  } : undefined

  if (signal && handleAbort) signal.addEventListener('abort', handleAbort, { once: true })

  const startTime = Date.now()
  console.log(`[chunkedExport] ${chunkLabel} starting ffmpeg.exec at ${new Date().toISOString()}`)

  try {
    const execPromise = ffmpeg.exec(execArgs)

    // Timeout guard
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`TIMEOUT: Chunk ${chunkLabel} exceeded ${CHUNK_TIMEOUT_MS / 1000}s`))
      }, CHUNK_TIMEOUT_MS)
      // Clean up timer if exec finishes first
      execPromise.then(() => clearTimeout(timer)).catch(() => clearTimeout(timer))
    })

    const code = await Promise.race([execPromise, timeoutPromise])
    const elapsed = (Date.now() - startTime) / 1000

    console.log(`[chunkedExport] ${chunkLabel} finished in ${elapsed.toFixed(1)}s with exit code ${code}`)

    if (code !== 0) {
      console.error(`[chunkedExport] ${chunkLabel} FAILED logs:`)
      chunkLogs.slice(-30).forEach(l => console.error(`  > ${l}`))
      throw new Error(`Chunk ${chunkLabel} encoding failed with exit code ${code}`)
    }
  } catch (err) {
    const elapsed = (Date.now() - startTime) / 1000
    console.error(`[chunkedExport] ${chunkLabel} ERROR after ${elapsed.toFixed(1)}s:`, err)

    if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
      console.warn(`[chunkedExport] ${chunkLabel} TIMEOUT detected — will retry without transitions`)
      throw new Error(`TIMEOUT:${chunkLabel}`)
    }

    console.error(`[chunkedExport] ${chunkLabel} last 30 logs:`)
    chunkLogs.slice(-30).forEach(l => console.error(`  > ${l}`))
    throw err
  } finally {
    if (handleProgress) ffmpeg.off('progress', handleProgress)
    ffmpeg.off('log', logListener)
    if (signal && handleAbort) signal.removeEventListener('abort', handleAbort)
  }
}

export async function runChunkedExport(
  ffmpeg: FFmpeg,
  job: RenderJob,
  fileNames: Map<string, string>,
  written: Set<string>,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const windows = computeChunkWindows(job.projectDuration, job.transitions)
  const totalDuration = windows.reduce((sum, w) => sum + (w.end - w.start), 0)
  const profile = EXPORT_FORMAT_PROFILES[job.outputFormat]
  const originalHasAudio = job.segments.some(s => s.type === 'audio' || s.type === 'video')

  onProgress({ stage: 'encoding', percent: 5, secondsRemaining: null })

  const chunkFiles: string[] = []
  let processedDuration = 0
  const chunkStartTime = Date.now()

  for (let i = 0; i < windows.length; i++) {
    if (signal.aborted) {
      throw new DOMException('Export cancelled', 'AbortError')
    }

    const window = windows[i]
    const chunkLabel = `chunk[${i}/${windows.length}]`
    console.log(`\n[chunkedExport] ===== ${chunkLabel} ${window.start.toFixed(2)}s-${window.end.toFixed(2)}s =====`)

    let chunkJob = sliceJobToChunk(job, window.start, window.end)
    const chunkFile = `chunk_${i}.${job.outputFormat}`
    const chunkHasAudio = chunkJob.segments.some(s => s.type === 'audio' || s.type === 'video')

    const chunkDuration = window.end - window.start
    const onChunkProgress = (progress: number) => {
      const chunkProcessed = progress * chunkDuration
      const totalProcessed = processedDuration + chunkProcessed
      const overallProgress = 5 + (totalProcessed / totalDuration) * 80
      const elapsed = (Date.now() - chunkStartTime) / 1000
      const rate = totalProcessed / totalDuration
      const totalEst = rate > 0 ? elapsed / rate : 0
      const remaining = Math.round(totalEst - elapsed)
      onProgress({
        stage: 'encoding',
        percent: Math.min(85, Math.round(overallProgress)),
        secondsRemaining: remaining > 0 ? remaining : null,
      })
    }

    // Try normal rendering first
    let success = false
    try {
      await executeChunk(ffmpeg, chunkJob, fileNames, chunkFile, chunkLabel, onChunkProgress, signal)
      success = true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      if (msg.startsWith('TIMEOUT:')) {
        console.warn(`[chunkedExport] ${chunkLabel} retrying WITHOUT transitions...`)
        // Rebuild job without transitions
        chunkJob = sliceJobToChunk(job, window.start, window.end)
        // Strip all resolved transitions
        chunkJob.segments.forEach(s => {
          s.resolvedTransitionIn = undefined
          s.resolvedTransitionOut = undefined
        })

        try {
          await executeChunk(ffmpeg, chunkJob, fileNames, chunkFile, `${chunkLabel}(no-xfade)`, onChunkProgress, signal)
          success = true
          console.log(`[chunkedExport] ${chunkLabel} retry SUCCESS without transitions`)
        } catch (retryErr) {
          console.error(`[chunkedExport] ${chunkLabel} retry FAILED:`, retryErr)
          throw retryErr
        }
      } else {
        throw err
      }
    }

    if (!success) {
      throw new Error(`[chunkedExport] ${chunkLabel} could not be rendered`)
    }

    // Mux silent audio if needed
    if (originalHasAudio && !chunkHasAudio) {
      const muxedFile = `chunk_${i}_a.${job.outputFormat}`
      console.log(`[chunkedExport] ${chunkLabel} muxing silent audio into ${muxedFile}`)
      await ffmpeg.exec([
        '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`,
        '-i', chunkFile,
        '-shortest',
        '-c:v', 'copy',
        '-c:a', profile.audioCodec,
        '-b:a', '128k',
        '-y', muxedFile,
      ])
      await ffmpeg.deleteFile(chunkFile).catch(() => {})
      chunkFiles.push(muxedFile)
      console.log(`[chunkedExport] ${chunkLabel} muxed to ${muxedFile}`)
    } else {
      chunkFiles.push(chunkFile)
    }

    processedDuration += chunkDuration
    console.log(`[chunkedExport] ${chunkLabel} DONE. Processed ${processedDuration.toFixed(1)}s / ${totalDuration.toFixed(1)}s`)
  }

  // Concatenate
  console.log(`\n[chunkedExport] Concatenating ${chunkFiles.length} chunks...`)
  onProgress({ stage: 'encoding', percent: 87, secondsRemaining: null })

  const concatContent = chunkFiles.map(f => `file '${f}'`).join('\n')
  await ffmpeg.writeFile('concat_list.txt', new TextEncoder().encode(concatContent))

  const outputFile = `output.${job.outputFormat}`

  let concatCode = -1
  try {
    concatCode = await ffmpeg.exec([
      '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt',
      '-c', 'copy',
      '-y', outputFile,
    ])
    console.log(`[chunkedExport] Concat -c copy exit code: ${concatCode}`)
  } catch (e) {
    console.warn(`[chunkedExport] Concat -c copy failed:`, e)
    concatCode = -1
  }

  if (concatCode !== 0) {
    console.warn('[chunkedExport] Falling back to concat with re-encode')
    concatCode = await ffmpeg.exec([
      '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt',
      '-c:v', profile.videoCodec, ...profile.videoArgs,
      '-c:a', profile.audioCodec,
      '-y', outputFile,
    ])
    console.log(`[chunkedExport] Concat re-encode exit code: ${concatCode}`)
  }

  if (concatCode !== 0) {
    throw new Error(`Concatenation failed with exit code ${concatCode}`)
  }

  // Read output
  onProgress({ stage: 'reading-output', percent: 95, secondsRemaining: null })
  console.log('[chunkedExport] Reading output file...')
  const result = await ffmpeg.readFile(outputFile) as Uint8Array
  console.log(`[chunkedExport] Output file size: ${(result.length / 1024 / 1024).toFixed(2)} MB`)

  // Cleanup
  onProgress({ stage: 'cleanup', percent: 98, secondsRemaining: null })
  for (const f of chunkFiles) {
    await ffmpeg.deleteFile(f).catch(() => {})
  }
  await ffmpeg.deleteFile('concat_list.txt').catch(() => {})
  await ffmpeg.deleteFile(outputFile).catch(() => {})
  for (const path of written) {
    await ffmpeg.deleteFile(path).catch(() => {})
  }

  onProgress({ stage: 'done', percent: 100, secondsRemaining: null })
  console.log('[chunkedExport] Export complete!')
  return result
}
