import { useState } from 'react'

interface SaveProjectModalProps {
  initialName: string
  onConfirm: (name: string) => void
  onCancel: () => void
  isSaving: boolean
}

export function SaveProjectModal({ initialName, onConfirm, onCancel, isSaving }: SaveProjectModalProps) {
  const [name, setName] = useState(initialName)

  function handleConfirm() {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="modal-panel w-120 py-7 px-12 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-accent-white font-semibold text-base tracking-wide">Save project</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-muted text-[11px] uppercase tracking-widest">Project name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            className="editor-input w-full px-3 py-2 text-sm text-accent-white"
            spellCheck={false}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="btn-ghost px-4 py-2 rounded-lg text-sm text-muted border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving || !name.trim()}
            className="btn-accent px-5 py-2 rounded-lg text-sm font-semibold bg-accent-red text-white"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
