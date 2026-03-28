import { useEffect, useRef, type ReactNode } from "react";
import { LogOut, User } from "lucide-react";

interface UserMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  /** Slot for additional menu items rendered between Profile and Logout */
  children?: ReactNode;
}

export default function UserMenuModal({ isOpen, onClose, onLogout, children }: UserMenuModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close the modal when the user clicks outside of it
  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 p-1 w-44 z-50"
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(32px) saturate(160%)",
        WebkitBackdropFilter: "blur(32px) saturate(160%)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        borderTop: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: 20,
        boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 8px rgba(0,0,0,0.35), 0 12px 24px rgba(0,0,0,0.25), 0 32px 56px rgba(0,0,0,0.18)",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted hover:text-accent-white hover:bg-glass rounded-md transition-colors cursor-pointer"
      >
        <User className="w-4 h-4" />
        Profile
      </button>

      {children}

      <div className="border-t my-1 border-dark-border/50" />

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted hover:text-red-400 hover:bg-red-400/25 rounded-sm transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}
