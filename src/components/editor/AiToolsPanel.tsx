import { useEffect, useState, useRef } from "react"
import { Wand2, FileText, AlertCircle, CheckCircle2, Loader2, MousePointerClick } from "lucide-react"
import type { Media } from "../../project/projectTypes"
import { fileMap, useEditorStore } from "../../store/editorStore"
import { cleanAudio, transcribeAudio } from "../../api/aiMedia"
import { validateAudioFile, getResultName } from "../../utils/aiMedia"
import { ApiError } from "../../api/errors"

type AiTool = "clean" | "transcribe"
type Status = "idle" | "processing" | "success" | "error"

interface AiToolsPanelProps {
  selectedMedia: Media | null
  initialTool?: AiTool
}

const sectionLabel =
  "text-[9px] font-semibold tracking-[0.06em] uppercase text-muted mb-1"

export function AiToolsPanel({ selectedMedia, initialTool = "clean" }: AiToolsPanelProps) {
  const addMedia = useEditorStore((s) => s.addMedia)

  const [activeTool, setActiveTool] = useState<AiTool>(initialTool)
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resultName, setResultName] = useState<string | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (processingRef.current) return
    setActiveTool(initialTool)
    setStatus("idle")
    setErrorMsg(null)
    setResultName(null)
  }, [initialTool, selectedMedia?.id])

  // ── No media selected ───────────────────────────────────────────────────────
  if (!selectedMedia) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center h-full">
        <MousePointerClick size={22} className="text-muted-light" />
        <p className="text-[11px] text-muted leading-relaxed">
          Click a file in the Library tab<br />to use AI tools on it
        </p>
      </div>
    )
  }

  // ── Unsupported types ────────────────────────────────────────────────────────
  if (selectedMedia.type === "image") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center h-full">
        <AlertCircle size={22} className="text-muted-light" />
        <p className="text-[11px] text-muted">AI tools are not available for images</p>
      </div>
    )
  }

  if (selectedMedia.type === "video") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center h-full">
        <AlertCircle size={22} className="text-muted-light" />
        <p className="text-[11px] text-muted leading-relaxed">
          Audio extraction from video is not yet supported.<br />
          Add the audio track separately to use AI tools.
        </p>
      </div>
    )
  }

  if (selectedMedia.type === "subtitles") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center h-full">
        <AlertCircle size={22} className="text-muted-light" />
        <p className="text-[11px] text-muted leading-relaxed">
          Subtitle files can be imported into the timeline, but AI tools are not available for them.
        </p>
      </div>
    )
  }

  // ── Audio file ───────────────────────────────────────────────────────────────
  const file = fileMap.get(selectedMedia.id)

  async function handleRun() {
    if (processingRef.current || !selectedMedia || !file) return

    const validation = validateAudioFile(file)
    if (!validation.ok) {
      setStatus("error")
      setErrorMsg(validation.error)
      return
    }

    processingRef.current = true
    setStatus("processing")
    setErrorMsg(null)
    setResultName(null)

    try {
      let blob: Blob
      let outputName: string

      if (activeTool === "clean") {
        blob = await cleanAudio(file)
        outputName = getResultName(selectedMedia.name, "cleaned", "wav")
        await addMedia(new File([blob], outputName, { type: "audio/wav" }))
      } else {
        blob = await transcribeAudio(file)
        outputName = getResultName(selectedMedia.name, "transcription", "srt")
        await addMedia(new File([blob], outputName, { type: blob.type || "application/x-subrip" }))
      }

      setResultName(outputName)
      setStatus("success")
    } catch (err) {
      let message = "An unexpected error occurred. Please try again."
      if (err instanceof ApiError) {
        switch (err.status) {
          case 413:
            message = "File exceeds the 50 MB limit."
            break
          case 415:
            message = "Unsupported file format. Accepted: wav, mp3, ogg, flac, m4a."
            break
          case 502:
            message = "Processing service error. Please try again."
            break
          case 503:
            message = "AI service is currently unavailable. Please try again later."
            break
          default:
            message = err.message
        }
      }
      setErrorMsg(message)
      setStatus("error")
    } finally {
      processingRef.current = false
    }
  }

  function handleToolChange(tool: AiTool) {
    if (processingRef.current) return
    setActiveTool(tool)
    setStatus("idle")
    setErrorMsg(null)
    setResultName(null)
  }

  const isProcessing = status === "processing"
  const runLabel = activeTool === "clean" ? "Clean Audio" : "Transcribe"

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content - compact padding */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {/* Selected file */}
        <div>
          <p className={sectionLabel}>Selected File</p>
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-dark-card/50 border border-dark-border rounded-md">
            <span className="text-[11px] text-accent-white truncate">{selectedMedia.name}</span>
          </div>
        </div>

        {/* Tool selector - compact segmented control style */}
        <div>
          <p className={sectionLabel}>Tool</p>
          <div className="flex gap-1 p-1 bg-dark-card/50 border border-dark-border rounded-lg">
            <ToolTab
              active={activeTool === "clean"}
              disabled={isProcessing}
              onClick={() => handleToolChange("clean")}
              icon={<Wand2 size={12} />}
              label="Clean"
            />
            <ToolTab
              active={activeTool === "transcribe"}
              disabled={isProcessing}
              onClick={() => handleToolChange("transcribe")}
              icon={<FileText size={12} />}
              label="Transcribe"
            />
          </div>
        </div>

        {/* Description - compact */}
        <p className="text-[11px] text-muted leading-snug px-0.5">
          {activeTool === "clean"
            ? "Remove background noise and enhance speech clarity."
            : "Generate a subtitle file (.srt) from spoken audio."}
        </p>

        {/* Status Messages - inline compact */}
        {status === "success" && resultName && (
          <div className="flex items-start gap-2 px-2 py-2 bg-green-500/10 border border-green-500/30 rounded-md">
            <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-green-300 font-medium">Success</p>
              <p className="text-[10px] text-green-400/70 break-all">{resultName}</p>
            </div>
          </div>
        )}
        {status === "error" && errorMsg && (
          <div className="flex items-start gap-2 px-2 py-2 bg-red-500/10 border border-red-500/30 rounded-md">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0" />
            <p className="text-[11px] text-red-300 leading-snug flex-1">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Fixed action bar - compact */}
      <div className="shrink-0 p-2.5 border-t border-dark-border/50 bg-dark-card/10">
        <button
          onClick={handleRun}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-[12px] font-semibold bg-accent-red text-accent-white disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all duration-100 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Processing…
            </>
          ) : status === "error" ? (
            <>
              <Wand2 size={14} />
              Retry
            </>
          ) : (
            <>
              <Wand2 size={14} />
              {runLabel}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

interface ToolTabProps {
  active: boolean
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ToolTab({ active, disabled, onClick, icon, label }: ToolTabProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex items-center justify-center gap-1.5 flex-1 h-7 px-2 rounded-md text-[11px] font-medium transition-all duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        active
          ? "bg-accent-red text-accent-white shadow-sm"
          : "text-muted hover:text-accent-white hover:bg-dark-card",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  )
}
