import { useRef } from "react"
import { useEditorStore } from "../../store/editorStore"
import type { Media } from "../../project/projectTypes"

export function MediaLibrary() {
  const addMedia = useEditorStore(s => s.addMedia)
  const media = useEditorStore(s => s.project.media)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      await addMedia(file)
    }
  }

  function formatDuration(item: Media): string {
    if (item.duration === null) return "image"
    const secs = Math.round(item.duration)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div style={{ width: 240, padding: 12, borderRight: "1px solid #ccc", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 600 }}>Media Library</div>

      <button
        onClick={() => inputRef.current?.click()}
        style={{ padding: "6px 12px", cursor: "pointer" }}
      >
        Add Media
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        style={{ display: "none" }}
        onChange={e => handleFiles(e.target.files)}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {media.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => e.dataTransfer.setData("mediaId", item.id)}
            style={{
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "grab",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </div>
            <div style={{ color: "#666", fontSize: 11 }}>
              {item.type} &middot; {formatDuration(item)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
