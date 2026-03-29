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
          ].join(" ")}
          style={{
            background: "rgba(12, 13, 16, 0.95)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.45), 0 16px 32px rgba(0,0,0,0.35)",
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
              className="editor-transition flex items-center gap-2 px-3 py-2 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0"
              style={{
                borderRadius: 6,
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.80)",
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = "rgba(255, 255, 255, 0.08)"; (e.currentTarget).style.color = "rgba(255, 255, 255, 1.0)" }}
              onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.color = "rgba(255, 255, 255, 0.80)" }}
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
