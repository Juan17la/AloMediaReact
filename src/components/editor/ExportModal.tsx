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
        <h2 className="text-lg font-bold tracking-tight text-on-surface mb-0">
          {inProgress ? 'Exporting…' : isDone ? 'Export complete' : 'Export video'}
        </h2>

        {/* ── Settings state ── */}
        {!inProgress && !isDone && !isError && (
          <>
            {/* Format */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format</label>
              <div className="flex gap-2">
                {AVAILABLE_FORMATS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-120 ${format === f
                      ? 'bg-primary border-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'bg-surface-container-low border-outline-variant text-muted-foreground hover:text-on-surface hover:border-outline hover:bg-surface-container'
                      }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolution</label>
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
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-outline-variant text-muted-foreground hover:text-on-surface hover:border-outline hover:bg-surface-container'
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frame rate</label>
              <div className="flex gap-2">
                {[24, 30, 60].map(f => (
                  <button
                    key={f}
                    onClick={() => setFps(f)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-120 ${fps === f
                      ? 'bg-primary border-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'bg-surface-container-low border-outline-variant text-muted-foreground hover:text-on-surface hover:border-outline hover:bg-surface-container'
                      }`}
                  >
                    {f} fps
                  </button>
                ))}
              </div>
            </div>

            {/* File name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File name</label>
              <div className="flex items-center gap-2">
                <input
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="editor-input flex-1 px-3 py-2 text-sm text-on-surface"
                  spellCheck={false}
                />
                <span className="text-muted-foreground text-sm shrink-0">.{format}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm border border-border bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="px-5 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
            <p className={`text-sm ${isError ? 'text-destructive' : 'text-foreground'}`}>
              {isError ? (progress?.errorMessage ?? 'An error occurred') : stageLabel}
            </p>

            {/* Progress bar */}
            {!isError && (
              <div className="flex flex-col gap-2">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{pct}%</span>
                  {timeLabel && <span>{timeLabel}</span>}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2.5 mt-2">
              {isDone && (
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  Close
                </button>
              )}
              {(inProgress || isError) && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-md text-sm border border-border bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all"
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
