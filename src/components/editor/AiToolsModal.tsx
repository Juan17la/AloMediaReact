import { useEffect } from "react"
import { X } from "lucide-react"
import type { Media } from "../../project/projectTypes"
import { AiToolsPanel } from "./AiToolsPanel"

interface AiToolsModalProps {
  media: Media
  initialTool?: "clean" | "transcribe"
  onClose: () => void
}

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/5 backdrop-blur-sm px-3"

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
        className="modal-panel w-110 max-w-full max-h-[80vh] overflow-y-auto flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white/95">AI Audio Tools</h2>
            <p className="text-[11px] text-white/55 mt-1">
              Choose an action for {media.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI tools"
            className="h-7 w-7 rounded-md border border-white/10 bg-white/5 text-white/75 flex items-center justify-center transition-colors duration-100 hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <AiToolsPanel selectedMedia={media} initialTool={initialTool} />
      </div>
    </div>
  )
}
