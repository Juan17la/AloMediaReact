interface UnsavedChangesModalProps {
  onLeave: () => void
  onStay: () => void
}

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"

const titleClass =
  "text-lg font-bold tracking-[-0.02em] text-white/92"

const ghostBtn =
  "rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-all duration-100 hover:border-white/[0.18] hover:bg-white/9"

const primaryBtn =
  "rounded-lg bg-[var(--color-accent-red)] px-5 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-100 hover:brightness-[0.86]"

export function UnsavedChangesModal({ onLeave, onStay }: UnsavedChangesModalProps) {
  return (
    <div
      className={overlayClass}
    >
      <div
        className="modal-panel w-120 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 className={titleClass}>Unsaved changes</h2>
        <p className="text-muted text-sm leading-relaxed">
          You have unsaved changes. If you leave now, your changes will be lost.
        </p>
        <div className="mt-2 flex justify-end gap-2.5">
          <button
            onClick={onLeave}
            className={ghostBtn}
          >
            Leave anyway
          </button>
          <button
            onClick={onStay}
            className={primaryBtn}
          >
            Stay &amp; save
          </button>
        </div>
      </div>
    </div>
  )
}
