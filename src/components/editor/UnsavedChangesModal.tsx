interface UnsavedChangesModalProps {
  onLeave: () => void
  onStay: () => void
}

export function UnsavedChangesModal({ onLeave, onStay }: UnsavedChangesModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-lg w-[420px] p-6 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-accent-white font-semibold text-base tracking-wide">Unsaved changes</h2>
        <p className="text-muted text-sm leading-relaxed">
          You have unsaved changes. If you leave now, your changes will be lost.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onLeave}
            className="px-4 py-2 rounded text-sm text-muted hover:text-accent-white border border-dark-border transition-colors"
          >
            Leave anyway
          </button>
          <button
            onClick={onStay}
            className="px-5 py-2 rounded text-sm font-semibold bg-accent-red text-white hover:opacity-90 transition-opacity"
          >
            Stay &amp; save
          </button>
        </div>
      </div>
    </div>
  )
}
