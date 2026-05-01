interface UnsavedChangesModalProps {
  onLeave: () => void
  onStay: () => void
}

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20 backdrop-blur-sm"

const titleClass =
  "text-lg font-bold tracking-[-0.02em] text-on-surface"

const ghostBtn =
  "rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm text-on-surface/80 transition-all duration-100 hover:border-outline hover:bg-surface-container-low"

const primaryBtn =
  "rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-100 hover:brightness-[0.96]"

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
        <p className="text-muted-foreground text-sm leading-relaxed">
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
