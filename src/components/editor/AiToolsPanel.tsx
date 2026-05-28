import { useEffect, useState, useRef } from "react"
import { Wand2, AlertCircle, CheckCircle2, Loader2, MousePointerClick } from "lucide-react"
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
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Media info */}
        <div className="text-center">
          <p className="text-xs text-accent-white font-medium truncate">{selectedMedia.name}</p>
          <p className="text-[10px] text-muted mt-0.5">{selectedMedia.format?.toUpperCase() || selectedMedia.type}</p>
        </div>

        {/* Tool selector - simple two buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleToolChange("clean")}
            disabled={isProcessing}
            className={[
              "flex-1 h-9 text-xs font-medium rounded-lg border transition-all duration-100",
              activeTool === "clean"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-dark-card text-muted border-dark-border hover:bg-dark-elevated",
            ].join(" ")}
          >
            Clean Audio
          </button>
          <button
            onClick={() => handleToolChange("transcribe")}
            disabled={isProcessing}
            className={[
              "flex-1 h-9 text-xs font-medium rounded-lg border transition-all duration-100",
              activeTool === "transcribe"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-dark-card text-muted border-dark-border hover:bg-dark-elevated",
            ].join(" ")}
          >
            Transcribe
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-muted text-center leading-relaxed">
          {activeTool === "clean"
            ? "Remove background noise and enhance speech clarity."
            : "Generate a subtitle file (.srt) from spoken audio."}
        </p>

        {/* Status Messages */}
        {status === "success" && resultName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-lg">
            <CheckCircle2 size={16} className="text-success shrink-0" />
            <p className="text-xs text-success truncate">{resultName}</p>
          </div>
        )}
        {status === "error" && errorMsg && (
          <div className="flex items-center gap-2 px-3 py-2 bg-error/10 border border-error/30 rounded-lg">
            <AlertCircle size={16} className="text-error shrink-0" />
            <p className="text-xs text-error leading-snug">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Fixed action bar */}
      <div className="shrink-0 p-4 pt-2 border-t border-dark-border/50 bg-dark-card/10">
        <button
          onClick={handleRun}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all duration-100 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing…
            </>
          ) : status === "error" ? (
            <>
              <Wand2 size={16} />
              Retry
            </>
          ) : (
            <>
              <Wand2 size={16} />
              {runLabel}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

