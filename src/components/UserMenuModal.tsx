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
      className="absolute right-0 top-full mt-2 p-1 w-44 rounded-md bg-dark-elevated border border-dark-border shadow-lg shadow-black/30 z-50"
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
