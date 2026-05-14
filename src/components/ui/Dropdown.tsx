import type React from "react"
import { useEffect, useRef, useState } from "react"

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  /** Which side of the trigger the menu aligns to (default left) */
  align?: "left" | "right"
}

/**
 * Controlled dropdown menu with outside-click close and enter animation.
 * The trigger element receives a wrapper div that toggles the menu.
 * Menu opens upward (above the trigger) to suit the timeline toolbar row.
 */
export function Dropdown({ trigger, items, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  const alignCls = align === "right" ? "right-0" : "left-0"

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger wrapper — clicking toggles open/close */}
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>

      {open && (
        <div
          className={[
            "absolute bottom-full mb-1",
            alignCls,
            "flex flex-col overflow-hidden",
            "z-30 min-w-40 dropdown-enter",
            "bg-popover border border-border rounded-lg shadow-md p-1.5",
          ].join(" ")}
          style={{
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className="editor-transition flex items-center gap-2 px-3 py-2 text-left text-sm text-popover-foreground rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full hover:bg-accent hover:text-accent-foreground [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
