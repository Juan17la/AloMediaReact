import { useEffect } from "react"
import { X, Sparkles } from "lucide-react"
import type { Media } from "../../project/projectTypes"
import { AiToolsPanel } from "./AiToolsPanel"

interface AiToolsModalProps {
  media: Media
  initialTool?: "clean" | "transcribe"
  onClose: () => void
}

const overlayClass =
  "absolute inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-8"

export function AiToolsModal({ media, initialTool, onClose }: AiToolsModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [onClose])

  return (
    <div className={overlayClass} onClick={onClose}>
      <div
        className="modal-panel w-full max-w-80 flex flex-col overflow-hidden shadow-2xl rounded-lg"
        style={{ height: "auto", maxHeight: "calc(100% - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-dark-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-semibold text-on-surface">
              AI Audio Tools
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI tools"
            className="h-6 w-6 rounded border border-dark-border bg-dark-card text-on-surface/70 flex items-center justify-center transition-all duration-100 hover:bg-dark-elevated hover:text-on-surface shrink-0"
          >
            <X size={12} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AiToolsPanel selectedMedia={media} initialTool={initialTool} />
        </div>
      </div>
    </div>
  )
}
