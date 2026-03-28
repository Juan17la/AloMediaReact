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
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        className="modal-panel w-120 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255, 255, 255, 0.92)" }}>Save project</h2>
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255, 255, 255, 0.40)" }}>Project name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            className="editor-input w-full px-3 py-2 text-sm text-accent-white"
            spellCheck={false}
          />
        </div>
        <div className="flex justify-end gap-2.5" style={{ marginTop: 8 }}>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="btn-ghost px-4 py-2 rounded-lg text-sm border border-white/10 bg-white/5"
            style={{ color: "rgba(255, 255, 255, 0.80)" }}
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
