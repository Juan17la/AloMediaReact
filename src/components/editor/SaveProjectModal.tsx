import { useState } from 'react'

interface SaveProjectModalProps {
  initialName: string
  onConfirm: (name: string) => void
  onCancel: () => void
  isSaving: boolean
}

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center modal-glass-card"

const titleClass =
  "text-lg font-bold tracking-[-0.02em] text-white/92"

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40"

const ghostBtn =
  "rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-all duration-100 hover:border-white/[0.18] hover:bg-white/9 disabled:cursor-not-allowed disabled:opacity-35"

const primaryBtn =
  "rounded-lg bg-[var(--color-accent-red)] px-5 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-100 hover:brightness-[0.86] disabled:cursor-not-allowed disabled:opacity-35"

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
        <h2 className={titleClass}>Save project</h2>
        <div className="flex flex-col gap-1.5">
          <label className={sectionLabelClass}>Project name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            className="w-full box-border rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-sm text-accent-white placeholder:text-white/25 transition-all duration-150 focus:border-accent-red/55 focus:ring-2 focus:ring-accent-red/12 focus:outline-none"
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
