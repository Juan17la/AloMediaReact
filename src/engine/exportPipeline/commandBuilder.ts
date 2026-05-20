import type { RenderPlan, FilterGraphResult } from "./types"
import { getCodecArgs } from "./encodingPresets"

export function buildWasmCommand(
  graph: FilterGraphResult,
  plan: RenderPlan,
  outputFileName: string,
): string[] {
  const { outputTarget } = plan
  const args: string[] = []

  args.push("-y")

  for (const inputArg of graph.inputArgs) {
    args.push(inputArg)
  }

  if (graph.filterComplex.trim().length > 0) {
    args.push("-filter_complex", graph.filterComplex)
  }

  for (const mapArg of graph.mappingArgs) {
    args.push(mapArg)
  }

  if (graph.mappingArgs.length === 0) {
    args.push("-map", "0:v")
  }

  const codecName = mapCodecForWasm(outputTarget.codec as string)
  args.push("-c:v", codecName)
  args.push("-crf", String(outputTarget.crf))
  args.push("-preset", outputTarget.preset)

  if (outputTarget.tune) {
    args.push("-tune", outputTarget.tune)
  }

  const codecArgs = getCodecArgs(outputTarget)
  args.push(...codecArgs)

  args.push("-pix_fmt", outputTarget.pixelFormat)
  args.push("-r", String(outputTarget.fps))

  const hasAudioMapping = graph.mappingArgs.some((a) => a === "-map" && graph.mappingArgs.indexOf(a) > graph.mappingArgs.indexOf("-map"))
  if (hasAudioMapping || graph.filterComplex.includes("[outa]")) {
    args.push("-c:a", outputTarget.audioCodec)
    args.push("-b:a", `${outputTarget.audioBitrate}k`)
  } else {
    args.push("-an")
  }

  if (outputTarget.format === "mp4") {
    args.push("-movflags", "+faststart")
  }

  args.push(outputFileName)

  return args
}

export function buildStreamCopyCommand(
  plan: RenderPlan,
  inputFileName: string,
  outputFileName: string,
  seekStart: number,
  duration: number,
): string[] {
  const args: string[] = ["-y"]

  if (seekStart > 0.001) {
    args.push("-ss", seekStart.toFixed(3))
  }

  args.push("-i", inputFileName)
  args.push("-t", duration.toFixed(3))
  args.push("-c", "copy")
  args.push("-avoid_negative_ts", "make_zero")

  if (plan.outputTarget.format === "mp4") {
    args.push("-movflags", "+faststart")
  }

  args.push(outputFileName)

  return args
}

export function buildNativeCommand(
  graph: FilterGraphResult,
  plan: RenderPlan,
  outputFileName: string,
  gpuCodec: string | null,
): string[] {
  const { outputTarget } = plan
  const args: string[] = []

  args.push("-y")

  if (gpuCodec) {
    if (gpuCodec.includes("nvenc")) {
      args.push("-hwaccel", "cuda", "-hwaccel_output_format", "cuda")
    } else if (gpuCodec.includes("qsv")) {
      args.push("-hwaccel", "qsv", "-hwaccel_output_format", "qsv")
    }
  }

  for (const inputArg of graph.inputArgs) {
    args.push(inputArg)
  }

  if (graph.filterComplex.trim().length > 0) {
    args.push("-filter_complex", graph.filterComplex)
  }

  for (const mapArg of graph.mappingArgs) {
    args.push(mapArg)
  }

  if (graph.mappingArgs.length === 0) {
    args.push("-map", "0:v")
  }

  const effectiveCodec = gpuCodec ?? mapCodecForNative(outputTarget.codec as string)
  args.push("-c:v", effectiveCodec)
  args.push("-crf", String(outputTarget.crf))
  args.push("-preset", outputTarget.preset)

  if (outputTarget.tune && !gpuCodec) {
    args.push("-tune", outputTarget.tune)
  }

  if (!gpuCodec) {
    const codecArgs = getCodecArgs(outputTarget)
    args.push(...codecArgs)
  }

  args.push("-pix_fmt", outputTarget.pixelFormat)
  args.push("-r", String(outputTarget.fps))

  const hasAudioMapping = graph.mappingArgs.some((a) => a === "-map" && graph.mappingArgs.indexOf(a) > graph.mappingArgs.indexOf("-map"))
  if (hasAudioMapping || graph.filterComplex.includes("[outa]")) {
    args.push("-c:a", outputTarget.audioCodec)
    args.push("-b:a", `${outputTarget.audioBitrate}k`)
  } else {
    args.push("-an")
  }

  args.push("-progress", "pipe:2")

  if (outputTarget.format === "mp4") {
    args.push("-movflags", "+faststart")
  }

  args.push(outputFileName)

  return args
}

function mapCodecForWasm(codec: string): string {
  if (codec === "h264") return "libx264"
  if (codec === "vp9") return "libvpx-vp9"
  if (codec === "av1") return "libaom-av1"
  return codec
}

function mapCodecForNative(codec: string): string {
  if (codec === "h264") return "libx264"
  if (codec === "vp9") return "libvpx-vp9"
  if (codec === "av1") return "libaom-av1"
  return codec
}