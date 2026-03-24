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
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-lg w-[420px] p-6 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-accent-white font-semibold text-base tracking-wide">Save project</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-muted text-xs uppercase tracking-wider">Project name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            className="bg-dark border border-dark-border rounded px-3 py-1.5 text-sm text-accent-white focus:outline-none focus:border-accent-red"
            spellCheck={false}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 rounded text-sm text-muted hover:text-accent-white border border-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving || !name.trim()}
            className="px-5 py-2 rounded text-sm font-semibold bg-accent-red text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
