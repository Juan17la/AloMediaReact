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
  "rounded-md border border-border bg-primary/10 px-4 py-2 text-sm text-primary transition-all duration-100 hover:bg-primary/20 hover:text-primary"

const primaryBtn =
  "rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-100 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"

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
        <h2 className="text-lg font-bold tracking-tight text-on-surface">Save project</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project name</label>
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
