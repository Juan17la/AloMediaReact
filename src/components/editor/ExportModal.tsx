import { useState } from "react"
import type { ExportOptions } from "../../engine/renderPipeline"
import type { ExportProgress } from "../../engine/exportProgress"
import { formatTimeRemaining } from "../../engine/exportProgress"
import type { ExportOutputFormat } from "../../project/projectTypes"
import { EXPORT_FORMAT_PROFILES } from "../../constants/exportFormats"

const AVAILABLE_FORMATS: ExportOutputFormat[] = Object.keys(EXPORT_FORMAT_PROFILES) as ExportOutputFormat[]

interface ExportModalProps {
  isExporting: boolean
  progress: ExportProgress | null
  onStart: (options: ExportOptions) => void
  onCancel: () => void
  onClose: () => void
  defaultFileName: string
}

const STAGE_LABELS: Record<ExportProgress['stage'], string> = {
  'writing-files': 'Writing files…',
  'building-graph': 'Building filter graph…',
  'encoding': 'Encoding…',
  'reading-output': 'Finalising output…',
  'cleanup': 'Cleaning up…',
  'done': 'Done!',
  'error': 'Export failed',
}

export function ExportModal({
  isExporting,
  progress,
  onStart,
  onCancel,
  onClose,
  defaultFileName,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportOutputFormat>('mp4')
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 1280, height: 720 })
  const [fps, setFps] = useState(30)
  const [fileName, setFileName] = useState(defaultFileName)

  const inProgress = isExporting || (progress?.stage !== 'done' && progress?.stage !== 'error' && progress !== null)
  const isDone = progress?.stage === 'done'
  const isError = progress?.stage === 'error'

  function handleBackdropClick() {
    if (!inProgress) onClose()
  }

  function handleStart() {
    onStart({
      outputFormat: format,
      resolution,
      fps,
      outputFileName: `${fileName}.${format}`,
    })
  }

  const pct = progress?.percent ?? 0
  const stageLabel = progress ? STAGE_LABELS[progress.stage] : null
  const timeLabel =
    progress?.secondsRemaining != null
      ? `${formatTimeRemaining(progress.secondsRemaining)} remaining`
      : progress?.stage === 'encoding'
        ? 'Calculating…'
        : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-glass-card"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel w-120 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255, 255, 255, 0.92)", marginBottom: 0 }}>
          {inProgress ? 'Exporting…' : isDone ? 'Export complete' : 'Export video'}
        </h2>

        {/* ── Settings state ── */}
        {!inProgress && !isDone && !isError && (
          <>
            {/* Format */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255, 255, 255, 0.40)" }}>Format</label>
              <div className="flex gap-2">
                {AVAILABLE_FORMATS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-120 ${format === f
                      ? 'bg-accent-red border-accent-red text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-accent-white hover:border-white/18 hover:bg-white/9'
                      }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255, 255, 255, 0.40)" }}>Resolution</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '1280×720', w: 1280, h: 720 },
                  { label: '1920×1080', w: 1920, h: 1080 },
                  { label: '3840×2160', w: 3840, h: 2160 },
                ].map(r => {
                  const selected = resolution.width === r.w && resolution.height === r.h
                  return (
                    <button
                      key={r.label}
                      onClick={() => setResolution({ width: r.w, height: r.h })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-120 ${selected
                        ? 'bg-accent-red border-accent-red text-white'
                        : 'border-white/10 text-muted hover:text-accent-white hover:border-white/20'
                        }`}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* FPS */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255, 255, 255, 0.40)" }}>Frame rate</label>
              <div className="flex gap-2">
                {[24, 30, 60].map(f => (
                  <button
                    key={f}
                    onClick={() => setFps(f)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-120 ${fps === f
                      ? 'bg-accent-red border-accent-red text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-accent-white hover:border-white/18 hover:bg-white/9'
                      }`}
                  >
                    {f} fps
                  </button>
                ))}
              </div>
            </div>

            {/* File name */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255, 255, 255, 0.40)" }}>File name</label>
              <div className="flex items-center gap-2">
                <input
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="editor-input flex-1 px-3 py-2 text-sm text-accent-white"
                  spellCheck={false}
                />
                <span className="text-muted text-sm shrink-0">.{format}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5" style={{ marginTop: 8 }}>
              <button
                onClick={onClose}
                className="btn-ghost px-4 py-2 rounded-lg text-sm border border-white/10 bg-white/5"
                style={{ color: "rgba(255, 255, 255, 0.80)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="btn-accent px-5 py-2 rounded-lg text-sm font-semibold bg-accent-red text-white"
              >
                Export
              </button>
            </div>
          </>
        )}

        {/* ── Progress state ── */}
        {(inProgress || isDone || isError) && (
          <>
            {/* Stage label */}
            <p className={`text-sm ${isError ? 'text-red-400' : 'text-accent-white'}`}>
              {isError ? (progress?.errorMessage ?? 'An error occurred') : stageLabel}
            </p>

            {/* Progress bar */}
            {!isError && (
              <div className="flex flex-col gap-2">
                <div className="w-full h-1.5 bg-dark-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-red rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{pct}%</span>
                  {timeLabel && <span>{timeLabel}</span>}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2.5" style={{ marginTop: 8 }}>
              {isDone && (
                <button
                  onClick={onClose}
                  className="btn-accent px-5 py-2 rounded-lg text-sm font-semibold bg-accent-red text-white"
                >
                  Close
                </button>
              )}
              {(inProgress || isError) && (
                <button
                  onClick={onCancel}
                  className="btn-ghost px-4 py-2 rounded-lg text-sm border border-white/10 bg-white/5"
                style={{ color: "rgba(255, 255, 255, 0.80)" }}
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
