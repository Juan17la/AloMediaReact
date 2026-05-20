import type {
  ExportOutputFormat,
  ExportVideoCodec,
} from "../project/projectTypes"

export interface ExportOptions {
  outputFormat: ExportOutputFormat
  codec?: ExportVideoCodec
  resolution: { width: number; height: number }
  fps: number
  outputFileName: string
}
