import { useRef, useState } from "react"
import { useEditorStore, fileMap } from "../../store/editorStore"
import { generateProxy } from "../../engine/proxyEngine"
import { hashFile } from "../../utils/fileHash"
import { saveFileToCache } from "../../services/fileCacheService"
import type { Media } from "../../project/projectTypes"

interface Props {
  onClose: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TypeLabel({ type }: { type: Media["type"] }) {
  const colors: Record<Media["type"], string> = {
    video: "#1a3a5c",
    audio: "#1a3d1a",
    image: "#3d2a1a",
  }
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: "1px 4px",
        background: colors[type],
        color: "rgba(255,255,255,0.85)",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--color-dark-surface)",
          border: "1px solid var(--color-dark-border)",
          borderRadius: 8,
          width: 440,
          maxHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-dark-border)",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent-white)", flex: 1 }}>
            Missing Media
          </span>
          <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
            {remainingCount} of {initialMissingMedia.length} unresolved
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            margin: 0,
            padding: "8px 16px",
            fontSize: 11,
            color: "var(--color-muted)",
            borderBottom: "1px solid var(--color-dark-border)",
            lineHeight: 1.5,
          }}
        >
          These files were not found in the local cache. Select the original files to restore them,
          or skip to open the project with missing clips shown as placeholders.
        </p>

        {/* Media list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {initialMissingMedia.map(m => {
            const isMatched = matchedInSession.has(m.id)
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "7px 16px",
                  gap: 10,
                  borderBottom: "1px solid var(--color-dark-border)",
                  opacity: isMatched ? 0.6 : 1,
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: isMatched ? "#4ade80" : "#f87171",
                  }}
                />

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-accent-white)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 1 }}>
                    {formatSize(m.size)}
                  </div>
                </div>

                <TypeLabel type={m.type} />

                {isMatched && (
                  <span style={{ fontSize: 10, color: "#4ade80", flexShrink: 0 }}>Matched</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Unrecognized file warning */}
        {unrecognized.length > 0 && (
          <div
            style={{
              margin: "8px 16px 0",
              padding: "6px 10px",
              background: "rgba(127,29,29,0.3)",
              border: "1px solid #7f1d1d",
              borderRadius: 4,
              fontSize: 11,
              color: "#f87171",
            }}
          >
            Not part of this project: {unrecognized.slice(0, 3).join(", ")}
            {unrecognized.length > 3 && ` +${unrecognized.length - 3} more`}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--color-dark-border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: unrecognized.length > 0 ? 8 : 0,
          }}
        >
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing || allResolved}
            style={{
              flex: 1,
              padding: "7px 0",
              background: "var(--color-accent-red)",
              border: "none",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              cursor: isProcessing || allResolved ? "not-allowed" : "pointer",
              opacity: isProcessing || allResolved ? 0.5 : 1,
              fontFamily: "inherit",
            }}
          >
            {isProcessing ? "Matching…" : "Select Files"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              background: "transparent",
              border: "1px solid var(--color-dark-border)",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: allResolved ? 600 : 400,
              color: allResolved ? "var(--color-accent-white)" : "var(--color-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
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
