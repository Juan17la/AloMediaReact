import { useRef } from "react"
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  RotateCcw,
} from "lucide-react"
import { useEditorStore } from "../../store/editorStore"
import { InspectorSliderRow } from "../ui/InspectorSliderRow"
import { DEFAULT_TEXT_STYLE, TEXT_FONT_FAMILIES } from "../../constants/textStyle"
import type { TextStyle } from "../../project/projectTypes"

// Matches the glass card pattern used in other panels
const glassCard = "w-full bg-dark border border-dark-border rounded-lg p-3 mb-3"
const sectionLabel = "text-[11px] font-semibold tracking-[0.06em] uppercase text-muted"
const rowLabel = "text-xs text-muted select-none mb-1 block"

interface TextPropertiesPanelProps {
  clipId: string
}

export function TextPropertiesPanel({ clipId }: TextPropertiesPanelProps) {
  const updateTextClip = useEditorStore(s => s.updateTextClip)
  const updateTextClipsBatch = useEditorStore(s => s.updateTextClipsBatch)
  const pushHistory = useEditorStore(s => s.pushHistory)
  const project = useEditorStore(s => s.project)
  const groupEditGroupId = useEditorStore(s => s.groupEditGroupId)

  const clip = useEditorStore(s => {
    for (const track of s.project.tracks) {
      const c = track.clips.find(c => c.id === clipId)
      if (c?.type === "text") return c
    }
    return null
  })

  // Track whether content was modified since last blur so we only push history once.
  const contentChangedRef = useRef(false)

  if (!clip) return null

  const s = clip.style ?? DEFAULT_TEXT_STYLE

  function getTextOnlyGroupMemberIds(): string[] | null {
    const group = (project.clipGroups ?? []).find(g => g.memberClipIds.includes(clipId))
    if (!group) return null
    if (groupEditGroupId === group.id) return null
    const members: string[] = []
    for (const id of group.memberClipIds) {
      for (const track of project.tracks) {
        const c = track.clips.find(c => c.id === id)
        if (c) {
          if (c.type !== "text") return null
          members.push(id)
          break
        }
      }
    }
    return members.length > 1 ? members : null
  }

  function setStyle(updates: Partial<TextStyle>) {
    const groupMemberIds = getTextOnlyGroupMemberIds()
    if (groupMemberIds) {
      updateTextClipsBatch(groupMemberIds.map(id => ({ clipId: id, style: updates })))
    } else {
      updateTextClip(clipId, { style: updates })
    }
    const wasPlaying = pushHistory("Update text style")
    void wasPlaying
  }

  function handleContentChange(value: string) {
    updateTextClip(clipId, { content: value })
    contentChangedRef.current = true
  }

  function handleContentBlur() {
    if (contentChangedRef.current) {
      pushHistory("Edit text content")
      contentChangedRef.current = false
    }
  }

  const alignBtnBase =
    "flex items-center justify-center w-7 h-7 rounded-md border-0 cursor-pointer transition-[background,color] duration-100"
  const alignBtnActive = "bg-primary/15 text-primary"
  const alignBtnInactive = "bg-transparent text-muted hover:bg-dark-card hover:text-on-surface"

  const toggleBtnBase =
    "flex items-center justify-center w-7 h-7 rounded-md border-0 cursor-pointer transition-[background,color] duration-100 font-[inherit]"
  const toggleBtnActive = "bg-primary/15 text-primary"
  const toggleBtnInactive = "bg-transparent text-muted hover:bg-dark-card hover:text-on-surface"

  return (
    <div>
      {/* Content */}
      <div className={glassCard}>
        <div className="flex items-center mb-2.5">
          <span className={sectionLabel}>Content</span>
        </div>
        <textarea
          value={clip.content}
          onChange={e => handleContentChange(e.target.value)}
          onBlur={handleContentBlur}
          rows={3}
          placeholder="Enter text…"
          className="w-full rounded-md bg-dark border border-dark-border text-on-surface text-sm p-2 resize-none outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-150 font-[inherit] placeholder:text-muted-light"
        />
      </div>

      {/* Typography */}
      <div className={glassCard}>
        <div className="flex items-center mb-2.5">
          <span className={sectionLabel}>Typography</span>
        </div>

        {/* Font family */}
        <div className="mb-2.5">
          <label className={rowLabel}>Font Family</label>
          <select
            value={s.fontFamily}
            onChange={e => setStyle({ fontFamily: e.target.value })}
            className="w-full rounded-md bg-dark border border-dark-border text-on-surface text-xs px-2 h-7 outline-none focus:border-primary/50 cursor-pointer appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(128,128,128,0.6)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            {TEXT_FONT_FAMILIES.map(f => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value, background: "var(--color-surface-container-lowest)" }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font size */}
        <InspectorSliderRow
          label="Font Size"
          value={s.fontSize}
          min={8}
          max={200}
          step={1}
          defaultValue={DEFAULT_TEXT_STYLE.fontSize}
          formatDisplay={v => `${Math.round(v)}px`}
          onChange={v => setStyle({ fontSize: v })}
          onReset={() => setStyle({ fontSize: DEFAULT_TEXT_STYLE.fontSize })}
        />

        {/* Alignment */}
        <div className="mb-2.5">
          <label className={rowLabel}>Alignment</label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map(align => {
              const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight
              return (
                <button
                  key={align}
                  type="button"
                  title={`Align ${align}`}
                  onClick={() => setStyle({ textAlign: align })}
                  className={[alignBtnBase, s.textAlign === align ? alignBtnActive : alignBtnInactive].join(" ")}
                >
                  <Icon size={13} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Bold / Italic */}
        <div className="mb-0.5">
          <label className={rowLabel}>Style</label>
          <div className="flex gap-1">
            <button
              type="button"
              title="Bold"
              onClick={() => setStyle({ bold: !s.bold })}
              className={[toggleBtnBase, s.bold ? toggleBtnActive : toggleBtnInactive].join(" ")}
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              title="Italic"
              onClick={() => setStyle({ italic: !s.italic })}
              className={[toggleBtnBase, s.italic ? toggleBtnActive : toggleBtnInactive].join(" ")}
            >
              <Italic size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className={glassCard}>
        <div className="flex items-center mb-2.5">
          <span className={sectionLabel}>Appearance</span>
        </div>

        {/* Text color */}
        <div className="mb-2.5">
          <label className={rowLabel}>Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={s.color}
              onChange={e => setStyle({ color: e.target.value })}
              className="w-7 h-7 rounded-md border border-dark-border cursor-pointer bg-transparent p-0.5"
            />
            <input
              type="text"
              value={s.color}
              onChange={e => {
                const v = e.target.value.trim()
                if (/^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v)) setStyle({ color: v })
              }}
              className="flex-1 h-7 rounded-md bg-dark border border-dark-border text-on-surface text-xs px-2 font-mono outline-none focus:border-primary/50"
            />
            <button
              type="button"
              title="Reset color to white"
              onClick={() => setStyle({ color: DEFAULT_TEXT_STYLE.color })}
              className="p-1 rounded-sm opacity-50 hover:opacity-100 hover:bg-dark-card cursor-pointer transition-opacity duration-100"
            >
              <RotateCcw size={10} />
            </button>
          </div>
        </div>

        {/* Background color */}
        <div className="mb-2.5">
          <label className={rowLabel}>Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={s.backgroundColor ?? "#000000"}
              onChange={e => setStyle({ backgroundColor: e.target.value })}
              disabled={!s.backgroundColor}
              className="w-7 h-7 rounded-md border border-dark-border cursor-pointer bg-transparent p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setStyle({ backgroundColor: s.backgroundColor ? undefined : "#000000" })}
              className={[
                "flex-1 h-7 rounded-md border text-xs font-medium cursor-pointer transition-[background,border-color,color] duration-100",
                s.backgroundColor
                  ? "bg-primary/15 border-primary/35 text-primary"
                  : "bg-dark border-dark-border text-muted hover:bg-dark-card hover:text-on-surface",
              ].join(" ")}
            >
              {s.backgroundColor ? "Enabled" : "None (transparent)"}
            </button>
          </div>
        </div>

        {/* Opacity */}
        <InspectorSliderRow
          label="Opacity"
          value={s.opacity}
          min={0}
          max={1}
          step={0.01}
          defaultValue={DEFAULT_TEXT_STYLE.opacity}
          formatDisplay={v => `${Math.round(v * 100)}%`}
          onChange={v => setStyle({ opacity: v })}
          onReset={() => setStyle({ opacity: DEFAULT_TEXT_STYLE.opacity })}
        />
      </div>
    </div>
  )
}
