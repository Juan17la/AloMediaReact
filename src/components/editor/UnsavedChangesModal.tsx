interface UnsavedChangesModalProps {
  onLeave: () => void
  onStay: () => void
}

export function UnsavedChangesModal({ onLeave, onStay }: UnsavedChangesModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        className="modal-panel w-120 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255, 255, 255, 0.92)" }}>Unsaved changes</h2>
        <p className="text-muted text-sm leading-relaxed">
          You have unsaved changes. If you leave now, your changes will be lost.
        </p>
        <div className="flex justify-end gap-2.5" style={{ marginTop: 8 }}>
          <button
            onClick={onLeave}
            className="btn-ghost px-4 py-2 rounded-lg text-sm border border-white/10 bg-white/5"
            style={{ color: "rgba(255, 255, 255, 0.80)" }}
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
