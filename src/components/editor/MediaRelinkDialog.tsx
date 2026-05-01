import { useRef, useState } from "react"
import { useEditorStore, fileMap } from "../../store/editorStore"
import { generateProxy } from "../../engine/proxyEngine"
import { hashFile } from "../../utils/fileHash"
import { saveFileToCache } from "../../services/fileCacheService"
import type { Media } from "../../project/projectTypes"

interface Props {
  onClose: () => void
}

const overlayClass =
  "fixed inset-0 z-100 flex items-center justify-center bg-[rgba(26,26,31,0.10)] backdrop-blur-sm"

const dialogClass =
  "modal-panel w-110 max-h-[78vh] overflow-hidden rounded-3xl"

const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"

const primaryBtn =
  "flex-1 rounded-lg bg-[var(--color-accent-red)] px-0 py-2 text-xs font-semibold text-accent-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-100 hover:brightness-[0.96] disabled:cursor-not-allowed disabled:opacity-35"

const ghostBtn =
  "rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-xs text-accent-white/80 transition-all duration-100 hover:border-dark-border-light hover:bg-dark-elevated"

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TypeLabel({ type }: { type: Media["type"] }) {
  const typeClass: Record<Media["type"], string> = {
    video: "bg-sky-900/70",
    audio: "bg-emerald-900/70",
    image: "bg-amber-900/70",
    subtitles: "bg-purple-900/70",
  }
  return (
    <span className={`shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-accent-white/85 ${typeClass[type]}`}>
      {type}
    </span>
  )
}

export function MediaRelinkDialog({ onClose }: Props) {
  const project = useEditorStore(s => s.project)
  const missingMediaIds = useEditorStore(s => s.missingMediaIds)
  const setProxyState = useEditorStore(s => s.setProxyState)

  // Snapshot of missing items at dialog open — drives the list throughout the session
  const [initialMissingMedia] = useState(() =>
    project.media.filter(m => missingMediaIds.has(m.id))
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const [matchedInSession, setMatchedInSession] = useState(new Set<string>())
  const [unrecognized, setUnrecognized] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const remainingCount = useEditorStore(s => s.missingMediaIds.size)
  const allResolved = remainingCount === 0

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsProcessing(true)

    const newUnrecognized: string[] = []
    const newMatched = new Set(matchedInSession)
    // Read latest store state so concurrent batches don't stomp each other
    const remaining = new Set(useEditorStore.getState().missingMediaIds)
    const nowResolved = new Set(useEditorStore.getState().idbResolvedMediaIds)

    await Promise.all(
      Array.from(files).map(async file => {
        // Primary: content-based SHA-256 (used by addMedia after the media-loader feature).
        const contentHash = await hashFile(file)
        // Fallback: SHA-256 of the metadata string used by the *original* addMedia before
        // this feature was added ("filename-size-lastModified"). Projects saved with the old
        // code store this hash in media[].hash, so we must try it to avoid "always fails"
        // for those projects. Cross-device re-linking still requires the content hash.
        const metaRaw = `${file.name}-${file.size}-${file.lastModified}`
        const metaBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metaRaw))
        const metadataHash = Array.from(new Uint8Array(metaBuf))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("")

        const match = initialMissingMedia.find(
          m => (m.hash === contentHash || m.hash === metadataHash) && remaining.has(m.id),
        )
        if (match) {
          fileMap.set(match.id, file)
          if (match.type === "video") {
            setProxyState(match.id, { status: "pending", objectUrl: null })
            generateProxy(
              match.id,
              file,
              url => setProxyState(match.id, { status: "ready", objectUrl: url }),
              () => setProxyState(match.id, { status: "error", objectUrl: null }),
            )
          }
          saveFileToCache(match.hash, file).catch(() => {})
          remaining.delete(match.id)
          nowResolved.add(match.id)
          newMatched.add(match.id)
        } else {
          newUnrecognized.push(file.name)
        }
      })
    )

    useEditorStore.setState({ missingMediaIds: remaining, idbResolvedMediaIds: nowResolved })
    setMatchedInSession(newMatched)
    if (newUnrecognized.length > 0) {
      setUnrecognized(prev => [...prev, ...newUnrecognized])
    }
    setIsProcessing(false)
  }

  return (
    <div className={overlayClass}>
      <div className={`flex flex-col ${dialogClass}`}>
        {/* Header */}
        <div className="flex items-baseline gap-2 border-b border-b-dark-border px-5 pt-4 pb-3">
          <span className="flex-1 text-base font-bold tracking-[-0.01em] text-accent-white">
            Missing Media
          </span>
          <span className={sectionLabel}>
            {remainingCount} of {initialMissingMedia.length} unresolved
          </span>
        </div>

        {/* Description */}
        <p className="m-0 border-b border-b-dark-border px-5 py-2 text-xs leading-6 text-muted">
          These files were not found in the local cache. Select the original files to restore them,
          or skip to open the project with missing clips shown as placeholders.
        </p>

        {/* Media list */}
        <div className="flex-1 overflow-y-auto">
          {initialMissingMedia.map(m => {
            const isMatched = matchedInSession.has(m.id)
            return (
              <div
                key={m.id}
                className={`flex items-center gap-2.5 border-b border-b-dark-border px-5 py-1.75 ${isMatched ? "opacity-60" : "opacity-100"}`}
              >
                {/* Status dot */}
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${isMatched ? "bg-emerald-400" : "bg-rose-400"}`} />

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-accent-white">
                    {m.name}
                  </div>
                  <div className="mt-px text-[10px] text-muted">
                    {formatSize(m.size)}
                  </div>
                </div>

                <TypeLabel type={m.type} />

                {isMatched && (
                  <span className="shrink-0 text-[10px] text-emerald-400">Matched</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Unrecognized file warning */}
        {unrecognized.length > 0 && (
          <div className="mx-5 mt-2 rounded-lg border border-[rgba(220,60,60,0.30)] bg-[rgba(127,29,29,0.30)] px-3 py-2 text-[11px] text-rose-400">
            Not part of this project: {unrecognized.slice(0, 3).join(", ")}
            {unrecognized.length > 3 && ` +${unrecognized.length - 3} more`}
          </div>
        )}

        {/* Footer */}
        <div className={`flex items-center gap-2 border-t border-t-dark-border px-5 py-3 ${unrecognized.length > 0 ? "mt-2" : "mt-0"}`}>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing || allResolved}
            className={primaryBtn}
          >
            {isProcessing ? "Matching…" : "Select Files"}
          </button>
          <button
            onClick={onClose}
            className={`${ghostBtn} ${allResolved ? "font-semibold text-accent-white" : "font-normal text-muted"}`}
          >
            {allResolved ? "Continue" : "Skip"}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = "" }}
      />
    </div>
  )
}
