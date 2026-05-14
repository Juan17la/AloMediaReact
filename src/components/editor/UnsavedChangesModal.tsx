interface UnsavedChangesModalProps {
  onLeave: () => void
  onStay: () => void
}

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"

const titleClass =
  "text-lg font-bold tracking-tight text-foreground"

const ghostBtn =
  "rounded-md border border-border bg-primary/10 px-4 py-2 text-sm text-primary transition-all duration-100 hover:bg-primary/20 hover:text-primary"

const primaryBtn =
  "rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-100 hover:bg-primary/90"

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
