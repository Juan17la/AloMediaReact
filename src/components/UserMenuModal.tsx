import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { LogOut, Shield, User, Info, HelpCircle, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { User as AuthUser } from "../types/userTypes";

interface UserMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user?: AuthUser | null;
  onAdminDashboard?: () => void;
  /** Slot for additional menu items rendered between Profile and Logout */
  children?: ReactNode;
}

export default function UserMenuModal({ isOpen, onClose, onLogout, user, onAdminDashboard, children }: UserMenuModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const firstName = user?.firstName?.trim() ?? "";
  const lastName = user?.lastName?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || t("userMenu.guestUser");
  const userEmail = user?.email?.trim() || t("userMenu.noActiveSession");
  const initial = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "AL"

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
      className="absolute right-0 top-full z-50 flex-col mt-2 w-60 border border-outline-variant bg-surface-container-lowest p-1 shadow-elevated rounded-xl"
      style={{
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      <div className="px-3 py-3 border-b border-outline-variant mb-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-12 items-center justify-center border border-outline-variant bg-surface-container-low text-sm font-bold text-on-surface rounded-md">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { onClose(); navigate("/profile"); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-on-surface hover:bg-surface-container-low rounded-md transition-colors cursor-pointer"
      >
        <User className="w-4 h-4" />
        {t("userMenu.profile")}
      </button>

      {user?.role === "ADMIN" && onAdminDashboard ? (
        <button
          type="button"
          onClick={onAdminDashboard}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-on-surface hover:bg-surface-container-low rounded-md transition-colors cursor-pointer"
        >
          <Shield className="w-4 h-4" />
          {t("nav.adminDashboard")}
        </button>
      ) : null}

      {children}

      <div className="border-t my-1 border-outline-variant" />

      <button
        type="button"
        onClick={() => { onClose(); navigate("/about"); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-on-surface hover:bg-surface-container-low rounded-md transition-colors cursor-pointer"
      >
        <Info className="w-4 h-4" />
        {t("labels.about", "About")}
      </button>
      <button
        type="button"
        onClick={() => { onClose(); navigate("/help"); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-on-surface hover:bg-surface-container-low rounded-md transition-colors cursor-pointer"
      >
        <HelpCircle className="w-4 h-4" />
        {t("labels.help", "Help")}
      </button>
      <button
        type="button"
        onClick={() => { onClose(); navigate("/contact"); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-on-surface hover:bg-surface-container-low rounded-md transition-colors cursor-pointer"
      >
        <Mail className="w-4 h-4" />
        {t("labels.contact", "Contact")}
      </button>

      <div className="border-t my-1 border-outline-variant" />

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:text-error-foreground hover:bg-error-container rounded-md transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        {t("userMenu.logout")}
      </button>
    </div>
  );
}
