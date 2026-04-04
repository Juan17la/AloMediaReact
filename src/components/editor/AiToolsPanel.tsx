import { useState, useRef } from "react"
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
}

const sectionLabel =
  "text-[10px] font-semibold tracking-[0.1em] uppercase text-white/40 mb-1.5"

export function AiToolsPanel({ selectedMedia }: AiToolsPanelProps) {
  const addMedia = useEditorStore((s) => s.addMedia)

  const [activeTool, setActiveTool] = useState<AiTool>("clean")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resultName, setResultName] = useState<string | null>(null)
  const processingRef = useRef(false)

  // ── No media selected ───────────────────────────────────────────────────────
  if (!selectedMedia) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center h-full">
        <MousePointerClick size={22} className="text-white/25" />
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
        <AlertCircle size={22} className="text-white/25" />
        <p className="text-[11px] text-muted">AI tools are not available for images</p>
      </div>
    )
  }

  if (selectedMedia.type === "video") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center h-full">
        <AlertCircle size={22} className="text-white/25" />
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
        <AlertCircle size={22} className="text-white/25" />
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
    <div className="flex flex-col gap-3.5 p-3">
      {/* Selected file */}
      <div>
        <p className={sectionLabel}>Selected File</p>
        <div className="flex items-center gap-2 px-2.5 py-2 bg-white/4 border border-white/8 rounded-lg">
          <span className="text-[11px] text-accent-white truncate">{selectedMedia.name}</span>
        </div>
      </div>

      {/* Tool selector */}
      <div>
        <p className={sectionLabel}>Tool</p>
        <div className="flex gap-1">
          <ToolButton
            active={activeTool === "clean"}
            disabled={isProcessing}
            onClick={() => handleToolChange("clean")}
            icon={<Wand2 size={12} />}
            label="Clean Audio"
          />
          <ToolButton
            active={activeTool === "transcribe"}
            disabled={isProcessing}
            onClick={() => handleToolChange("transcribe")}
            icon={<FileText size={12} />}
            label="Transcribe"
          />
        </div>
      </div>

      {/* Description */}
      <div className="px-2.5 py-2 bg-white/3 border border-white/6 rounded-lg">
        <p className="text-[11px] text-muted leading-relaxed">
          {activeTool === "clean"
            ? "Removes background noise and enhances speech clarity. The result is added to your library."
            : "Generates a timed subtitle file (.srt) from spoken audio. The result is added to your library."}
        </p>
      </div>

      {/* Success */}
      {status === "success" && resultName && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-[#0f2b14] border border-[#1d5c28] rounded-lg">
          <CheckCircle2 size={13} className="text-green-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] text-green-300 font-medium">Done</p>
            <p className="text-[10px] text-green-400/70 mt-0.5 break-all">{resultName}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && errorMsg && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-[#2d1414] border border-[#6a2d2d] rounded-lg">
          <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-300 leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isProcessing}
        className="flex items-center justify-center gap-2 h-8 rounded-lg text-[11px] font-semibold bg-accent-red text-white disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all duration-100 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Processing…
          </>
        ) : status === "error" ? (
          <>
            <Wand2 size={13} />
            Retry
          </>
        ) : (
          <>
            <Wand2 size={13} />
            {runLabel}
          </>
        )}
      </button>
    </div>
  )
}

interface ToolButtonProps {
  active: boolean
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ToolButton({ active, disabled, onClick, icon, label }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex items-center gap-1.5 flex-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition-all duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        active
          ? "bg-accent-red/15 border-accent-red/40 text-accent-white"
          : "bg-white/4 border-white/10 text-muted hover:bg-white/7 hover:text-white/70",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  )
}
