import { useState } from 'react'

interface SaveProjectModalProps {
  initialName: string
  onConfirm: (name: string) => void
  onCancel: () => void
  isSaving: boolean
}

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center modal-glass-card"

const ghostBtn =
  "rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-sm text-on-surface/80 transition-all duration-100 hover:border-outline hover:bg-surface-container transition-all"

const primaryBtn =
  "rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-100 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-35"

export function SaveProjectModal({ initialName, onConfirm, onCancel, isSaving }: SaveProjectModalProps) {
  const [name, setName] = useState(initialName)

  function handleConfirm() {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div
      className={overlayClass}
    >
      <div
        className="modal-panel w-120 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-on-surface)" }}>Save project</h2>
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted-foreground)" }}>Project name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            className="editor-input w-full px-3 py-2 text-sm text-on-surface"
            spellCheck={false}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className={ghostBtn}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving || !name.trim()}
            className={primaryBtn}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
