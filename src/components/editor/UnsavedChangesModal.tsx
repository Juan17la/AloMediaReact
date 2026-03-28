interface UnsavedChangesModalProps {
  onLeave: () => void
  onStay: () => void
}

export function UnsavedChangesModal({ onLeave, onStay }: UnsavedChangesModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="modal-panel w-120 py-7 px-12 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-accent-white font-semibold text-base tracking-wide">Unsaved changes</h2>
        <p className="text-muted text-sm leading-relaxed">
          You have unsaved changes. If you leave now, your changes will be lost.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onLeave}
            className="btn-ghost px-4 py-2 rounded-lg text-sm text-muted border border-white/10"
          >
            Leave anyway
          </button>
          <button
            onClick={onStay}
            className="btn-accent px-5 py-2 rounded-lg text-sm font-semibold bg-accent-red text-white"
          >
            Stay &amp; save
          </button>
        </div>
      </div>
    </div>
  )
}
